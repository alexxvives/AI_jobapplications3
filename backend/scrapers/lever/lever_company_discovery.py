#!/usr/bin/env python3
"""
Lever Company Discovery using WebSearch
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

class LeverCompanyDiscovery:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        self.tracker_path = Path(__file__).parent.parent / "company_job_tracker.json"
        
    def extract_company_slugs_from_urls(self, urls: List[str]) -> Set[str]:
        """Extract company slugs from Lever job URLs"""
        slugs = set()
        
        for url in urls:
            try:
                # Pattern: https://jobs.lever.co/{company_slug}/job-id or /
                match = re.match(r'https://jobs\.lever\.co/([^/\s?#]+)', url.strip())
                if match:
                    slug = match.group(1)
                    # Skip generic pages
                    if slug not in ['search', 'about', 'contact', 'help']:
                        slugs.add(slug)
            except Exception as e:
                print(f"    ⚠️  Error parsing URL {url}: {e}")
                continue
        
        return slugs
    
    def validate_lever_api(self, company_slug: str) -> Dict[str, Any]:
        """
        Validate a company's Lever API endpoint
        
        Args:
            company_slug: Company identifier (e.g., 'activecampaign')
            
        Returns:
            Dict with validation results
        """
        api_url = f"https://api.lever.co/v0/postings/{company_slug}?mode=json"
        
        try:
            response = self.session.get(api_url, timeout=10)
            
            if response.status_code == 200:
                try:
                    jobs_data = response.json()
                    if isinstance(jobs_data, list):
                        job_count = len(jobs_data)
                        return {
                            'slug': company_slug,
                            'api_url': api_url,
                            'status': 'valid',
                            'job_count': job_count,
                            'error': None
                        }
                    else:
                        return {
                            'slug': company_slug,
                            'api_url': api_url,
                            'status': 'invalid_format',
                            'job_count': 0,
                            'error': 'Response is not a list'
                        }
                except json.JSONDecodeError:
                    return {
                        'slug': company_slug,
                        'api_url': api_url,
                        'status': 'invalid_json',
                        'job_count': 0,
                        'error': 'Invalid JSON response'
                    }
            else:
                return {
                    'slug': company_slug,
                    'api_url': api_url,
                    'status': 'api_error',
                    'job_count': 0,
                    'error': f'HTTP {response.status_code}'
                }
                
        except Exception as e:
            return {
                'slug': company_slug,
                'api_url': api_url,
                'status': 'request_failed',
                'job_count': 0,
                'error': str(e)
            }
    
    def validate_all_companies(self, company_slugs: Set[str]) -> List[Dict[str, Any]]:
        """Validate all discovered companies"""
        print(f"\n🔍 VALIDATING {len(company_slugs)} COMPANIES:")
        print("=" * 50)
        
        valid_companies = []
        failed_companies = []
        
        for i, slug in enumerate(sorted(company_slugs), 1):
            print(f"{i:2d}/{len(company_slugs)} Testing {slug}...", end=" ")
            
            result = self.validate_lever_api(slug)
            
            if result['status'] == 'valid' and result['job_count'] > 0:
                valid_companies.append(result)
                print(f"✅ {result['job_count']} jobs")
            else:
                failed_companies.append(result)
                print(f"❌ {result['error']}")
            
            # Rate limiting
            time.sleep(0.5)
        
        print(f"\n📊 VALIDATION RESULTS:")
        print(f"   ✅ Valid: {len(valid_companies)} companies")
        print(f"   ❌ Failed: {len(failed_companies)} companies")
        if len(valid_companies) + len(failed_companies) > 0:
            success_rate = len(valid_companies)/(len(valid_companies)+len(failed_companies))*100
            print(f"   📈 Success Rate: {success_rate:.1f}%")
        
        total_jobs = sum(c['job_count'] for c in valid_companies)
        print(f"   💼 Total Jobs: {total_jobs}")
        
        return valid_companies
    
    def update_company_tracker(self, valid_companies: List[Dict[str, Any]]) -> None:
        """Update company_job_tracker.json with new companies"""
        
        # Load existing tracker if it exists
        existing_companies = []
        if self.tracker_path.exists():
            with open(self.tracker_path, 'r') as f:
                data = json.load(f)
                existing_companies = data.get('companies', [])
        
        # Convert existing to dict for easy lookup
        existing_dict = {c['company'].lower(): c for c in existing_companies}
        
        # Add new companies (avoid duplicates)
        new_companies = []
        updated_count = 0
        added_count = 0
        
        for company_data in valid_companies:
            slug = company_data['slug']
            company_name = slug.title()  # Simple capitalization
            
            company_entry = {
                'company': company_name,
                'job_links': [company_data['api_url']]
            }
            
            if company_name.lower() in existing_dict:
                # Update existing
                existing_dict[company_name.lower()] = company_entry
                updated_count += 1
            else:
                # Add new
                new_companies.append(company_entry)
                added_count += 1
        
        # Combine all companies
        all_companies = list(existing_dict.values()) + new_companies
        
        # Sort by company name
        all_companies.sort(key=lambda x: x['company'])
        
        # Create final data structure
        tracker_data = {
            'companies': all_companies,
            'metadata': {
                'total_companies': len(all_companies),
                'last_updated': datetime.now().isoformat(),
                'discovery_method': 'WebSearch site:jobs.lever.co',
                'added_this_run': added_count,
                'updated_this_run': updated_count
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
    discovery = LeverCompanyDiscovery()
    
    print("🚀 LEVER COMPANY DISCOVERY")
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
    
    # Validate APIs
    print("\nSTEP 2: API Validation")
    valid_companies = discovery.validate_all_companies(discovered_slugs)
    
    if not valid_companies:
        print("❌ No valid companies found. Exiting.")
        return
    
    # Update tracker
    print("\nSTEP 3: Update Company Tracker")
    discovery.update_company_tracker(valid_companies)
    
    print(f"\n🎉 DISCOVERY COMPLETED!")
    print(f"✅ Ready to run lever_scraper.py with updated companies")

def main():
    """
    Main entry point - Claude should run this and provide WebSearch results
    """
    print("🤖 CLAUDE-POWERED LEVER DISCOVERY")
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
        print(f"   - site:jobs.lever.co {term}")
    
    print()
    print("2. Collect ALL job URLs from all searches")
    print("3. Call run_discovery_with_websearch_data(urls)")
    print()
    print("NOTE: This script is designed to be run BY Claude, not directly by user")

if __name__ == "__main__":
    main()