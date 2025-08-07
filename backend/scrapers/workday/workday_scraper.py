#!/usr/bin/env python3
"""
Workday Job Scraper
Scrapes jobs from companies that use Workday platform
"""

import json
import re
import requests
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path
import sys
import os
from bs4 import BeautifulSoup
from urllib.parse import urljoin

# Add backend to path for database imports
sys.path.append(str(Path(__file__).parent.parent.parent))
from database_service import UnifiedDatabaseService
from standardize_locations import LocationStandardizer

class WorkdayScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive'
        })
        self.db = UnifiedDatabaseService()
        self.location_standardizer = LocationStandardizer()
        self.tracker_path = Path(__file__).parent.parent / "company_job_tracker.json"
        
    def load_workday_companies(self) -> List[Dict[str, Any]]:
        """Load companies with Workday job links from tracker"""
        if not self.tracker_path.exists():
            print(f"❌ Company tracker not found: {self.tracker_path}")
            return []
            
        with open(self.tracker_path, 'r') as f:
            data = json.load(f)
            
        workday_companies = []
        for company in data.get('companies', []):
            job_links = company.get('job_links', [])
            if not job_links:
                # Handle old format with single job_link
                job_links = [company.get('job_link')] if company.get('job_link') else []
            
            # Find Workday links
            workday_links = [link for link in job_links if 'myworkdayjobs.com' in link]
            if workday_links:
                workday_companies.append({
                    'name': company['company'],
                    'workday_urls': workday_links
                })
                
        return workday_companies
    
    def fetch_workday_page(self, url: str) -> Optional[str]:
        """Fetch content from Workday page"""
        try:
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            return response.text
        except Exception as e:
            print(f"      ❌ Failed to fetch {url}: {e}")
            return None
    
    def extract_job_details_from_page_selenium(self, job_url: str) -> Dict[str, str]:
        """Extract job_type, work_type, location, and description from individual job page using Selenium"""
        details = {
            'job_type': 'Full-time',  # Default
            'work_type': 'On-site',   # Default
            'location': '',           # Default
            'description': ''         # Default
        }
        
        try:
            from selenium import webdriver
            from selenium.webdriver.common.by import By
            from selenium.webdriver.chrome.options import Options
            import time
            
            # Setup Chrome options for headless browsing
            chrome_options = Options()
            chrome_options.add_argument('--headless')
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument('--window-size=1920,1080')
            chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
            
            driver = webdriver.Chrome(options=chrome_options)
            driver.get(job_url)
            time.sleep(5)  # Wait longer for JavaScript to load
            
            # Wait for page to be fully loaded by checking for common elements
            try:
                from selenium.webdriver.support.ui import WebDriverWait
                from selenium.webdriver.support import expected_conditions as EC
                
                # Wait for either job details or any automation-id element to appear
                WebDriverWait(driver, 10).until(
                    lambda driver: len(driver.find_elements(By.CSS_SELECTOR, '[data-automation-id]')) > 0
                )
            except:
                pass  # Continue anyway if wait fails
            
            # Extract location using the most reliable method
            location = self.extract_location_from_page_selenium(driver)
            if location:
                details['location'] = location
            
            # Extract work_type and job_type from DD elements  
            try:
                dd_elements = driver.find_elements(By.CSS_SELECTOR, 'dd.css-129m7dg')
                
                if len(dd_elements) >= 3:
                    # Correct pattern based on analysis: [location, job_type, posted_date, job_id, ...]
                    location_text = dd_elements[0].text.strip()   # 1st element: Location
                    job_type_text = dd_elements[1].text.strip()   # 2nd element: Full time/Part time/Contract  
                    
                    # Use location from DD elements as fallback if location extraction failed
                    if not details['location'] and location_text:
                        if ',' in location_text or any(keyword in location_text.lower() for keyword in ['remote', 'hybrid', 'onsite']):
                            details['location'] = location_text
                    
                    # Extract work_type from location text (if it contains remote/hybrid indicators)
                    if location_text:
                        work_type = self.extract_work_type_from_location(location_text)
                        if work_type != 'On-site':  # Only override default if we found something specific
                            details['work_type'] = work_type
                    
                    # Extract job_type
                    if job_type_text:
                        details['job_type'] = self.normalize_job_type(job_type_text)
                    
                    print(f"          📝 Found dd elements - location: '{location_text}', job_type: '{job_type_text}', work_type: '{details['work_type']}'")
                        
            except Exception as e:
                print(f"          ⚠️  Could not extract from dd elements: {e}")
            
            # Extract job description
            try:
                description_selectors = [
                    '[data-automation-id*=\"jobPosting\"]',
                    '[data-automation-id*=\"description\"]', 
                    '[data-automation-id=\"jobPostingDescription\"]'
                ]
                
                for selector in description_selectors:
                    try:
                        desc_element = driver.find_element(By.CSS_SELECTOR, selector)
                        desc_text = desc_element.text.strip()
                        if desc_text and len(desc_text) > 100:  # Meaningful description
                            # Clean up the description (remove navigation elements, etc.)
                            lines = desc_text.split('\n')
                            clean_lines = []
                            skip_terms = [
                                'apply', 'back to search', 'share', 'save job', 
                                'page is loaded', 'remote type', 'locations', 
                                'time type', 'posted on', 'job requisitio'
                            ]
                            
                            for line in lines:
                                line = line.strip()
                                if (line and 
                                    len(line) > 10 and  # Skip very short lines
                                    not any(skip in line.lower() for skip in skip_terms) and
                                    not line.replace(' ', '').replace(',', '').replace('.', '').isdigit()):  # Skip lines that are just numbers
                                    clean_lines.append(line)
                            
                            clean_desc = '\n'.join(clean_lines)
                            if len(clean_desc) > 100:
                                details['description'] = clean_desc
                                break
                    except:
                        continue
                        
            except Exception as e:
                print(f"          ⚠️  Could not extract description: {e}")
            
            driver.quit()
            
        except Exception as e:
            print(f"        ⚠️  Selenium error for {job_url}: {e}")
            try:
                driver.quit()
            except:
                pass
        
        return details
    
    def extract_location_from_page_selenium(self, driver) -> str:
        """Extract location using the most reliable method"""
        try:
            # Method 1: Use data-automation-id="locations" (most reliable)
            from selenium.webdriver.common.by import By
            
            location_containers = driver.find_elements(By.CSS_SELECTOR, '[data-automation-id="locations"]')
            if location_containers:
                try:
                    location_dd = location_containers[0].find_element(By.CSS_SELECTOR, 'dd.css-129m7dg')
                    location = location_dd.text.strip()
                    if location and location.lower() != 'locations':  # Filter out label text
                        return location
                except:
                    pass
        except:
            pass
        
        try:
            # Method 2: Look for wd-icon-location and text nearby
            location_icons = driver.find_elements(By.CSS_SELECTOR, '.wd-icon-location.wd-icon')
            for icon in location_icons:
                try:
                    # Try to find text in parent or sibling elements
                    parent = icon.find_element(By.XPATH, '..')
                    location_text = parent.text.strip()
                    if location_text and ',' in location_text and len(location_text) < 100:
                        return location_text
                except:
                    continue
        except:
            pass
        
        return ''
    
    def extract_work_type_from_location(self, location_text: str) -> str:
        """Extract work_type from location text that might contain remote/hybrid indicators"""
        if not location_text:
            return 'On-site'
        
        location_lower = location_text.lower()
        
        # Check for explicit work type indicators
        if any(term in location_lower for term in ['remote', 'work from home', 'wfh']):
            return 'Remote'
        elif 'hybrid' in location_lower:
            return 'Hybrid'
        elif any(term in location_lower for term in ['on-site', 'onsite', 'office', 'resident']):
            return 'On-site'
        else:
            # If it's a pure location (City, State/Country), assume on-site
            return 'On-site'
    
    def extract_text_near_element(self, element) -> str:
        """Extract text near an icon element (next sibling, parent, etc.)"""
        try:
            # Try next sibling
            if element.next_sibling:
                text = element.next_sibling.get_text(strip=True) if hasattr(element.next_sibling, 'get_text') else str(element.next_sibling).strip()
                if text:
                    return text
            
            # Try parent's next sibling
            if element.parent and element.parent.next_sibling:
                text = element.parent.next_sibling.get_text(strip=True) if hasattr(element.parent.next_sibling, 'get_text') else str(element.parent.next_sibling).strip()
                if text:
                    return text
            
            # Try looking in parent container
            parent = element.parent
            if parent:
                # Remove the icon element temporarily to get surrounding text
                icon_text = element.get_text(strip=True) if hasattr(element, 'get_text') else ''
                parent_text = parent.get_text(strip=True)
                if parent_text and parent_text != icon_text:
                    return parent_text.replace(icon_text, '').strip()
        
        except Exception:
            pass
        
        return ''
    
    def normalize_job_type(self, text: str) -> str:
        """Normalize job type text to standard values"""
        text_lower = text.lower().strip()
        
        if 'full' in text_lower and 'time' in text_lower:
            return 'Full-time'
        elif 'part' in text_lower and 'time' in text_lower:
            return 'Part-time'
        elif 'contract' in text_lower:
            return 'Contract'
        elif 'intern' in text_lower:
            return 'Internship'
        elif 'temporary' in text_lower or 'temp' in text_lower:
            return 'Contract'
        else:
            return 'Full-time'  # Default
    
    def normalize_work_type(self, text: str) -> str:
        """Normalize work type text to standard values"""
        text_lower = text.lower().strip()
        
        if 'remote' in text_lower:
            return 'Remote'
        elif 'hybrid' in text_lower:
            return 'Hybrid'
        elif any(keyword in text_lower for keyword in ['on-site', 'onsite', 'office', 'in-person']):
            return 'On-site'
        else:
            return 'On-site'  # Default
    
    def extract_job_details_from_data(self, title: str, location: str, subtitles: List[Dict]) -> Dict[str, str]:
        """Extract job_type and work_type from available AJAX data"""
        details = {
            'job_type': 'Full-time',  # Default
            'work_type': 'On-site'    # Default  
        }
        
        # Enhanced job type detection from title
        title_lower = title.lower()
        
        # Job type inference
        if any(term in title_lower for term in ['intern', 'internship', 'student']):
            details['job_type'] = 'Internship'
        elif any(term in title_lower for term in ['contract', 'contractor', 'consultant', 'temp', 'temporary']):
            details['job_type'] = 'Contract'  
        elif any(term in title_lower for term in ['part time', 'part-time', 'parttime']):
            details['job_type'] = 'Part-time'
        elif any(term in title_lower for term in ['full time', 'full-time', 'fulltime', 'permanent']):
            details['job_type'] = 'Full-time'
        # If none found, check subtitles for additional context
        else:
            for subtitle in subtitles:
                if isinstance(subtitle, dict):
                    instances = subtitle.get('instances', [])
                    for instance in instances:
                        if isinstance(instance, dict):
                            text = instance.get('text', '').lower()
                            if any(term in text for term in ['intern', 'contract', 'part time', 'temporary']):
                                if 'intern' in text:
                                    details['job_type'] = 'Internship'
                                elif 'contract' in text:
                                    details['job_type'] = 'Contract'
                                elif 'part time' in text:
                                    details['job_type'] = 'Part-time'
                                break
        
        # Work type inference
        location_lower = location.lower() if location else ''
        
        if any(term in title_lower for term in ['remote', 'work from home', 'wfh', 'distributed']):
            details['work_type'] = 'Remote'
        elif any(term in title_lower for term in ['hybrid']):
            details['work_type'] = 'Hybrid'
        elif any(term in location_lower for term in ['remote', 'work from home', 'anywhere']):
            details['work_type'] = 'Remote'
        elif any(term in location_lower for term in ['hybrid']):
            details['work_type'] = 'Hybrid'
        else:
            # Check subtitles for work type info
            for subtitle in subtitles:
                if isinstance(subtitle, dict):
                    instances = subtitle.get('instances', [])
                    for instance in instances:
                        if isinstance(instance, dict):
                            text = instance.get('text', '').lower()
                            if 'remote' in text:
                                details['work_type'] = 'Remote'
                                break
                            elif 'hybrid' in text:
                                details['work_type'] = 'Hybrid'
                                break
        
        return details
    
    def fetch_workday_jobs_ajax(self, base_url: str) -> Optional[List[Dict]]:
        """Fetch jobs from Workday using AJAX endpoint"""
        try:
            # Workday AJAX endpoint pattern discovered
            ajax_url = f"{base_url}/1/refreshFacet/318c8bb6f553100021d223d9780d30be"
            
            # Set appropriate headers for AJAX request
            ajax_headers = {
                'User-Agent': self.session.headers['User-Agent'],
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': base_url,
                'X-Requested-With': 'XMLHttpRequest'
            }
            
            print(f"      🔗 Trying AJAX endpoint: {ajax_url}")
            response = self.session.get(ajax_url, headers=ajax_headers, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                
                # Navigate the JSON structure to find job listings
                # Path: body -> children -> facetSearchResult -> children -> facetSearchResultList -> listItems
                try:
                    children = data.get('body', {}).get('children', [])
                    
                    # Find facetSearchResult widget
                    facet_result = None
                    for child in children:
                        if child.get('widget') == 'facetSearchResult':
                            facet_result = child
                            break
                    
                    if not facet_result:
                        print(f"      ⚠️  No facetSearchResult widget found")
                        return None
                    
                    # Find facetSearchResultList widget
                    result_list = None
                    for child in facet_result.get('children', []):
                        if child.get('widget') == 'facetSearchResultList':
                            result_list = child
                            break
                    
                    if not result_list:
                        print(f"      ⚠️  No facetSearchResultList widget found")
                        return None
                    
                    # Extract job list items
                    list_items = result_list.get('listItems', [])
                    print(f"      ✅ Found {len(list_items)} jobs via AJAX")
                    return list_items
                    
                except (KeyError, TypeError) as e:
                    print(f"      ❌ Error parsing JSON structure: {e}")
                    return None
            else:
                print(f"      ❌ AJAX request failed: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"      ❌ AJAX request error: {e}")
            return None
    
    def parse_workday_jobs(self, content: str, base_url: str) -> List[Dict[str, Any]]:
        """Parse jobs from Workday HTML content using BeautifulSoup"""
        jobs = []
        
        try:
            soup = BeautifulSoup(content, 'html.parser')
            
            # Primary selector: Look for job title links with data-automation-id="jobTitle"
            job_links = soup.find_all('a', {'data-automation-id': 'jobTitle'})
            
            print(f"      🔍 Found {len(job_links)} job links with data-automation-id='jobTitle'")
            
            for job_link in job_links:
                try:
                    # Extract job title
                    title = job_link.get_text(strip=True)
                    if not title or not self.is_valid_job_title(title):
                        continue
                    
                    # Extract job URL (relative to base)
                    href = job_link.get('href', '')
                    if href:
                        job_url = urljoin(base_url, href)
                    else:
                        job_url = base_url
                    
                    # Try to extract location from surrounding elements
                    location = self.extract_workday_location(job_link)
                    
                    # Create job dictionary
                    work_type = self.extract_workday_work_type(title, location)
                    # Standardize location format before final assignment
                    standardized_location = self.location_standardizer.standardize_location(location) if location else 'No location'
                    final_location = 'No location' if work_type == 'Remote' else standardized_location
                    
                    job = {
                        'title': title,
                        'company': '',  # Will be set by caller
                        'location': final_location,
                        'description': '',  # Could be enhanced by fetching job details
                        'link': job_url,
                        'platform': 'workday',
                        'job_type': self.extract_workday_job_type(title),
                        'work_type': work_type,
                        'experience_level': self.extract_workday_experience_level(title),
                        'salary_range': '',
                        'fetched_at': datetime.now(),
                        'updated_at': datetime.now()
                    }
                    
                    jobs.append(job)
                    
                except Exception as e:
                    print(f"        ⚠️  Error parsing job link: {e}")
                    continue
            
            # If no jobs found with primary selector, try fallback selectors
            if not jobs:
                print(f"      🔄 No jobs found with primary selector, trying fallbacks...")
                fallback_selectors = [
                    'a[href*="job"]',  # Links with "job" in href
                    'h3 a', 'h4 a',   # Links in heading tags
                    'a[class*="job"]'  # Links with "job" in class name
                ]
                
                for selector in fallback_selectors:
                    fallback_links = soup.select(selector)
                    print(f"      🔍 Fallback '{selector}': found {len(fallback_links)} links")
                    
                    for link in fallback_links[:10]:  # Limit fallback results
                        title = link.get_text(strip=True)
                        if title and self.is_valid_job_title(title):
                            href = link.get('href', '')
                            job_url = urljoin(base_url, href) if href else base_url
                            
                            jobs.append({
                                'title': title,
                                'company': '',
                                'location': '',
                                'description': '',
                                'link': job_url,
                                'platform': 'workday',
                                'job_type': '',
                                'work_type': 'On-site',  # Default value
                                'experience_level': '',
                                'salary_range': '',
                                'fetched_at': datetime.now(),
                                'updated_at': datetime.now()
                            })
                    
                    if jobs:  # Stop trying fallbacks if we found jobs
                        break
            
        except Exception as e:
            print(f"      ❌ Error parsing HTML with BeautifulSoup: {e}")
            return []
        
        # Remove duplicates based on title and link
        seen_jobs = set()
        unique_jobs = []
        for job in jobs:
            job_signature = (job['title'].lower(), job['link'])
            if job_signature not in seen_jobs:
                seen_jobs.add(job_signature)
                unique_jobs.append(job)
        
        print(f"      📋 Parsed {len(unique_jobs)} unique jobs")
        return unique_jobs
    
    def parse_workday_jobs_from_ajax(self, job_items: List[Dict], base_url: str) -> List[Dict[str, Any]]:
        """Parse jobs from Workday AJAX response JSON data"""
        jobs = []
        
        print(f"      🔄 Processing {len(job_items)} job items from AJAX response")
        
        # For production Selenium scraping: limit to first 10 jobs per company to balance quality vs speed
        production_limit = 10
        limited_job_items = job_items[:production_limit] if len(job_items) > production_limit else job_items
        if len(job_items) > production_limit:
            print(f"      ⚙️  Production mode: Processing first {production_limit} jobs per company (Selenium optimization)")
        
        for job_item in limited_job_items:
            try:
                # Extract job title from nested Workday structure
                title = ''
                title_data = job_item.get('title', {})
                
                if isinstance(title_data, dict):
                    # Workday stores title in: title.instances[0].text
                    instances = title_data.get('instances', [])
                    if instances and isinstance(instances[0], dict):
                        title = instances[0].get('text', '').strip()
                elif isinstance(title_data, str):
                    title = title_data.strip()
                
                if not title or not self.is_valid_job_title(title):
                    continue
                
                # Extract job URL from title.commandLink
                job_url = base_url  # fallback
                if isinstance(title_data, dict):
                    command_link = title_data.get('commandLink', '')
                    if command_link:
                        job_url = urljoin(base_url, command_link)
                
                # Extract location from subtitles (usually second subtitle)
                location = ''
                subtitles = job_item.get('subtitles', [])
                if len(subtitles) >= 2:
                    # Location is typically in the second subtitle: subtitles[1].instances[0].text
                    location_subtitle = subtitles[1]
                    if isinstance(location_subtitle, dict):
                        location_instances = location_subtitle.get('instances', [])
                        if location_instances and isinstance(location_instances[0], dict):
                            location = location_instances[0].get('text', '').strip()
                
                # Extract job ID from first subtitle (for reference)
                job_id = ''
                if len(subtitles) >= 1:
                    id_subtitle = subtitles[0]
                    if isinstance(id_subtitle, dict):
                        id_instances = id_subtitle.get('instances', [])
                        if id_instances and isinstance(id_instances[0], dict):
                            job_id = id_instances[0].get('text', '').strip()
                
                # Extract accurate job_type, work_type, and description using Selenium
                print(f"          🌐 Loading page with Selenium: {title[:50]}...")
                job_details = self.extract_job_details_from_page_selenium(job_url)
                
                # Create job dictionary
                extracted_location = job_details.get('location', location)
                # Standardize location format
                standardized_location = self.location_standardizer.standardize_location(extracted_location) if extracted_location else 'No location'
                work_type = job_details['work_type']
                final_location = 'No location' if work_type == 'Remote' else standardized_location
                
                job = {
                    'title': title,
                    'company': '',  # Will be set by caller
                    'location': final_location,
                    'description': job_details['description'],  # From Selenium extraction
                    'link': job_url,
                    'platform': 'workday',
                    'job_type': job_details['job_type'],  # From actual job page
                    'work_type': work_type,
                    'experience_level': self.extract_workday_experience_level(title),
                    'salary_range': '',
                    'fetched_at': datetime.now(),
                    'updated_at': datetime.now()
                }
                
                jobs.append(job)
                
            except Exception as e:
                print(f"        ⚠️  Error parsing job item: {e}")
                continue
        
        print(f"      ✅ Successfully parsed {len(jobs)} jobs from AJAX data")
        return jobs
    
    def is_valid_job_title(self, title: str) -> bool:
        """Check if title looks like a valid job title"""
        if not title or len(title) < 3 or len(title) > 150:
            return False
            
        # Filter out common non-job text
        invalid_terms = [
            'newsletter', 'subscribe', 'search', 'filter', 'sort', 'location',
            'submit', 'apply', 'back', 'next', 'previous', 'cookie', 'privacy',
            'terms', 'help', 'support', 'sign up', 'login', 'home', 'about',
            'contact', 'learn more', 'view all', 'see all'
        ]
        
        title_lower = title.lower()
        return not any(term in title_lower for term in invalid_terms)
    
    def extract_workday_location(self, job_link_element) -> str:
        """Extract location from Workday job link element's surrounding context"""
        try:
            # Look for location in nearby elements or parent containers
            parent = job_link_element.parent
            if parent:
                # Check for common Workday location patterns
                location_selectors = [
                    '[data-automation-id*="location"]',
                    '.location',
                    '[class*="location"]',
                    'dd'  # Often used for job details in Workday
                ]
                
                for selector in location_selectors:
                    location_elem = parent.select_one(selector)
                    if location_elem:
                        location_text = location_elem.get_text(strip=True)
                        if location_text and len(location_text) < 100:
                            return location_text
                
                # Fallback: look for text patterns in parent
                parent_text = parent.get_text()
                location_match = re.search(r'([A-Za-z\s]+,\s*[A-Z]{2,})', parent_text)
                if location_match:
                    return location_match.group(1).strip()
            
            return ''
            
        except Exception as e:
            return ''
    
    def extract_workday_experience_level(self, title: str) -> str:
        """Extract standardized experience level from Workday job title (Entry Level, Mid, Senior, Lead)"""
        title_lower = title.lower()
        
        # Senior level indicators
        if any(term in title_lower for term in ['senior', 'sr.', 'sr ']):
            return 'Senior'
        # Leadership level indicators
        elif any(term in title_lower for term in ['lead', 'principal', 'staff', 'director', 'manager', 'head of', 'vp', 'vice president']):
            return 'Lead'
        # Entry level indicators
        elif any(term in title_lower for term in ['junior', 'jr.', 'jr ', 'entry', 'associate', 'graduate', 'new grad', 'intern', 'student']):
            return 'Entry Level'
        else:
            return 'Mid'
    
    
    def extract_location_from_title(self, title: str) -> str:
        """Extract location from job title if present (fallback method)"""
        # Look for patterns like "City, State" at the end
        location_match = re.search(r'([^,]+,\s*[^,]+)$', title)
        if location_match:
            return location_match.group(1).strip()
        return ''
    
    def scrape_company(self, company_data: Dict[str, Any]) -> Dict[str, Any]:
        """Scrape jobs for a single company using AJAX method"""
        company_name = company_data['name']
        workday_urls = company_data['workday_urls']
        
        print(f"  📊 Scraping {company_name} ({len(workday_urls)} Workday URLs)...")
        
        all_jobs = []
        successful_urls = []
        
        for url in workday_urls:
            print(f"    🌐 Trying: {url}")
            
            # Try AJAX method first (preferred)
            job_items = self.fetch_workday_jobs_ajax(url)
            if job_items:
                jobs = self.parse_workday_jobs_from_ajax(job_items, url)
                if jobs:
                    # Set company name for all jobs
                    for job in jobs:
                        job['company'] = company_name
                    
                    all_jobs.extend(jobs)
                    successful_urls.append(url)
                    print(f"      ✅ Found {len(jobs)} jobs via AJAX")
                else:
                    print(f"      ⚠️  AJAX response received but no valid jobs parsed")
            else:
                # Fallback to HTML scraping (likely to fail for Workday SPAs)
                print(f"      🔄 AJAX failed, trying HTML fallback...")
                content = self.fetch_workday_page(url)
                if content:
                    jobs = self.parse_workday_jobs(content, url)
                    if jobs:
                        # Set company name for all jobs
                        for job in jobs:
                            job['company'] = company_name
                        
                        all_jobs.extend(jobs)
                        successful_urls.append(url)
                        print(f"      ✅ Found {len(jobs)} jobs via HTML")
                    else:
                        print(f"      ⚠️  HTML loaded but no jobs found")
                else:
                    print(f"      ❌ Both AJAX and HTML methods failed")
            
            # Rate limiting
            time.sleep(1.0)
        
        return {
            'company': company_name,
            'jobs': all_jobs,
            'successful_urls': successful_urls,
            'total_jobs': len(all_jobs)
        }
    
    def save_jobs_to_database(self, jobs: List[Dict[str, Any]]) -> int:
        """Save jobs to database"""
        if not jobs:
            return 0
            
        saved_count = 0
        for job in jobs:
            try:
                # Save job (the service handles duplicate checking by link)
                self.db.save_scraped_job(job)
                saved_count += 1
            except Exception as e:
                print(f"    ❌ Error saving job {job['title']}: {e}")
                continue
                
        return saved_count
    
    def run_scraping(self) -> Dict[str, Any]:
        """Run the complete Workday scraping process"""
        print("🚀 WORKDAY JOB SCRAPER")
        print("=" * 50)
        
        # Load companies with Workday links
        companies = self.load_workday_companies()
        if not companies:
            return {
                'success': False,
                'error': 'No companies with Workday links found in tracker'
            }
        
        print(f"📋 Found {len(companies)} companies with Workday job pages")
        
        total_jobs = 0
        successful_companies = 0
        failed_companies = 0
        all_results = []
        
        for i, company_data in enumerate(companies, 1):
            print(f"\n[{i}/{len(companies)}] {company_data['name']}")
            
            try:
                result = self.scrape_company(company_data)
                all_results.append(result)
                
                if result['total_jobs'] > 0:
                    # Save jobs to database
                    saved_count = self.save_jobs_to_database(result['jobs'])
                    total_jobs += saved_count
                    successful_companies += 1
                    print(f"  ✅ Saved {saved_count} new jobs to database")
                else:
                    failed_companies += 1
                    print(f"  ⚠️  No jobs found")
                    
            except Exception as e:
                print(f"  ❌ Error scraping {company_data['name']}: {e}")
                failed_companies += 1
                continue
        
        # Summary
        print(f"\n" + "=" * 50)
        print(f"📊 WORKDAY SCRAPING SUMMARY")
        print(f"   🏢 Companies processed: {len(companies)}")
        print(f"   ✅ Successful: {successful_companies}")
        print(f"   ❌ Failed: {failed_companies}")
        print(f"   💼 Total jobs saved: {total_jobs}")
        print(f"   📈 Average jobs per company: {total_jobs/max(successful_companies,1):.1f}")
        
        return {
            'success': True,
            'companies_processed': len(companies),
            'successful_companies': successful_companies,
            'failed_companies': failed_companies,
            'total_jobs_saved': total_jobs,
            'results': all_results
        }

def main():
    """Main entry point"""
    scraper = WorkdayScraper()
    result = scraper.run_scraping()
    
    if not result['success']:
        print(f"❌ Scraping failed: {result.get('error')}")
        return 1
    
    print(f"\n🎉 Workday scraping completed successfully!")
    return 0

if __name__ == "__main__":
    exit(main())