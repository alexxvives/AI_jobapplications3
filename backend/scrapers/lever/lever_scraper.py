#!/usr/bin/env python3
"""
Lever Platform Scraper
Scrapes jobs from companies using Lever ATS platform
Always maintains both jobs and companies tables in sync
"""

import sqlite3
import requests
import json
import time
from datetime import datetime
from typing import List, Dict, Tuple
from db_config import get_db_path, get_tracker_path

class LeverScraper:
    def __init__(self):
        self.db_path = get_db_path()
        self.tracker_path = get_tracker_path()
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def upsert_company(self, company_name: str, job_link: str = None, job_count: int = 0):
        """Insert or update company in companies table"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Check if company exists
            cursor.execute("SELECT id, job_count FROM companies WHERE name = ?", (company_name,))
            existing = cursor.fetchone()
            
            if existing:
                # Update existing company
                company_id, current_count = existing
                cursor.execute("""
                    UPDATE companies 
                    SET job_count = ?, url = COALESCE(?, url), last_scraped = ?
                    WHERE id = ?
                """, (job_count, job_link, datetime.now(), company_id))
                print(f"    🔄 Updated {company_name}: {current_count} → {job_count} jobs")
            else:
                # Insert new company
                cursor.execute("""
                    INSERT INTO companies (name, url, job_count, last_scraped, created_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (company_name, job_link, job_count, datetime.now(), datetime.now()))
                print(f"    ✅ Added {company_name}: {job_count} jobs")
            
            conn.commit()
            
        except Exception as e:
            print(f"    ❌ Error upserting company {company_name}: {e}")
        finally:
            conn.close()
    
    def save_jobs_and_update_company(self, jobs: List[Dict], company_name: str, job_link: str = None):
        """Save jobs to jobs table AND update companies table"""
        if not jobs:
            # Even if no jobs, still update the company record
            self.upsert_company(company_name, job_link, 0)
            return 0
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        saved_jobs = 0
        duplicate_jobs = 0
        
        try:
            for job in jobs:
                # Check if job already exists
                cursor.execute("SELECT id FROM jobs WHERE link = ?", (job['link'],))
                if cursor.fetchone():
                    duplicate_jobs += 1
                    continue
                
                # Insert new job
                cursor.execute("""
                    INSERT INTO jobs (
                        title, company, location, description, link, platform,
                        job_type, work_type, experience_level, salary_range,
                        remote_option, fetched_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    job['title'], job['company'], job['location'], job['description'],
                    job['link'], job['platform'], job['job_type'], job['work_type'],
                    job['experience_level'], job['salary_range'], job['remote_option'],
                    job['fetched_at'], job['updated_at']
                ))
                saved_jobs += 1
            
            conn.commit()
            
            # Now update the companies table with the correct job count
            self.upsert_company(company_name, job_link, saved_jobs + duplicate_jobs)
            
            if duplicate_jobs > 0:
                print(f"    💾 Jobs: {saved_jobs} new, {duplicate_jobs} duplicates")
            else:
                print(f"    💾 Jobs: {saved_jobs} new")
                
        except Exception as e:
            print(f"    ❌ Error saving jobs: {e}")
        finally:
            conn.close()
        
        return saved_jobs
    
    def scrape_lever_company(self, company_entry: Dict) -> Tuple[int, int]:
        """Scrape a single company and update BOTH tables"""
        company_name = company_entry.get('company')
        job_link = company_entry.get('job_link')
        
        if not company_name or not job_link:
            return 0, 0
        
        print(f"  🔄 Scraping {company_name}...")
        
        try:
            if 'api.lever.co' in job_link:
                response = self.session.get(job_link, timeout=10)
                
                if response.status_code == 200:
                    jobs_data = response.json()
                    if isinstance(jobs_data, list):
                        jobs = self.process_lever_jobs(jobs_data, company_name)
                        saved_jobs = self.save_jobs_and_update_company(jobs, company_name, job_link)
                        return len(jobs), saved_jobs
                    else:
                        print(f"    ❌ Invalid JSON format")
                        self.upsert_company(company_name, job_link, 0)
                        return 0, 0
                else:
                    print(f"    ❌ API error ({response.status_code})")
                    self.upsert_company(company_name, job_link, 0)
                    return 0, 0
            else:
                # HTML scraping would go here
                print(f"    ⚠️  HTML scraping not implemented yet")
                self.upsert_company(company_name, job_link, 0)
                return 0, 0
                
        except Exception as e:
            print(f"    ❌ Scraping failed: {e}")
            self.upsert_company(company_name, job_link, 0)
            return 0, 0
    
    def process_lever_jobs(self, jobs_data: List[Dict], company_name: str) -> List[Dict]:
        """Process Lever API jobs data"""
        jobs = []
        
        for job_data in jobs_data:
            try:
                job = {
                    'title': job_data.get('text', '').strip(),
                    'company': company_name,
                    'location': self.extract_location(job_data),
                    'description': job_data.get('description', '').strip(),
                    'link': job_data.get('hostedUrl', '').strip(),
                    'platform': 'lever',
                    'job_type': self.extract_job_type(job_data),
                    'work_type': self.extract_work_type(job_data),
                    'experience_level': self.extract_experience_level(job_data),
                    'salary_range': '',
                    'remote_option': self.extract_remote_option(job_data),
                    'fetched_at': datetime.now(),
                    'updated_at': datetime.now()
                }
                
                if job['title'] and job['link']:
                    jobs.append(job)
                    
            except Exception as e:
                continue
        
        return jobs
    
    def extract_location(self, job_data: Dict) -> str:
        categories = job_data.get('categories', {})
        location = categories.get('location', '')
        if not location:
            location = categories.get('team', '')
        return location.strip() if location else ''
    
    def extract_job_type(self, job_data: Dict) -> str:
        categories = job_data.get('categories', {})
        return categories.get('commitment', '').strip()
    
    def extract_work_type(self, job_data: Dict) -> str:
        title = job_data.get('text', '').lower()
        description = job_data.get('description', '').lower()
        
        if 'remote' in title or 'remote' in description:
            return 'Remote'
        elif 'hybrid' in title or 'hybrid' in description:
            return 'Hybrid'
        else:
            return 'On-site'
    
    def extract_experience_level(self, job_data: Dict) -> str:
        title = job_data.get('text', '').lower()
        
        if 'senior' in title or 'sr.' in title:
            return 'Senior'
        elif 'junior' in title or 'jr.' in title:
            return 'Junior'
        elif 'lead' in title or 'principal' in title or 'staff' in title:
            return 'Lead'
        elif 'intern' in title:
            return 'Internship'
        else:
            return 'Mid'
    
    def extract_remote_option(self, job_data: Dict) -> bool:
        title = job_data.get('text', '').lower()
        description = job_data.get('description', '').lower()
        location = self.extract_location(job_data).lower()
        
        return any(keyword in text for text in [title, description, location] 
                  for keyword in ['remote', 'work from home', 'distributed'])
    
    def scrape_all_companies(self):
        """Scrape all companies and maintain both jobs and companies tables"""
        # Load companies from tracker
        with open(self.tracker_path, 'r') as f:
            tracker_data = json.load(f)
        
        companies = tracker_data.get('companies', [])
        
        print(f"🚀 Lever scraping: {len(companies)} companies")
        print("📊 Will update BOTH jobs and companies tables")
        print("=" * 60)
        
        total_jobs_found = 0
        total_jobs_saved = 0
        companies_scraped = 0
        
        for i, company_entry in enumerate(companies, 1):
            company_name = company_entry.get('company', f'Company_{i}')
            print(f"\n{i:2d}/{len(companies)} {company_name}")
            
            jobs_found, jobs_saved = self.scrape_lever_company(company_entry)
            
            if jobs_found > 0:
                total_jobs_found += jobs_found
                total_jobs_saved += jobs_saved
                companies_scraped += 1
            
            # Rate limiting
            time.sleep(0.5)
        
        print(f"\n" + "=" * 60)
        print(f"🎉 LEVER SCRAPING COMPLETED")
        print(f"=" * 60)
        print(f"🏢 Companies processed: {len(companies)}")
        print(f"✅ Companies with jobs: {companies_scraped}")
        print(f"📄 Jobs found: {total_jobs_found}")
        print(f"💾 Jobs saved: {total_jobs_saved}")
        
        # Verify both tables are updated
        self.verify_tables_sync()
    
    def verify_tables_sync(self):
        """Verify both tables are properly populated"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM jobs")
        total_jobs = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM companies")
        total_companies = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM companies WHERE job_count > 0")
        companies_with_jobs = cursor.fetchone()[0]
        
        cursor.execute("SELECT SUM(job_count) FROM companies")
        job_count_sum = cursor.fetchone()[0] or 0
        
        conn.close()
        
        print(f"\n📊 TABLE VERIFICATION:")
        print(f"  💼 Jobs table: {total_jobs} jobs")
        print(f"  🏢 Companies table: {total_companies} companies")
        print(f"  ✅ Companies with jobs: {companies_with_jobs}")
        print(f"  🔢 Job count sum: {job_count_sum}")
        
        if abs(total_jobs - job_count_sum) < 50:  # Allow small discrepancy for duplicates
            print(f"  ✅ Tables are in sync!")
        else:
            print(f"  ⚠️  Tables may be out of sync (difference: {abs(total_jobs - job_count_sum)})")

def main():
    """Run Lever scraper that maintains both tables"""
    print("🚀 Lever Scraper - Always Updates Both Tables!")
    print()
    
    scraper = LeverScraper()
    scraper.scrape_all_companies()

if __name__ == "__main__":
    main()