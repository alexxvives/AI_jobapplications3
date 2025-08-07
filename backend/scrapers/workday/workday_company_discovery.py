#!/usr/bin/env python3
"""
Workday Company Discovery using WebSearch
AUTOMATED - No manual steps required
Claude runs this script and automatically uses WebSearch tool
"""

import json
import re
import requests
import time
from datetime import datetime
from typing import List, Set, Dict, Any
from pathlib import Path

class WorkdayCompanyDiscovery:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        self.tracker_path = Path(__file__).parent.parent / "company_job_tracker.json"
        
    def extract_company_slugs_from_urls(self, urls: List[str]) -> Set[str]:
        """Extract company slugs from Workday job URLs"""
        slugs = set()
        
        for url in urls:
            try:
                # Pattern: https://{company}.wd{number}.myworkdayjobs.com/
                match = re.match(r'https://([^.]+)\.wd\d+\.myworkdayjobs\.com', url.strip())
                if match:
                    slug = match.group(1)
                    # Skip generic pages
                    if slug not in ['search', 'about', 'contact', 'help', 'www']:
                        slugs.add(slug)
            except Exception as e:
                print(f"    ⚠️  Error parsing URL {url}: {e}")
                continue
        
        return slugs
    
    def validate_workday_site(self, company_slug: str) -> Dict[str, Any]:
        """
        Validate a company's Workday jobs site
        
        Args:
            company_slug: Company identifier (e.g., 'salesforce')
            
        Returns:
            Dict with validation results
        """
        # Try different Workday URL patterns
        possible_urls = [
            f"https://{company_slug}.wd1.myworkdayjobs.com/",
            f"https://{company_slug}.wd5.myworkdayjobs.com/",
            f"https://{company_slug}.wd12.myworkdayjobs.com/",
            f"https://{company_slug}.wd3.myworkdayjobs.com/",
            f"https://{company_slug}.wd2.myworkdayjobs.com/"
        ]
        
        for workday_url in possible_urls:
            try:
                response = self.session.get(workday_url, timeout=10, allow_redirects=True)
                
                if response.status_code == 200:
                    # Check if page contains job listings indicators
                    content = response.text.lower()
                    if any(indicator in content for indicator in [
                        'workday', 'job', 'career', 'position', 'apply', 'opening'
                    ]):
                        return {
                            'slug': company_slug,
                            'workday_url': workday_url,
                            'status': 'valid',
                            'job_count': 1,  # We can't easily count jobs without detailed parsing
                            'error': None
                        }
                        
            except Exception as e:
                continue
        
        return {
            'slug': company_slug,
            'workday_url': possible_urls[0],  # Return first attempted URL
            'status': 'not_found',
            'job_count': 0,
            'error': 'No accessible Workday site found'
        }
    
    def validate_all_companies(self, company_slugs: Set[str]) -> List[Dict[str, Any]]:
        """Validate all discovered companies"""
        print(f"\n🔍 VALIDATING {len(company_slugs)} WORKDAY COMPANIES:")
        print("=" * 50)
        
        valid_companies = []
        failed_companies = []
        
        for i, slug in enumerate(sorted(company_slugs), 1):
            print(f"{i:2d}/{len(company_slugs)} Testing {slug}...", end=" ")
            
            result = self.validate_workday_site(slug)
            
            if result['status'] == 'valid':
                valid_companies.append(result)
                print(f"✅ Found Workday site")
            else:
                failed_companies.append(result)
                print(f"❌ {result['error']}")
            
            # Rate limiting
            time.sleep(1.0)  # Slightly longer delay for Workday
        
        print(f"\n📊 VALIDATION RESULTS:")
        print(f"   ✅ Valid: {len(valid_companies)} companies")
        print(f"   ❌ Failed: {len(failed_companies)} companies")
        if len(valid_companies) + len(failed_companies) > 0:
            success_rate = len(valid_companies)/(len(valid_companies)+len(failed_companies))*100
            print(f"   📈 Success Rate: {success_rate:.1f}%")
        
        print(f"   💼 Workday Sites Found: {len(valid_companies)}")
        
        return valid_companies
    
    def update_company_tracker(self, valid_companies: List[Dict[str, Any]]) -> None:
        """Update company_job_tracker.json with new Workday companies"""
        
        # Load existing tracker if it exists
        existing_companies = []
        if self.tracker_path.exists():
            with open(self.tracker_path, 'r') as f:
                data = json.load(f)
                existing_companies = data.get('companies', [])
        
        # Convert existing to dict for easy lookup
        existing_dict = {c['company'].lower(): c for c in existing_companies}
        
        # Add new companies or update existing ones
        updated_count = 0
        added_count = 0
        
        for company_data in valid_companies:
            slug = company_data['slug']
            company_name = slug.replace('-', ' ').title()  # Convert slug to company name
            
            if company_name.lower() in existing_dict:
                # Company exists, add Workday link to job_links
                existing_company = existing_dict[company_name.lower()]
                
                # Convert single job_link to job_links list if needed
                if 'job_link' in existing_company and 'job_links' not in existing_company:
                    existing_company['job_links'] = [existing_company['job_link']]
                    del existing_company['job_link']
                elif 'job_links' not in existing_company:
                    existing_company['job_links'] = []
                
                # Add Workday URL if not already present
                workday_url = company_data['workday_url']
                if workday_url not in existing_company['job_links']:
                    existing_company['job_links'].append(workday_url)
                    updated_count += 1
            else:
                # New company
                company_entry = {
                    'company': company_name,
                    'job_links': [company_data['workday_url']]
                }
                existing_dict[company_name.lower()] = company_entry
                added_count += 1
        
        # Convert back to list and sort
        all_companies = list(existing_dict.values())
        all_companies.sort(key=lambda x: x['company'])
        
        # Create final data structure
        tracker_data = {
            'companies': all_companies,
            'summary': {
                'total_companies': len(all_companies),
                'last_updated': datetime.now().isoformat(),
                'workday_added_this_run': added_count,
                'workday_updated_this_run': updated_count
            }
        }
        
        # Save to file
        with open(self.tracker_path, 'w') as f:
            json.dump(tracker_data, f, indent=2)
        
        print(f"\n💾 UPDATED COMPANY TRACKER:")
        print(f"   📁 File: {self.tracker_path}")
        print(f"   ✅ Total Companies: {len(all_companies)}")
        print(f"   🆕 Added: {added_count}")
        print(f"   🔄 Updated: {updated_count}")

def run_discovery_with_websearch_data(websearch_urls: List[str]) -> None:
    """
    Run the discovery process with WebSearch URLs provided by Claude
    
    This function is called by Claude after collecting WebSearch results
    """
    discovery = WorkdayCompanyDiscovery()
    
    print("🚀 WORKDAY COMPANY DISCOVERY")
    print("Discovering companies from WebSearch results")
    print("=" * 60)
    
    # Extract company slugs from URLs
    print("STEP 1: Extracting Company Slugs")
    discovered_slugs = discovery.extract_company_slugs_from_urls(websearch_urls)
    
    if not discovered_slugs:
        print("❌ No companies discovered from URLs. Exiting.")
        return
    
    print(f"🎯 Discovered {len(discovered_slugs)} unique companies")
    print(f"🏢 Companies: {', '.join(sorted(list(discovered_slugs))[:10])}{'...' if len(discovered_slugs) > 10 else ''}")
    
    # Validate Workday sites
    print("\nSTEP 2: Workday Site Validation")
    valid_companies = discovery.validate_all_companies(discovered_slugs)
    
    if not valid_companies:
        print("❌ No valid companies found. Exiting.")
        return
    
    # Update tracker
    print("\nSTEP 3: Update Company Tracker")
    discovery.update_company_tracker(valid_companies)
    
    print(f"\n🎉 DISCOVERY COMPLETED!")
    print(f"✅ Ready to run workday_scraper.py with updated companies")

def main():
    """
    Main entry point - Claude should run this and provide WebSearch results
    """
    print("🤖 CLAUDE-POWERED WORKDAY DISCOVERY")
    print("=" * 50)
    print("INSTRUCTIONS FOR CLAUDE:")
    print("1. Use WebSearch tool with these queries:")
    
    search_terms = [
        "software engineer",
        "product manager", 
        "data scientist",
        "marketing manager",
        "sales engineer",
        "designer",
        "developer",
        "analyst"
    ]
    
    for term in search_terms:
        print(f"   - site:myworkdayjobs.com {term}")
    
    print()
    print("2. Collect ALL job URLs from all searches")
    print("3. Call run_discovery_with_websearch_data(urls)")
    print()
    print("NOTE: This script is designed to be run BY Claude, not directly by user")

if __name__ == "__main__":
    main()