#!/usr/bin/env python3
"""
Lever Job Scraper
Specialized scraper for Lever platform jobs
"""

import json
import sys
import os
from typing import Dict, List, Any

# Add core scraping utilities to path
sys.path.append(os.path.dirname(__file__))
from shared_utils import BaseScraper, ScrapingResult, JobParser


class LeverScraper(BaseScraper):
    """Specialized scraper for Lever platform"""
    
    def __init__(self, db_file: str = None):
        super().__init__("lever", db_file)
        self.rate_limiter.default_delay = 2.0  # Lever-specific rate limiting
    
    def get_platform_config(self) -> Dict[str, Any]:
        """Lever platform configuration"""
        return {
            'url_pattern': 'https://jobs.lever.co/{company}',
            'api_pattern': 'https://api.lever.co/v0/postings/{company}?mode=json',
            'use_api': True,
            'search_fallback': 'site:jobs.lever.co inurl:{company}'
        }
    
    def generate_urls(self, company: Dict[str, Any]) -> List[str]:
        """Generate Lever-specific URLs for a company"""
        company_id = company['company_id']
        
        urls = [
            # Primary API endpoint
            f"https://api.lever.co/v0/postings/{company_id}?mode=json",
            # Jobs page
            f"https://jobs.lever.co/{company_id}",
            # Search fallback URLs
            f"https://jobs.lever.co/{company_id}",
            f"https://api.lever.co/v0/postings/{company_id}?mode=json"
        ]
        
        return urls
    
    def parse_jobs(self, content: str, is_api: bool = False) -> List[Dict[str, Any]]:
        """Parse job data from Lever API or HTML"""
        jobs = []
        
        if is_api:
            try:
                data = json.loads(content)
                
                # Handle both single job and job list responses
                job_list = data if isinstance(data, list) else [data]
                
                for job in job_list:
                    # Skip if not a valid job object
                    if not isinstance(job, dict) or 'text' not in job:
                        continue
                    
                    jobs.append({
                        'title': job.get('text', ''),
                        'department': job.get('categories', {}).get('department', ''),
                        'location': job.get('categories', {}).get('location', ''),
                        'job_type': job.get('categories', {}).get('commitment', ''),
                        'employment_type': job.get('categories', {}).get('commitment', ''),
                        'description': job.get('description', ''),
                        'job_url': job.get('hostedUrl', ''),
                        'job_id': job.get('id', ''),
                        'posted_date': job.get('createdAt', '')
                    })
            except json.JSONDecodeError as e:
                print(f"      JSON parsing error: {e}")
                return []
        else:
            # Fall back to generic HTML parsing
            jobs = JobParser.parse_generic_jobs(content)
        
        # Clean and validate jobs
        cleaned_jobs = []
        for job in jobs:
            cleaned_job = JobParser.clean_job_data(job)
            if cleaned_job['title']:  # Only include jobs with titles
                cleaned_jobs.append(cleaned_job)
        
        return cleaned_jobs
    
    def try_lever_api(self, company: Dict[str, Any]) -> Dict[str, Any]:
        """Try Lever API endpoint specifically"""
        company_id = company['company_id']
        api_url = f"https://api.lever.co/v0/postings/{company_id}?mode=json"
        
        print(f"    Trying Lever API: {api_url}")
        
        data, status_code = self.http.fetch_json(api_url)
        
        if status_code == 200 and data:
            # Convert dict to JSON string for parsing
            content = json.dumps(data)
            jobs = self.parse_jobs(content, is_api=True)
            
            if jobs:
                return {
                    'success': True,
                    'jobs': jobs,
                    'url': api_url,
                    'method': 'lever_api'
                }
        
        print(f"      API failed: {status_code}")
        return {'success': False, 'status_code': status_code}
    
    def try_lever_page(self, company: Dict[str, Any]) -> Dict[str, Any]:
        """Try Lever jobs page"""
        company_id = company['company_id']
        page_url = f"https://jobs.lever.co/{company_id}"
        
        print(f"    Trying Lever page: {page_url}")
        
        content, status_code = self.http.fetch_page_content(page_url)
        
        if status_code == 200 and content:
            jobs = self.parse_jobs(content, is_api=False)
            
            return {
                'success': True,
                'jobs': jobs,
                'url': page_url,
                'method': 'lever_html',
                'job_count': len(jobs)
            }
        
        print(f"      Page failed: {status_code}")
        return {'success': False, 'status_code': status_code}
    
    def try_search_fallback(self, company: Dict[str, Any]) -> Dict[str, Any]:
        """Try search fallback for Lever"""
        company_id = company['company_id']
        
        print(f"    Trying search fallback...")
        print(f"    Search query: site:jobs.lever.co inurl:{company_id}")
        
        # Generate search result URLs
        search_urls = [
            f"https://jobs.lever.co/{company_id}",
            f"https://api.lever.co/v0/postings/{company_id}?mode=json"
        ]
        
        all_jobs = []
        
        for url in search_urls:
            print(f"    Trying search result: {url}")
            
            if 'api.lever.co' in url:
                data, status_code = self.http.fetch_json(url)
                if status_code == 200 and data:
                    content = json.dumps(data)
                    jobs = self.parse_jobs(content, is_api=True)
                    if jobs:
                        all_jobs.extend(jobs)
                        print(f"      Found {len(jobs)} jobs via API")
                    else:
                        print(f"      No jobs found")
                else:
                    print(f"      Error {status_code}")
            else:
                content, status_code = self.http.fetch_page_content(url)
                if status_code == 200 and content:
                    jobs = self.parse_jobs(content, is_api=False)
                    if jobs:
                        all_jobs.extend(jobs)
                        print(f"      Found {len(jobs)} jobs via HTML")
                    else:
                        print(f"      No jobs found")
                else:
                    print(f"      Error {status_code}")
        
        if all_jobs:
            return {
                'success': True,
                'jobs': all_jobs,
                'url': search_urls[0],
                'method': 'lever_search_fallback'
            }
        
        return {'success': False}
    
    def scrape_company(self, company: Dict[str, Any]) -> ScrapingResult:
        """Scrape jobs for a single company on Lever"""
        print(f"  Scraping {company['name']}...")
        
        # Apply rate limiting
        self.rate_limiter.wait()
        
        # Step 1: Try Lever API first
        result = self.try_lever_api(company)
        
        if result['success']:
            jobs = result['jobs']
            job_count = len(jobs)
            
            # Save to database
            company_id = self.db.save_company_result(
                company, self.platform_name, result['url'], 
                "success_with_jobs", job_count
            )
            self.db.save_jobs(company_id, self.platform_name, jobs)
            
            return ScrapingResult(
                company, self.platform_name, result['url'],
                "success_with_jobs", job_count, result['method']
            )
        
        # Step 2: Try Lever jobs page
        result = self.try_lever_page(company)
        
        if result['success']:
            jobs = result['jobs']
            job_count = len(jobs)
            
            if job_count > 0:
                company_id = self.db.save_company_result(
                    company, self.platform_name, result['url'], 
                    "success_with_jobs", job_count
                )
                self.db.save_jobs(company_id, self.platform_name, jobs)
                
                return ScrapingResult(
                    company, self.platform_name, result['url'],
                    "success_with_jobs", job_count, result['method']
                )
            else:
                self.db.save_company_result(
                    company, self.platform_name, result['url'], 
                    "success_no_jobs", 0
                )
                
                return ScrapingResult(
                    company, self.platform_name, result['url'],
                    "success_no_jobs", 0, result['method']
                )
        
        # Step 3: Try search fallback
        print(f"  Primary URL failed ({result.get('status_code', 'unknown')}), trying search fallback...")
        
        result = self.try_search_fallback(company)
        
        if result['success']:
            jobs = result['jobs']
            job_count = len(jobs)
            
            company_id = self.db.save_company_result(
                company, self.platform_name, result['url'], 
                "success_with_jobs_search", job_count
            )
            self.db.save_jobs(company_id, self.platform_name, jobs)
            
            return ScrapingResult(
                company, self.platform_name, result['url'],
                "success_with_jobs_search", job_count, result['method']
            )
        
        # All methods failed
        error_status = f"error_{result.get('status_code', 'unknown')}"
        self.db.save_company_result(
            company, self.platform_name, 'N/A', error_status, 0
        )
        
        return ScrapingResult(
            company, self.platform_name, 'N/A',
            error_status, 0, 'none'
        )


def main():
    """Test the Lever scraper"""
    scraper = LeverScraper()
    
    # Test with a known working company
    test_company = {
        'name': 'Back Market',
        'domain': 'backmarket.com',
        'company_id': 'backmarket'
    }
    
    print("Testing Lever Scraper...")
    result = scraper.scrape_company(test_company)
    
    print(f"Result: {result.status}")
    print(f"Jobs found: {result.job_count}")
    print(f"Method: {result.method}")


if __name__ == "__main__":
    main()