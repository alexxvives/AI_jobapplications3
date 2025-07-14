#!/usr/bin/env python3
"""
Workday Job Scraper
Specialized scraper for Workday platform jobs with GZIP support
"""

import gzip
import sys
import os
import urllib.request
import urllib.error
from typing import Dict, List, Any
import time
import re
import html

# Selenium imports for headless browser (optional)
try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.common.exceptions import TimeoutException, WebDriverException
    SELENIUM_AVAILABLE = True
except ImportError:
    print("Selenium not available - falling back to urllib requests only")
    SELENIUM_AVAILABLE = False

# Add core scraping utilities to path
sys.path.append(os.path.dirname(__file__))
from shared_utils import BaseScraper, ScrapingResult, JobParser


class WorkdayScraper(BaseScraper):
    """Specialized scraper for Workday platform with headless browser support"""
    
    def __init__(self, db_file: str = None):
        super().__init__("workday", db_file)
        self.rate_limiter.default_delay = 3.0  # Workday needs slower requests
        self.driver = None
        self.setup_driver()
    
    def setup_driver(self):
        """Setup headless Chrome driver"""
        if not SELENIUM_AVAILABLE:
            self.driver = None
            return
            
        try:
            chrome_options = Options()
            chrome_options.add_argument("--headless")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1920,1080")
            chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            chrome_options.add_argument("--disable-blink-features=AutomationControlled")
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option('useAutomationExtension', False)
            
            self.driver = webdriver.Chrome(options=chrome_options)
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            print("✅ Headless Chrome driver initialized successfully")
            
        except Exception as e:
            print(f"Warning: Could not setup Chrome driver: {e}")
            print("Falling back to urllib requests...")
            self.driver = None
    
    def close_driver(self):
        """Close the browser driver"""
        if self.driver:
            try:
                self.driver.quit()
            except:
                pass
            self.driver = None
    
    def __del__(self):
        """Cleanup when object is destroyed"""
        self.close_driver()
    
    def get_platform_config(self) -> Dict[str, Any]:
        """Workday platform configuration"""
        return {
            'url_patterns': [
                'https://{company}.wd1.myworkdayjobs.com/{company}Careers',
                'https://{company}.wd1.myworkdayjobs.com/en-US/{company}/',
                'https://{company}.wd1.myworkdayjobs.com/en-US/{company}careers/',
                'https://{company}.wd5.myworkdayjobs.com/{company}Careers',
                'https://{company}.wd5.myworkdayjobs.com/en-US/{company}/',
                'https://{company}.wd12.myworkdayjobs.com/{company}Careers',
                'https://{company}.wd12.myworkdayjobs.com/en-US/{company}/'
            ],
            'api_pattern': None,  # Workday doesn't have public API
            'use_api': False,
            'requires_gzip': True,
            'search_fallback': 'site:myworkdayjobs.com inurl:{company}'
        }
    
    def generate_urls(self, company: Dict[str, Any]) -> List[str]:
        """Generate Workday-specific URLs for a company"""
        company_id = company['company_id']
        config = self.get_platform_config()
        
        urls = []
        for pattern in config['url_patterns']:
            url = pattern.format(company=company_id)
            urls.append(url)
        
        return urls
    
    def fetch_workday_content_selenium(self, url: str) -> tuple:
        """Fetch content from Workday using headless browser"""
        if not SELENIUM_AVAILABLE or not self.driver:
            return None, -1
        
        try:
            print(f"      Using headless browser to load: {url}")
            self.driver.get(url)
            
            # Wait for the page to load and jobs to appear
            wait = WebDriverWait(self.driver, 15)
            
            # Try to wait for common Workday job listing selectors
            job_selectors = [
                '[data-automation-id="jobTitle"]',
                '.jobTitle',
                '.job-title',
                'a[href*="job"]',
                '[class*="job"]'
            ]
            
            jobs_found = False
            for selector in job_selectors:
                try:
                    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, selector)))
                    jobs_found = True
                    break
                except TimeoutException:
                    continue
            
            # If no specific job elements found, wait for page to be generally loaded
            if not jobs_found:
                time.sleep(3)  # Give dynamic content time to load
            
            # Get the page source after JavaScript has executed
            content = self.driver.page_source
            return content, 200
            
        except Exception as e:
            if SELENIUM_AVAILABLE:
                if "TimeoutException" in str(type(e)):
                    print(f"      ⚠️ Timeout waiting for page to load")
                    try:
                        content = self.driver.page_source
                        return content, 200  # Return what we have
                    except:
                        return None, 408
                elif "WebDriverException" in str(type(e)):
                    print(f"      ❌ WebDriver error: {e}")
                    return None, -1
            print(f"      ❌ Unexpected error: {e}")
            return None, -1
    
    def fetch_workday_content(self, url: str) -> tuple:
        """Fetch content from Workday with GZIP support"""
        try:
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
            req.add_header('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8')
            req.add_header('Accept-Language', 'en-US,en;q=0.5')
            req.add_header('Accept-Encoding', 'gzip, deflate')
            req.add_header('Connection', 'keep-alive')
            
            with urllib.request.urlopen(req, timeout=15) as response:
                # Check if response is compressed
                encoding = response.getheader('Content-Encoding')
                raw_data = response.read()
                
                if encoding == 'gzip':
                    content = gzip.decompress(raw_data).decode('utf-8')
                else:
                    content = raw_data.decode('utf-8')
                
                return content, response.getcode()
                
        except urllib.error.HTTPError as e:
            return None, e.code
        except urllib.error.URLError:
            return None, 0
        except Exception as e:
            return None, -1
    
    def parse_jobs(self, content: str, is_api: bool = False) -> List[Dict[str, Any]]:
        """Parse job data from Workday HTML (including JavaScript-rendered content)"""
        if is_api:
            return []  # Workday doesn't have public API
        
        jobs = []
        
        # Enhanced Workday-specific patterns for JavaScript-rendered content
        workday_patterns = [
            # Workday automation IDs (most common)
            r'data-automation-id="jobTitle"[^>]*>([^<]+)<',
            r'<a[^>]*data-automation-id="jobTitle"[^>]*>([^<]+)</a>',
            r'<h[1-6][^>]*data-automation-id="jobTitle"[^>]*>([^<]+)</h[1-6]>',
            r'<div[^>]*data-automation-id="jobTitle"[^>]*>([^<]+)</div>',
            r'<span[^>]*data-automation-id="jobTitle"[^>]*>([^<]+)</span>',
            # Workday CSS classes and IDs
            r'<a[^>]*class="[^"]*jobTitle[^"]*"[^>]*>([^<]+)</a>',
            r'<div[^>]*class="[^"]*jobTitle[^"]*"[^>]*>([^<]+)</div>',
            r'<h[1-6][^>]*class="[^"]*jobTitle[^"]*"[^>]*>([^<]+)</h[1-6]>',
            # More generic Workday patterns
            r'<a[^>]*class="[^"]*job[^"]*title[^"]*"[^>]*>([^<]+)</a>',
            r'<div[^>]*class="[^"]*job[^"]*"[^>]*>.*?<a[^>]*>([^<]+)</a>',
            # Workday specific ARIA patterns
            r'role="link"[^>]*aria-label="([^"]*)"[^>]*>',
            r'aria-label="([^"]*job[^"]*)"[^>]*>',
            # Job link patterns specific to Workday
            r'<a[^>]*href="[^"]*myworkdayjobs\.com[^"]*job[^"]*"[^>]*>([^<]+)</a>',
            r'<a[^>]*href="[^"]*job[^"]*"[^>]*title="([^"]+)"',
            # Table-based job listings
            r'<td[^>]*class="[^"]*job[^"]*"[^>]*>([^<]+)</td>',
            # Generic job patterns (fallback)
            r'<h[1-6][^>]*>([^<]*(?:Engineer|Manager|Director|Analyst|Specialist|Developer|Coordinator|Lead|Sales|Marketing|Senior|Junior|Software|Data|Product|Operations|Quality|Systems|Business|Technical)[^<]*)</h[1-6]>',
            r'<a[^>]*href="[^"]*(?:job|career)[^"]*"[^>]*>([^<]+)</a>'
        ]
        
        for pattern in workday_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE | re.DOTALL)
            for match in matches:
                title = html.unescape(match.strip())
                # More lenient title validation for Workday
                if title and len(title) > 3 and len(title) < 150:
                    # Filter out common non-job text
                    if not any(skip in title.lower() for skip in ['newsletter', 'subscribe', 'search', 'filter', 'sort', 'location', 'submit', 'apply', 'back', 'next', 'previous']):
                        # Extract additional info if present
                        location_match = re.search(r'([^,]+,\s*[^,]+)$', title)
                        location = location_match.group(1) if location_match else ''
                        
                        # Clean title if location was found
                        if location:
                            title = title.replace(location, '').strip(' ,-')
                        
                        jobs.append({
                            'title': title,
                            'department': '',
                            'location': location,
                            'job_type': '',
                            'employment_type': '',
                            'description': '',
                            'job_url': '',
                            'job_id': '',
                            'posted_date': ''
                        })
            
            if jobs:  # If we found jobs with this pattern, don't try others
                break
        
        # Try Selenium-specific extraction if we have headless browser content
        if not jobs and self.driver and 'data-automation-id' in content:
            jobs = self.extract_jobs_selenium_content(content)
        
        # Fall back to generic parsing if no Workday-specific matches
        if not jobs:
            jobs = JobParser.parse_generic_jobs(content)
        
        # Clean and validate jobs
        cleaned_jobs = []
        seen_titles = set()
        for job in jobs:
            cleaned_job = JobParser.clean_job_data(job)
            title_lower = cleaned_job['title'].lower()
            
            # Enhanced filtering
            if (cleaned_job['title'] and 
                title_lower not in seen_titles and
                len(cleaned_job['title']) > 3 and
                not any(skip in title_lower for skip in ['newsletter', 'sign up', 'subscribe', 'cookie', 'privacy', 'terms', 'help', 'support'])):
                cleaned_jobs.append(cleaned_job)
                seen_titles.add(title_lower)
        
        return cleaned_jobs
    
    def extract_jobs_selenium_content(self, content: str) -> List[Dict[str, Any]]:
        """Extract jobs from content that was loaded with Selenium"""
        jobs = []
        
        # Pattern specifically for Workday's JavaScript-rendered job cards
        job_card_pattern = r'<div[^>]*data-automation-id="jobPostingCard"[^>]*>(.*?)</div>'
        cards = re.findall(job_card_pattern, content, re.DOTALL)
        
        for card in cards:
            title_match = re.search(r'data-automation-id="jobTitle"[^>]*>([^<]+)<', card)
            location_match = re.search(r'data-automation-id="locations"[^>]*>([^<]+)<', card)
            
            if title_match:
                title = html.unescape(title_match.group(1).strip())
                location = html.unescape(location_match.group(1).strip()) if location_match else ''
                
                jobs.append({
                    'title': title,
                    'department': '',
                    'location': location,
                    'job_type': '',
                    'employment_type': '',
                    'description': '',
                    'job_url': '',
                    'job_id': '',
                    'posted_date': ''
                })
        
        return jobs
    
    def try_workday_urls(self, company: Dict[str, Any]) -> Dict[str, Any]:
        """Try multiple Workday URL patterns"""
        urls = self.generate_urls(company)
        
        for url in urls:
            print(f"    Trying Workday URL: {url}")
            
            # Try headless browser first, then fallback to urllib
            content, status_code = self.fetch_workday_content_selenium(url)
            
            if status_code != 200 or not content:
                print(f"      Selenium failed, trying urllib fallback...")
                content, status_code = self.fetch_workday_content(url)
            
            if status_code == 200 and content:
                jobs = self.parse_jobs(content, is_api=False)
                
                if jobs:
                    print(f"      ✅ Found {len(jobs)} jobs")
                    return {
                        'success': True,
                        'jobs': jobs,
                        'url': url,
                        'method': 'workday_url_headless' if self.driver else 'workday_url_urllib'
                    }
                else:
                    print(f"      ✓ Accessible but no jobs found")
            else:
                print(f"      ❌ Failed: {status_code}")
        
        return {'success': False}
    
    def try_company_careers_page(self, company: Dict[str, Any]) -> Dict[str, Any]:
        """Try company's main careers page as fallback"""
        company_id = company['company_id']
        
        fallback_urls = [
            f"https://careers.{company_id}.com",
            f"https://jobs.{company_id}.com",
            f"https://{company_id}.com/careers",
            f"https://{company_id}.com/jobs"
        ]
        
        for url in fallback_urls:
            print(f"    Trying careers page: {url}")
            
            # Try headless browser first, then fallback to urllib
            content, status_code = self.fetch_workday_content_selenium(url)
            
            if status_code != 200 or not content:
                content, status_code = self.fetch_workday_content(url)
            
            if status_code == 200 and content:
                jobs = self.parse_jobs(content, is_api=False)
                
                if jobs:
                    print(f"      ✅ Found {len(jobs)} jobs")
                    return {
                        'success': True,
                        'jobs': jobs,
                        'url': url,
                        'method': 'careers_page_headless' if self.driver else 'careers_page_urllib'
                    }
                else:
                    print(f"      ✓ Accessible but no jobs found")
            else:
                print(f"      ❌ Failed: {status_code}")
        
        return {'success': False}
    
    def scrape_company(self, company: Dict[str, Any]) -> ScrapingResult:
        """Scrape jobs for a single company on Workday"""
        print(f"  Scraping {company['name']}...")
        
        # Apply rate limiting
        self.rate_limiter.wait()
        
        # Step 1: Try Workday URLs
        result = self.try_workday_urls(company)
        
        if result['success']:
            jobs = result['jobs']
            job_count = len(jobs)
            
            if job_count > 0:
                company_id = self.db.save_company_result(
                    company, result['url'], job_count
                )
                self.db.save_jobs(company_id, self.platform_name, jobs)
                
                return ScrapingResult(
                    company, self.platform_name, result['url'],
                    "success_with_jobs", job_count, result['method']
                )
            else:
                self.db.save_company_result(
                    company, result['url'], 0
                )
                
                return ScrapingResult(
                    company, self.platform_name, result['url'],
                    "success_no_jobs", 0, result['method']
                )
        
        # Step 2: Try company careers pages as fallback
        print(f"  Workday URLs failed, trying careers pages...")
        
        result = self.try_company_careers_page(company)
        
        if result['success']:
            jobs = result['jobs']
            job_count = len(jobs)
            
            if job_count > 0:
                company_id = self.db.save_company_result(
                    company, result['url'], job_count
                )
                self.db.save_jobs(company_id, self.platform_name, jobs)
                
                return ScrapingResult(
                    company, self.platform_name, result['url'],
                    "success_with_jobs_fallback", job_count, result['method']
                )
            else:
                self.db.save_company_result(
                    company, result['url'], 0
                )
                
                return ScrapingResult(
                    company, self.platform_name, result['url'],
                    "success_no_jobs_fallback", 0, result['method']
                )
        
        # All methods failed
        error_status = "error_no_access"
        self.db.save_company_result(
            company, None, 0
        )
        
        return ScrapingResult(
            company, self.platform_name, 'N/A',
            error_status, 0, 'none'
        )


def main():
    """Test the Workday scraper"""
    scraper = WorkdayScraper()
    
    # Test with the real examples provided
    test_companies = [
        {
            'name': 'Pfizer',
            'domain': 'pfizer.com',
            'company_id': 'pfizer'
        },
        {
            'name': 'Northern Trust',
            'domain': 'ntrs.com',
            'company_id': 'ntrs'
        },
        {
            'name': 'Owens & Minor',
            'domain': 'owensminor.com',
            'company_id': 'owensminor'
        }
    ]
    
    print("Testing Workday Scraper with GZIP support...")
    
    for company in test_companies:
        print(f"\n--- Testing {company['name']} ---")
        result = scraper.scrape_company(company)
        
        print(f"Result: {result.status}")
        print(f"Jobs found: {result.job_count}")
        print(f"Method: {result.method}")


if __name__ == "__main__":
    main()