#!/usr/bin/env python3
"""
Shared Scraper Utilities - UNIFIED VERSION
Common functionality used by all platform-specific scrapers
Uses unified database service for consistency
"""

import urllib.request
import urllib.error
import json
import html
import re
import sys
import os
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
import time
import csv
import io

# Add backend path to import the unified database service
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
from database_service import db_service


class DatabaseManager:
    """Handles all database operations for scrapers using unified database service"""
    
    def __init__(self, db_file: str = None):
        # Ignore db_file parameter and use unified service
        self.db_service = db_service
        self.setup_database()
    
    def setup_database(self):
        """Setup database using unified service"""
        self.db_service.setup_database()
    
    def save_jobs(self, company_id: int, platform: str, jobs: List[Dict[str, Any]]) -> List[int]:
        """Save jobs using unified database service with proper schema"""
        if not jobs:
            return []
        
        # Convert jobs to proper format for unified service
        formatted_jobs = []
        for job in jobs:
            formatted_job = {
                'title': job.get('title', ''),
                'company': job.get('company', ''),
                'location': job.get('location', ''),
                'description': job.get('description', ''),
                'link': job.get('link', job.get('url', job.get('job_url', ''))),
                'platform': platform,  # Use platform field
                'job_type': job.get('job_type'),
                'work_type': job.get('work_type'),
                'experience_level': job.get('experience_level'),
                'salary_range': job.get('salary_range'),
                'remote_option': job.get('remote_option', False)
            }
            formatted_jobs.append(formatted_job)
        
        return self.db_service.save_scraped_jobs_batch(formatted_jobs)
    
    def save_company_result(self, company_name: str, url: str = None, job_count: int = 0) -> int:
        """Save company result using simplified schema"""
        return self.db_service.save_company_result(
            company_name, url, job_count
        )


class HTTPClient:
    """HTTP client with rate limiting and retry logic"""
    
    def __init__(self, delay: float = 1.0):
        self.delay = delay
        self.last_request_time = 0
    
    def get(self, url: str, headers: Dict[str, str] = None) -> Optional[str]:
        """GET request with rate limiting"""
        self._rate_limit()
        
        if headers is None:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        
        try:
            request = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(request, timeout=30) as response:
                return response.read().decode('utf-8')
        except Exception as e:
            print(f"HTTP request failed for {url}: {e}")
            return None
    
    def _rate_limit(self):
        """Enforce rate limiting between requests"""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)
        self.last_request_time = time.time()


class CompanyManager:
    """Manages company data and domain mapping"""
    
    def __init__(self, companies_file: str = None):
        if companies_file is None:
            # Use the consolidated companies file
            base_dir = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'data')
            companies_file = os.path.join(base_dir, 'consolidated_companies.json')
        
        self.companies_file = companies_file
        self.companies = self.load_companies()
    
    def load_companies(self) -> List[Dict[str, Any]]:
        """Load companies from JSON file"""
        try:
            with open(self.companies_file, 'r') as f:
                data = json.load(f)
                return data.get('companies', [])
        except Exception as e:
            print(f"Error loading companies: {e}")
            return []
    
    def get_companies_by_platform(self, platform: str) -> List[Dict[str, Any]]:
        """Get companies that use a specific platform"""
        return [
            company for company in self.companies
            if platform.lower() in [p.lower() for p in company.get('platforms', [])]
        ]
    
    def get_company_domain(self, company_name: str) -> Optional[str]:
        """Get domain for a company"""
        for company in self.companies:
            if company['name'].lower() == company_name.lower():
                return company.get('domain')
        return None


class JobParser:
    """Common job parsing utilities"""
    
    @staticmethod
    def clean_text(text: str) -> str:
        """Clean and normalize text"""
        if not text:
            return ""
        
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        # Decode HTML entities
        text = html.unescape(text)
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    
    @staticmethod
    def extract_salary(text: str) -> Optional[str]:
        """Extract salary information from text"""
        if not text:
            return None
        
        # Look for salary patterns
        salary_patterns = [
            r'\$[\d,]+(?:\.\d{2})?\s*-\s*\$[\d,]+(?:\.\d{2})?',
            r'\$[\d,]+(?:\.\d{2})?(?:\s*k)?(?:\s*per\s+year)?',
        ]
        
        for pattern in salary_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group()
        
        return None
    
    @staticmethod
    def parse_generic_jobs(content: str) -> List[Dict[str, Any]]:
        """Parse jobs from generic HTML content (for ADP and other scrapers)"""
        if not content:
            return []
        
        jobs = []
        
        # Look for common job listing patterns in HTML
        import re
        
        # Pattern 1: Look for job titles in common HTML structures
        title_patterns = [
            r'<h[1-4][^>]*>([^<]*(?:engineer|developer|manager|analyst|specialist|coordinator|director|senior|junior|intern)[^<]*)</h[1-4]>',
            r'<a[^>]*href[^>]*>([^<]*(?:engineer|developer|manager|analyst|specialist|coordinator|director|senior|junior|intern)[^<]*)</a>',
            r'<div[^>]*class[^>]*job[^>]*>.*?<.*?>([^<]*(?:engineer|developer|manager|analyst|specialist|coordinator|director)[^<]*)</.*?>',
        ]
        
        # Pattern 2: Look for structured job data
        job_patterns = [
            r'<div[^>]*class[^>]*(?:job|position|opening)[^>]*>.*?</div>',
            r'<li[^>]*class[^>]*(?:job|position|opening)[^>]*>.*?</li>',
            r'<tr[^>]*class[^>]*(?:job|position|opening)[^>]*>.*?</tr>',
        ]
        
        # Try to extract job titles
        found_titles = set()
        for pattern in title_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE | re.DOTALL)
            for match in matches:
                title = JobParser.clean_text(match.strip())
                if len(title) > 5 and len(title) < 100 and title not in found_titles:
                    found_titles.add(title)
                    jobs.append({
                        'title': title,
                        'company': '',  # Will be filled by caller
                        'location': '',
                        'description': '',
                        'link': '',
                        'department': '',
                        'job_type': '',
                        'employment_type': ''
                    })
        
        # If no titles found, try simpler patterns
        if not jobs:
            # Look for any text that might be job titles
            simple_patterns = [
                r'>([^<]*(?:software|engineer|developer|manager|director|analyst)[^<]*)<',
                r'>([^<]*(?:intern|junior|senior|lead|principal)[^<]*)<',
            ]
            
            for pattern in simple_patterns:
                matches = re.findall(pattern, content, re.IGNORECASE)
                for match in matches[:10]:  # Limit to prevent spam
                    title = JobParser.clean_text(match.strip())
                    if len(title) > 5 and len(title) < 100 and title not in found_titles:
                        found_titles.add(title)
                        jobs.append({
                            'title': title,
                            'company': '',
                            'location': '',
                            'description': '',
                            'link': '',
                            'department': '',
                            'job_type': '',
                            'employment_type': ''
                        })
        
        return jobs[:20]  # Limit to 20 jobs max to prevent spam

    @staticmethod
    def clean_job_data(job: Dict[str, Any]) -> Dict[str, Any]:
        """Clean and standardize job data"""
        cleaned = {}
        
        # Clean basic fields
        cleaned['title'] = JobParser.clean_text(job.get('title', ''))
        cleaned['company'] = JobParser.clean_text(job.get('company', ''))
        cleaned['location'] = JobParser.clean_text(job.get('location', ''))
        cleaned['description'] = JobParser.clean_text(job.get('description', ''))
        
        # Handle URL/link fields
        cleaned['link'] = job.get('link', job.get('url', job.get('job_url', '')))
        
        # Handle optional fields
        cleaned['department'] = JobParser.clean_text(job.get('department', ''))
        cleaned['job_type'] = JobParser.clean_text(job.get('job_type', ''))
        cleaned['employment_type'] = JobParser.clean_text(job.get('employment_type', ''))
        cleaned['work_type'] = JobParser.clean_text(job.get('work_type', ''))
        cleaned['experience_level'] = JobParser.clean_text(job.get('experience_level', ''))
        cleaned['salary_range'] = JobParser.clean_text(job.get('salary_range', ''))
        cleaned['remote_option'] = job.get('remote_option', False)
        
        # Extract salary if present in description
        if cleaned['description']:
            salary = JobParser.extract_salary(cleaned['description'])
            if salary:
                cleaned['salary_range'] = salary
        
        return cleaned


class RateLimiter:
    """Rate limiting utility"""
    
    def __init__(self, requests_per_minute: int = 30):
        self.requests_per_minute = requests_per_minute
        self.min_delay = 60.0 / requests_per_minute
        self.last_request_time = 0
    
    def wait(self):
        """Wait if necessary to maintain rate limit"""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.min_delay:
            time.sleep(self.min_delay - elapsed)
        self.last_request_time = time.time()


class BaseScraper:
    """Base class for all platform scrapers"""
    
    def __init__(self, platform_name: str, db_file: str = None):
        self.platform_name = platform_name
        self.db = DatabaseManager(db_file)
        self.http_client = HTTPClient()
        self.company_manager = CompanyManager()
        self.rate_limiter = RateLimiter()
    
    def scrape_companies(self, companies: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Override this method in subclasses"""
        raise NotImplementedError("Subclasses must implement scrape_companies method")


class ScrapingResult:
    """Data class for scraping results"""
    
    def __init__(self):
        self.companies_attempted = 0
        self.companies_successful = 0
        self.total_jobs_found = 0
        self.errors = []
        self.start_time = datetime.now()
        self.end_time = None
    
    def add_company_result(self, success: bool, job_count: int = 0):
        """Add result for a company"""
        self.companies_attempted += 1
        if success:
            self.companies_successful += 1
            self.total_jobs_found += job_count
    
    def add_error(self, error: str):
        """Add an error message"""
        self.errors.append(error)
    
    def finalize(self):
        """Mark scraping as complete"""
        self.end_time = datetime.now()
    
    def get_summary(self) -> Dict[str, Any]:
        """Get summary of results"""
        duration = None
        if self.end_time:
            duration = (self.end_time - self.start_time).total_seconds()
        
        return {
            'companies_attempted': self.companies_attempted,
            'companies_successful': self.companies_successful,
            'success_rate': self.companies_successful / max(1, self.companies_attempted),
            'total_jobs_found': self.total_jobs_found,
            'duration_seconds': duration,
            'errors': self.errors
        }