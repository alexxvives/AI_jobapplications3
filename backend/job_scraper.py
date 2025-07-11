import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import re
import time
import threading
from datetime import datetime

from models import Job
from database import SessionLocal
from schemas import JobResult

class JobScraper:
    def __init__(self):
        # Companies to scrape from each platform
        self.ASHBY_COMPANIES = [
            "openai", "ramp", "linear", "runway", "clever", "vanta", "posthog", "replit", "hex", "carta",
            "mercury", "tome", "arc", "tandem", "twelve", "tango", "census", "sardine", "kikoff", "eightsleep",
            "notion", "scaleai", "loom", "zapier", "asana", "airbyte", "dbt", "modernhealth", "openstore", "levels",
            "angelist", "substack", "discord", "brex", "benchling", "gem", "whatnot", "instabase", "airbnb",
            "coinbase", "databricks", "dropbox", "github", "stripe", "gofundme"
        ]
        
        self.GREENHOUSE_COMPANIES = [
            "gofundme", "stripe", "airbnb", "coinbase", "dropbox", "github", "databricks", 
            "strava", "xai", "newsbreak"
        ]
        
        self.LEVER_COMPANIES = ["haus", "voleon", "valence", "attentive", "tala"]
        
        self.CACHE_TTL = 300  # 5 minutes
        
    def search_jobs_db(self, db: Session, title: str, location: str = "", limit: int = 50) -> List[JobResult]:
        """Search for jobs in the database (cached results)"""
        try:
            query = db.query(Job)
            
            if title:
                # Search in both title and description
                query = query.filter(
                    (Job.title.ilike(f"%{title}%")) | 
                    (Job.description.ilike(f"%{title}%"))
                )
            
            if location:
                query = query.filter(Job.location.ilike(f"%{location}%"))
            
            jobs = query.order_by(Job.fetched_at.desc()).limit(limit).all()
            
            return [
                JobResult(
                    id=job.id,
                    title=job.title,
                    company=job.company,
                    location=job.location or "",
                    description=job.description or "",
                    link=job.link,
                    source=job.source or "",
                    job_type=job.job_type,
                    salary_range=job.salary_range,
                    remote_option=job.remote_option or False
                )
                for job in jobs
            ]
        except Exception as e:
            print(f"[Search] Database error: {e}")
            return []
    
    def get_job_stats(self, db: Session) -> Dict[str, int]:
        """Get job statistics by source"""
        try:
            known_sources = ['Ashby', 'Greenhouse', 'Lever', 'LinkedIn', 'Indeed', 'Glassdoor', 'ZipRecruiter', 'Dice', 'SimplyHired']
            stats = {source: 0 for source in known_sources}
            
            # Get actual counts from database
            db_sources = db.query(Job.source).distinct().all()
            for source_tuple in db_sources:
                source = source_tuple[0]
                if source and source in stats:
                    count = db.query(Job).filter(Job.source == source).count()
                    stats[source] = count
            
            return stats
        except Exception as e:
            print(f"[Stats] Error: {e}")
            return {}
    
    def fetch_all_jobs(self) -> Dict[str, Any]:
        """Fetch jobs from all sources and update database"""
        all_jobs = []
        
        # Define all sources and their fetch functions
        sources = [
            ("Ashby", self.ASHBY_COMPANIES, self.fetch_ashby_jobs),
            ("Greenhouse", self.GREENHOUSE_COMPANIES, lambda c: self.fetch_greenhouse_jobs(c, "")),
            ("Lever", self.LEVER_COMPANIES, lambda c: self.fetch_lever_jobs(c, "")),
        ]
        
        for source_name, companies, fetch_fn in sources:
            print(f"[Fetcher] Starting {source_name} job collection...")
            source_total = 0
            
            with ThreadPoolExecutor(max_workers=8) as executor:
                futures = {executor.submit(fetch_fn, company): company for company in companies}
                
                for future in as_completed(futures):
                    try:
                        jobs = future.result()
                        source_total += len(jobs)
                        
                        for job in jobs:
                            job["source"] = source_name
                            all_jobs.append(job)
                    except Exception as e:
                        company = futures[future]
                        print(f"[Fetcher] Error fetching {source_name} jobs for {company}: {e}")
            
            print(f"[Fetcher] {source_name}: {source_total} jobs found")
        
        # Update database
        total_upserted = self._upsert_jobs_to_db(all_jobs)
        
        return {
            "total_jobs": total_upserted,
            "sources": {source[0]: len([j for j in all_jobs if j.get("source") == source[0]]) for source in sources}
        }
    
    def _upsert_jobs_to_db(self, jobs: List[Dict[str, Any]]) -> int:
        """Upsert jobs into database"""
        session = SessionLocal()
        upserted_count = 0
        
        try:
            for job_dict in jobs:
                if not job_dict.get("link"):
                    continue
                
                try:
                    # Try to find existing job
                    existing_job = session.query(Job).filter_by(link=job_dict["link"]).first()
                    
                    if existing_job:
                        # Update existing job
                        for key, value in job_dict.items():
                            if hasattr(existing_job, key):
                                setattr(existing_job, key, value)
                        existing_job.updated_at = datetime.utcnow()
                    else:
                        # Create new job
                        new_job = Job(**job_dict)
                        session.add(new_job)
                    
                    upserted_count += 1
                    
                except Exception as e:
                    if "UNIQUE constraint failed" in str(e) or "IntegrityError" in str(e):
                        session.rollback()
                        continue
                    else:
                        raise
            
            session.commit()
            
        except Exception as e:
            session.rollback()
            print(f"[DB] Error upserting jobs: {e}")
        finally:
            session.close()
        
        return upserted_count
    
    def fetch_ashby_jobs(self, company: str) -> List[Dict[str, Any]]:
        """Fetch jobs from Ashby GraphQL API"""
        graphql_url = "https://jobs.ashbyhq.com/api/non-user-graphql"
        
        query = """
        query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
          jobBoard: jobBoardWithTeams(
            organizationHostedJobsPageName: $organizationHostedJobsPageName
          ) {
            teams { id name parentTeamId __typename }
            jobPostings {
              id title teamId locationId locationName workplaceType employmentType 
              secondaryLocations { locationId locationName __typename } 
              compensationTierSummary __typename 
            }
            __typename
          }
        }
        """
        
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; JobBot/1.0)"
        }
        
        payload = {
            "operationName": "ApiJobBoardWithTeams",
            "query": query,
            "variables": {"organizationHostedJobsPageName": company}
        }
        
        try:
            response = requests.post(graphql_url, headers=headers, json=payload, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            job_board = data.get("data", {}).get("jobBoard")
            
            if not job_board:
                return []
            
            jobs = job_board.get("jobPostings", [])
            teams = {team["id"]: team["name"] for team in job_board.get("teams", [])}
            
            # Enhance jobs with team names and descriptions
            def fetch_ashby_desc(job):
                job_id = job.get("id", "")
                description = ""
                
                try:
                    desc_payload = {
                        "operationName": "ApiJobPosting",
                        "variables": {
                            "jobPostingId": job_id,
                            "organizationHostedJobsPageName": company
                        },
                        "query": """query ApiJobPosting($jobPostingId: String!, $organizationHostedJobsPageName: String!) { 
                            jobPosting(jobPostingId: $jobPostingId, organizationHostedJobsPageName: $organizationHostedJobsPageName) { 
                                id title descriptionHtml 
                            } 
                        }"""
                    }
                    
                    resp = requests.post(graphql_url, headers=headers, json=desc_payload, timeout=15)
                    if resp.status_code == 200:
                        desc_data = resp.json()
                        html = desc_data.get("data", {}).get("jobPosting", {}).get("descriptionHtml", "")
                        
                        if html:
                            soup = BeautifulSoup(html, "html.parser")
                            lines = []
                            for tag in soup.find_all(["p", "li", "h1", "h2", "h3", "h4", "h5", "h6"]):
                                text = tag.get_text(strip=True)
                                if text:
                                    lines.append(text)
                            description = "\\n".join(lines[:3])  # First 3 lines
                
                except Exception:
                    pass
                
                job["description"] = description
                job["teamName"] = teams.get(job.get("teamId"), "")
                return job
            
            # Fetch descriptions in parallel
            with ThreadPoolExecutor(max_workers=8) as executor:
                jobs = list(executor.map(fetch_ashby_desc, jobs))
            
            # Convert to standard format
            job_dicts = []
            for job in jobs:
                remote_option = job.get("workplaceType", "").lower() in ["remote", "hybrid"]
                
                job_dicts.append({
                    "title": job.get("title", ""),
                    "company": company.title(),
                    "location": job.get("locationName", ""),
                    "description": job.get("description", ""),
                    "link": f"https://jobs.ashbyhq.com/{company}/{job.get('id', '')}",
                    "job_type": job.get("employmentType", "").lower(),
                    "remote_option": remote_option,
                })
            
            return job_dicts
            
        except Exception as e:
            print(f"[Ashby] Error fetching jobs for {company}: {e}")
            return []
    
    def fetch_greenhouse_jobs(self, company: str, title: str = "") -> List[Dict[str, Any]]:
        """Fetch jobs from Greenhouse"""
        jobs = []
        headers = {"User-Agent": "Mozilla/5.0 (compatible; JobBot/1.0)"}
        url = f"https://boards.greenhouse.io/{company}"
        
        try:
            resp = requests.get(url, headers=headers, timeout=30)
            if resp.status_code != 200:
                return []
            
            soup = BeautifulSoup(resp.text, 'html.parser')
            job_rows = soup.select('tr.job-post')
            
            if not job_rows:
                print(f"[Greenhouse] No job rows found for {company}")
                return []
            
            for job_row in job_rows:
                link_elem = job_row.select_one('a[href*="/jobs/"]')
                if not link_elem:
                    continue
                
                job_link = link_elem.get('href', '')
                if not job_link:
                    continue
                
                if not job_link.startswith('http'):
                    if job_link.startswith('/'):
                        job_link = f"https://boards.greenhouse.io{job_link}"
                    else:
                        job_link = f"https://boards.greenhouse.io/{company}/{job_link}"
                
                # Extract job ID
                match = re.search(r'/jobs/(\\d+)', job_link)
                job_id = match.group(1) if match else None
                
                # Get job title
                title_elem = link_elem.select_one('p.body.body--medium')
                job_title = title_elem.get_text(strip=True) if title_elem else ''
                
                if not job_title or len(job_title) < 3:
                    continue
                
                # Get location
                location_elem = link_elem.select_one('p.body.body__secondary.body--metadata')
                location = location_elem.get_text(strip=True) if location_elem else ''
                
                # Get description (try API first, then scraping)
                description = ""
                if job_id:
                    try:
                        api_url = f"https://boards.greenhouse.io/api/v1/boards/{company}/jobs/{job_id}"
                        api_resp = requests.get(api_url, headers=headers, timeout=10)
                        if api_resp.status_code == 200:
                            data = api_resp.json()
                            html = data.get('content', '')
                            if html:
                                soup_desc = BeautifulSoup(html, "html.parser")
                                lines = []
                                for tag in soup_desc.find_all(["p", "li", "h1", "h2", "h3", "h4", "h5", "h6"]):
                                    text = tag.get_text(strip=True)
                                    if text:
                                        lines.append(text)
                                if lines:
                                    description = "\\n".join(lines[:3])
                    except Exception:
                        pass
                
                remote_option = "remote" in location.lower() or "anywhere" in location.lower()
                
                jobs.append({
                    "title": job_title,
                    "company": company.title(),
                    "location": location,
                    "description": description,
                    "link": job_link,
                    "remote_option": remote_option,
                })
            
        except Exception as e:
            print(f"[Greenhouse] Error fetching jobs for {company}: {e}")
        
        return jobs
    
    def fetch_lever_jobs(self, company: str, title: str = "") -> List[Dict[str, Any]]:
        """Fetch jobs from Lever"""
        jobs = []
        headers = {"User-Agent": "Mozilla/5.0 (compatible; JobBot/1.0)"}
        
        # Try API first
        api_url = f"https://api.lever.co/v0/postings/{company}?mode=json"
        
        try:
            resp = requests.get(api_url, headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                
                for job in data:
                    job_title = job.get('text', '')
                    job_link = job.get('hostedUrl', '')
                    location = ', '.join(job.get('categories', {}).get('location', '').split(','))
                    
                    # Filter by title if provided
                    if title and title.lower() not in job_title.lower():
                        continue
                    
                    # Get description
                    description = ""
                    try:
                        if job_link:
                            detail_resp = requests.get(job_link, headers=headers, timeout=10)
                            if detail_resp.status_code == 200:
                                detail_soup = BeautifulSoup(detail_resp.text, 'html.parser')
                                desc_elem = detail_soup.select_one('div[data-qa="job-description"]')
                                if desc_elem:
                                    blocks = [b.get_text(strip=True) for b in desc_elem.find_all(['div', 'p']) if b.get_text(strip=True)]
                                    description = '\\n'.join(blocks[:3]) if blocks else desc_elem.get_text(strip=True)
                    except Exception:
                        pass
                    
                    remote_option = "remote" in location.lower()
                    
                    jobs.append({
                        "title": job_title,
                        "company": company.title(),
                        "location": location,
                        "description": description,
                        "link": job_link,
                        "remote_option": remote_option,
                    })
                
                return jobs
        
        except Exception as e:
            print(f"[Lever] API error for {company}: {e}")
        
        # Fallback to web scraping
        try:
            url = f"https://jobs.lever.co/{company}"
            resp = requests.get(url, headers=headers, timeout=30)
            
            if resp.status_code != 200:
                return []
            
            soup = BeautifulSoup(resp.text, 'html.parser')
            job_elements = [elem for elem in soup.find_all('a', href=True) 
                          if f'/{company}/' in elem['href'] and len(elem['href'].split('/')) == 4]
            
            for job_elem in job_elements:
                job_title = job_elem.get_text(strip=True)
                job_link = job_elem.get('href', '')
                
                if job_link and not job_link.startswith('http'):
                    job_link = f"https://jobs.lever.co{job_link}"
                
                if not job_title or len(job_title) < 3:
                    continue
                
                if title and title.lower() not in job_title.lower():
                    continue
                
                jobs.append({
                    "title": job_title,
                    "company": company.title(),
                    "location": "",
                    "description": "",
                    "link": job_link,
                    "remote_option": False,
                })
        
        except Exception as e:
            print(f"[Lever] Scraping error for {company}: {e}")
        
        return jobs