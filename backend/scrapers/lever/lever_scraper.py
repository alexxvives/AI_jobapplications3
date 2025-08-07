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
import re
from datetime import datetime
from typing import List, Dict, Tuple
import sys
import os
from pathlib import Path
from db_config import get_db_path, get_tracker_path

# Import location standardizer
sys.path.append(str(Path(__file__).parent.parent.parent))
from standardize_locations import LocationStandardizer

class LeverScraper:
    def __init__(self):
        self.db_path = get_db_path()
        self.tracker_path = get_tracker_path()
        self.location_standardizer = LocationStandardizer()
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
                        fetched_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    job['title'], job['company'], job['location'], job['description'],
                    job['link'], job['platform'], job['job_type'], job['work_type'],
                    job['experience_level'], job['salary_range'],
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
        job_links = company_entry.get('job_links', [])
        
        if not company_name or not job_links:
            return 0, 0
        
        print(f"  🔄 Scraping {company_name}...")
        
        # Find Lever API link from job_links array
        lever_link = None
        for link in job_links:
            if 'api.lever.co' in link:
                lever_link = link
                break
        
        if not lever_link:
            print(f"    ⚠️  No Lever API link found")
            self.upsert_company(company_name, None, 0)
            return 0, 0
        
        try:
            response = self.session.get(lever_link, timeout=10)
            
            if response.status_code == 200:
                jobs_data = response.json()
                if isinstance(jobs_data, list):
                    jobs = self.process_lever_jobs(jobs_data, company_name)
                    saved_jobs = self.save_jobs_and_update_company(jobs, company_name, lever_link)
                    return len(jobs), saved_jobs
                else:
                    print(f"    ❌ Invalid JSON format")
                    self.upsert_company(company_name, lever_link, 0)
                    return 0, 0
            else:
                print(f"    ❌ API error ({response.status_code})")
                self.upsert_company(company_name, lever_link, 0)
                return 0, 0
                
        except Exception as e:
            print(f"    ❌ Scraping failed: {e}")
            self.upsert_company(company_name, lever_link, 0)
            return 0, 0
    
    def process_lever_jobs(self, jobs_data: List[Dict], company_name: str) -> List[Dict]:
        """Process Lever API jobs data with comprehensive field extraction"""
        jobs = []
        
        for job_data in jobs_data:
            try:
                job = {
                    'title': job_data.get('text', '').strip(),
                    'company': company_name,
                    'location': self.extract_location(job_data),
                    'description': self.extract_description(job_data),
                    'link': job_data.get('hostedUrl', '').strip(),
                    'platform': 'lever',
                    'job_type': self.extract_job_type(job_data),
                    'work_type': self.extract_work_type(job_data),
                    'experience_level': self.extract_experience_level(job_data),
                    'salary_range': self.extract_salary_range(job_data),
                    'fetched_at': datetime.now(),
                    'updated_at': datetime.now()
                }
                
                if job['title'] and job['link']:
                    jobs.append(job)
                    
            except Exception as e:
                continue
        
        return jobs
    
    def extract_location(self, job_data: Dict) -> str:
        """Extract location combining categories.location + country, handling remote jobs"""
        categories = job_data.get('categories', {})
        location = categories.get('location', '').strip()
        country = job_data.get('country', '').strip()
        workplace_type = job_data.get('workplaceType', '').strip().lower()
        
        # If job is remote, return "No location"
        if workplace_type == 'remote':
            return 'No location'
        
        # Check if location indicates remote work
        if location.lower() in ['remote', 'remote work', 'work from home']:
            return 'No location'
        
        # Combine location and country if both available
        raw_location = ''
        if location and country:
            raw_location = f"{location}, {country}"
        elif location:
            raw_location = location
        elif country:
            raw_location = country
        else:
            raw_location = categories.get('team', '').strip()
        
        # Standardize the location format
        if raw_location:
            return self.location_standardizer.standardize_location(raw_location)
        else:
            return 'No location'
    
    def extract_job_type(self, job_data: Dict) -> str:
        """Extract and normalize job type to standard categories"""
        categories = job_data.get('categories', {})
        raw_commitment = categories.get('commitment', '').strip().lower()
        
        # Normalize to standard job types with precise internship detection
        if self._is_internship_job(raw_commitment):
            return 'Internship'
        elif 'part' in raw_commitment and 'time' in raw_commitment:
            return 'Part-time'
        elif any(word in raw_commitment for word in ['contract', 'contractor', 'consultant', 'freelance', 'temporary', 'fixed', 'clt']):
            return 'Contract'
        elif any(word in raw_commitment for word in ['full', 'permanent', 'employee']) or raw_commitment == '':
            return 'Full-time'
        else:
            # Default to Full-time for unclear cases
            return 'Full-time'
    
    def _is_internship_job(self, raw_commitment: str) -> bool:
        """Check if job is an internship with precise word boundary detection"""
        internship_indicators = [
            'intern ',      # intern followed by space
            'internship',   # full word internship
            'estágio',      # Portuguese internship
            ' intern',      # intern preceded by space
            'co-op',        # co-op programs
            'coop'          # coop without hyphen
        ]
        
        # Check if any indicator matches (avoiding words like 'internal', 'international')
        for indicator in internship_indicators:
            if indicator in raw_commitment:
                return True
                
        # Check if the entire string is just 'intern'
        if raw_commitment.strip() == 'intern':
            return True
            
        return False
    
    def extract_work_type(self, job_data: Dict) -> str:
        """Extract work type from workplaceType field"""
        workplace_type = job_data.get('workplaceType', '').strip().lower()
        
        if workplace_type == 'remote':
            return 'Remote'
        elif workplace_type == 'hybrid':
            return 'Hybrid'
        elif workplace_type == 'onsite':
            return 'On-site'
        else:
            # Fallback to text analysis if workplaceType not available
            title = job_data.get('text', '').lower()
            description = job_data.get('description', '').lower()
            
            if 'remote' in title or 'remote' in description:
                return 'Remote'
            elif 'hybrid' in title or 'hybrid' in description:
                return 'Hybrid'
            else:
                return 'On-site'
    
    def extract_experience_level(self, job_data: Dict) -> str:
        """Extract standardized experience level (Entry Level, Mid, Senior, Lead)"""
        # First check if this is an internship job type
        job_type = self.extract_job_type(job_data)
        if job_type == 'Internship':
            return 'Entry Level'
        
        title = job_data.get('text', '').lower()
        
        # Senior level indicators
        if any(indicator in title for indicator in ['senior', 'sr.', 'sr ']):
            return 'Senior'
        # Leadership level indicators  
        elif any(indicator in title for indicator in ['lead', 'principal', 'staff', 'head of', 'director', 'vp', 'vice president']):
            return 'Lead'
        # Entry level indicators
        elif any(indicator in title for indicator in ['junior', 'jr.', 'jr ', 'entry', 'graduate', 'new grad']):
            return 'Entry Level'
        # Check title for internship indicators (should be Entry Level)
        elif self._is_internship_job(title):
            return 'Entry Level'
        else:
            # Default to Mid level
            return 'Mid'
    
    def extract_description(self, job_data: Dict) -> str:
        """Extract comprehensive description from descriptionPlain + additionalPlain + all lists"""
        description_parts = []
        
        # Main description
        desc_plain = job_data.get('descriptionPlain', '').strip()
        if desc_plain:
            description_parts.append(desc_plain)
        
        # Additional company info
        additional_plain = job_data.get('additionalPlain', '').strip()
        if additional_plain:
            description_parts.append(additional_plain)
        
        # Extract all lists content (requirements, responsibilities, etc.)
        lists = job_data.get('lists', [])
        for list_item in lists:
            list_text = list_item.get('text', '').strip()
            list_content = list_item.get('content', '').strip()
            
            if list_text:
                description_parts.append(f"\n{list_text}")
            
            if list_content:
                # Remove HTML tags from list content for clean text
                import re
                clean_content = re.sub(r'<[^>]+>', '', list_content)
                # Convert HTML entities
                clean_content = clean_content.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
                description_parts.append(clean_content)
        
        return '\n\n'.join(description_parts)
    
    def extract_salary_range(self, job_data: Dict) -> str:
        """Extract salary range from salaryRange dict only"""
        # Structured salary data
        salary_range = job_data.get('salaryRange', {})
        if salary_range:
            min_salary = salary_range.get('min')
            max_salary = salary_range.get('max')
            currency = salary_range.get('currency', '')
            interval = salary_range.get('interval', '')
            
            if min_salary and max_salary:
                # Format: "$190000-$200000 USD per-year-salary"
                currency_symbol = '$' if currency == 'USD' else currency
                salary_range_str = f"{currency_symbol}{min_salary}-{currency_symbol}{max_salary}"
                if currency and currency != 'USD':
                    salary_range_str += f" {currency}"
                if interval:
                    salary_range_str += f" {interval}"
                return salary_range_str
        
        return 'Salary not specified'
    
    
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