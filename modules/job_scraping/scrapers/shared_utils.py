#!/usr/bin/env python3
"""
Shared Scraper Utilities
Common functionality used by all platform-specific scrapers
"""

import sqlite3
import urllib.request
import urllib.error
import json
import html
import re
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
import time
import csv
import io


class DatabaseManager:
    """Handles all database operations for scrapers"""
    
    def __init__(self, db_file: str = "multi_platform_jobs.db"):
        self.db_file = db_file
        self.setup_database()
    
    def setup_database(self):
        """Create database tables"""
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        # Companies table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS companies (
                id INTEGER PRIMARY KEY,
                name TEXT,
                domain TEXT,
                platform TEXT,
                url TEXT,
                status TEXT,
                job_count INTEGER DEFAULT 0,
                last_scraped TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Jobs table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS jobs (
                id INTEGER PRIMARY KEY,
                company_id INTEGER,
                platform TEXT,
                title TEXT,
                department TEXT,
                location TEXT,
                job_type TEXT,
                employment_type TEXT,
                salary_min INTEGER,
                salary_max INTEGER,
                salary_currency TEXT,
                description TEXT,
                requirements TEXT,
                job_url TEXT,
                job_id TEXT,
                posted_date TEXT,
                scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (company_id) REFERENCES companies (id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def save_company_result(self, company: Dict[str, Any], platform: str, url: str, 
                           status: str, job_count: int) -> int:
        """Save company scraping result and return company_id"""
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO companies (name, domain, platform, url, status, job_count, last_scraped)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (company['name'], company['domain'], platform, url, status, job_count, datetime.now()))
        
        company_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return company_id
    
    def save_jobs(self, company_id: int, platform: str, jobs: List[Dict[str, Any]]):
        """Save job listings to database"""
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        for job in jobs:
            cursor.execute('''
                INSERT INTO jobs (company_id, platform, title, department, location, job_type, 
                                employment_type, description, job_url, job_id, posted_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                company_id, platform, job['title'], job['department'], job['location'],
                job['job_type'], job['employment_type'], job['description'], 
                job['job_url'], job['job_id'], job['posted_date']
            ))
        
        conn.commit()
        conn.close()


class HTTPClient:
    """Handles HTTP requests with proper headers and error handling"""
    
    def __init__(self):
        self.user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    
    def fetch_page_content(self, url: str, timeout: int = 15) -> Tuple[Optional[str], int]:
        """Fetch content from a URL with error handling"""
        try:
            req = urllib.request.Request(url)
            req.add_header('User-Agent', self.user_agent)
            req.add_header('Accept', 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8')
            
            with urllib.request.urlopen(req, timeout=timeout) as response:
                return response.read().decode('utf-8'), response.getcode()
        except urllib.error.HTTPError as e:
            return None, e.code
        except urllib.error.URLError:
            return None, 0
        except Exception:
            return None, -1
    
    def fetch_json(self, url: str, timeout: int = 15) -> Tuple[Optional[Dict], int]:
        """Fetch JSON content from API"""
        content, status_code = self.fetch_page_content(url, timeout)
        
        if status_code == 200 and content:
            try:
                return json.loads(content), status_code
            except json.JSONDecodeError:
                return None, status_code
        
        return None, status_code


class CompanyManager:
    """Handles loading and processing company data"""
    
    @staticmethod
    def load_companies_from_csv(csv_file: str) -> List[Dict[str, Any]]:
        """Load companies from CSV file"""
        companies = []
        
        try:
            with open(csv_file, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                
                if len(lines) <= 1:
                    return companies
                
                # Skip compliance notice, use second line as header
                header_line = lines[1].strip()
                data_lines = lines[2:]
                
                # Parse header
                headers = [h.strip() for h in header_line.split(',')]
                
                # Find column indices
                domain_idx = None
                company_idx = None
                
                for i, header in enumerate(headers):
                    if header.lower() == 'domain':
                        domain_idx = i
                    elif header.lower() == 'company':
                        company_idx = i
                
                if domain_idx is None and company_idx is None:
                    return companies
                
                # Parse data rows
                for line in data_lines:
                    line = line.strip()
                    if not line:
                        continue
                    
                    # Parse CSV row
                    csv_reader = csv.reader(io.StringIO(line))
                    try:
                        row = next(csv_reader)
                        
                        max_idx = max([i for i in [domain_idx, company_idx] if i is not None])
                        if len(row) > max_idx:
                            domain = row[domain_idx].strip().strip('"') if domain_idx is not None else ''
                            company_name = row[company_idx].strip().strip('"') if company_idx is not None else ''
                            
                            if (domain or company_name) and domain != 'Domain' and company_name != 'Company':
                                company_id = CompanyManager.extract_company_identifier(domain, company_name)
                                
                                if company_id:
                                    companies.append({
                                        'domain': domain,
                                        'name': company_name or domain,
                                        'company_id': company_id
                                    })
                    except:
                        continue
        except Exception as e:
            print(f"Error loading CSV {csv_file}: {e}")
        
        return companies
    
    @staticmethod
    def extract_company_identifier(domain: str, company_name: str) -> Optional[str]:
        """Extract company identifier for URL building"""
        company_id = None
        
        # Try domain first
        if domain:
            domain_parts = domain.replace('www.', '').split('.')
            company_id = domain_parts[0] if domain_parts else domain
        
        # Use company name as fallback
        if not company_id or company_id == domain:
            if company_name:
                # Convert company name to URL-friendly format
                company_id = company_name.lower().replace(' ', '-').replace('&', 'and')
                # Remove common corporate suffixes
                company_id = re.sub(r'\b(inc|corp|ltd|llc|company|co)\b', '', company_id)
                company_id = re.sub(r'[^a-z0-9\-]', '', company_id)
                company_id = re.sub(r'\-+', '-', company_id).strip('-')
        
        return company_id if company_id else None
    
    @staticmethod
    def add_shared_companies(companies: List[Dict[str, Any]], shared_companies: List[str]) -> List[Dict[str, Any]]:
        """Add shared companies to the list"""
        for shared_company in shared_companies:
            companies.append({
                'domain': f'{shared_company}.com',
                'name': shared_company.title(),
                'company_id': shared_company
            })
        return companies


class JobParser:
    """Common job parsing utilities"""
    
    @staticmethod
    def parse_generic_jobs(content: str) -> List[Dict[str, Any]]:
        """Parse job data from generic HTML content"""
        jobs = []
        
        # Common job-related patterns
        job_patterns = [
            r'<h[1-6][^>]*>([^<]*(?:Engineer|Manager|Director|Lead|Analyst|Coordinator|Specialist|Developer|Designer|Sales|Marketing)[^<]*)</h[1-6]>',
            r'<a[^>]*href=\"[^\"]*job[^\"]*\"[^>]*>([^<]+)</a>',
            r'<div[^>]*class=\"[^\"]*job[^\"]*\"[^>]*>.*?<.*?>([^<]+)</.*?></div>'
        ]
        
        for pattern in job_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE | re.DOTALL)
            for match in matches:
                title = html.unescape(match.strip())
                if title and len(title) > 5:  # Filter out very short matches
                    jobs.append({
                        'title': title,
                        'department': '',
                        'location': '',
                        'job_type': '',
                        'employment_type': '',
                        'description': '',
                        'job_url': '',
                        'job_id': '',
                        'posted_date': ''
                    })
            
            if jobs:  # If we found jobs with this pattern, don't try others
                break
        
        return jobs
    
    @staticmethod
    def clean_job_data(job: Dict[str, Any]) -> Dict[str, Any]:
        """Clean and normalize job data"""
        cleaned = {}
        
        for key, value in job.items():
            if value is None:
                cleaned[key] = ''
            elif isinstance(value, str):
                # Remove HTML tags and normalize whitespace
                cleaned_value = re.sub(r'<[^>]+>', '', value)
                cleaned_value = re.sub(r'\s+', ' ', cleaned_value).strip()
                cleaned[key] = cleaned_value
            else:
                cleaned[key] = value
        
        return cleaned


class RateLimiter:
    """Handles rate limiting between requests"""
    
    def __init__(self, default_delay: float = 1.0):
        self.default_delay = default_delay
        self.last_request_time = 0
        self.current_delay = default_delay
    
    def wait(self):
        """Wait appropriate time before next request"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.current_delay:
            time.sleep(self.current_delay - time_since_last)
        
        self.last_request_time = time.time()
    
    def handle_rate_limit(self):
        """Increase delay when rate limited"""
        self.current_delay = min(self.current_delay * 2, 10.0)  # Cap at 10 seconds
        print(f"  ⚠️ Rate limited, increasing delay to {self.current_delay}s")
        time.sleep(self.current_delay)
    
    def reset_delay(self):
        """Reset delay on successful request"""
        self.current_delay = self.default_delay


class BaseScraper:
    """Base class for all platform scrapers"""
    
    def __init__(self, platform_name: str, db_file: str = "multi_platform_jobs.db"):
        self.platform_name = platform_name
        self.db = DatabaseManager(db_file)
        self.http = HTTPClient()
        self.rate_limiter = RateLimiter()
        
    def scrape_company(self, company: Dict[str, Any]) -> Dict[str, Any]:
        """Override this method in each platform scraper"""
        raise NotImplementedError("Each scraper must implement scrape_company method")
    
    def generate_urls(self, company: Dict[str, Any]) -> List[str]:
        """Override this method in each platform scraper"""
        raise NotImplementedError("Each scraper must implement generate_urls method")
    
    def parse_jobs(self, content: str, is_api: bool = False) -> List[Dict[str, Any]]:
        """Override this method in each platform scraper"""
        raise NotImplementedError("Each scraper must implement parse_jobs method")
    
    def get_platform_config(self) -> Dict[str, Any]:
        """Override this method in each platform scraper"""
        raise NotImplementedError("Each scraper must implement get_platform_config method")


class ScrapingResult:
    """Standard result format for all scrapers"""
    
    def __init__(self, company: Dict[str, Any], platform: str, url: str, 
                 status: str, job_count: int, method: str):
        self.company = company['name']
        self.domain = company['domain']
        self.platform = platform
        self.url = url
        self.status = status
        self.job_count = job_count
        self.method = method
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format"""
        return {
            'company': self.company,
            'domain': self.domain,
            'platform': self.platform,
            'url': self.url,
            'status': self.status,
            'job_count': self.job_count,
            'method': self.method
        }