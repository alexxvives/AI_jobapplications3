#!/usr/bin/env python3
"""
Platform Coordinator
Coordinates scraping across all individual platform scrapers
"""

import os
import sys
import time
from datetime import datetime
from typing import Dict, List, Any

# Add paths
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'company_sources'))
from shared_companies import get_shared_companies

sys.path.append(os.path.dirname(__file__))
from shared_scraper_utils import CompanyManager
from lever_scraper import LeverScraper
from adp_scraper import ADPScraper
# from workable_scraper import WorkableScraper  # To be created
# from workday_scraper import WorkdayScraper    # To be created


class PlatformCoordinator:
    """Coordinates scraping across all platform scrapers"""
    
    def __init__(self, company_sources_dir: str = "company_sources"):
        self.company_sources_dir = company_sources_dir
        self.results = {}
        
        # Initialize individual scrapers
        self.scrapers = {
            'lever': LeverScraper(),
            'adp': ADPScraper(),
            # 'workable': WorkableScraper(),  # To be added
            # 'workday': WorkdayScraper()     # To be added
        }
    
    def detect_available_platforms(self) -> Dict[str, str]:
        """Detect available CSV files and return platform mapping"""
        available_platforms = {}
        
        if not os.path.exists(self.company_sources_dir):
            print(f"Company sources directory not found: {self.company_sources_dir}")
            return available_platforms
        
        # Map CSV files to platform names
        csv_files = [f for f in os.listdir(self.company_sources_dir) if f.endswith('.csv')]
        
        for csv_file in csv_files:
            platform_name = csv_file.replace('.csv', '').lower()
            
            # Normalize platform names
            if platform_name in ['lever', 'adp', 'workable', 'workday']:
                available_platforms[platform_name] = os.path.join(self.company_sources_dir, csv_file)
        
        return available_platforms
    
    def load_companies_for_platform(self, platform: str) -> List[Dict[str, Any]]:
        """Load companies for a specific platform"""
        available_platforms = self.detect_available_platforms()
        
        if platform not in available_platforms:
            print(f"No CSV file found for platform: {platform}")
            return []
        
        csv_file = available_platforms[platform]
        companies = CompanyManager.load_companies_from_csv(csv_file)
        
        # Add shared companies
        shared_companies = get_shared_companies()
        companies = CompanyManager.add_shared_companies(companies, shared_companies)
        
        return companies
    
    def scrape_platform(self, platform: str, max_companies: int = None) -> Dict[str, Any]:
        """Scrape a specific platform"""
        if platform not in self.scrapers:
            return {
                'status': 'error',
                'message': f'No scraper available for platform: {platform}'
            }
        
        print(f"\n{'='*60}")
        print(f"🚀 SCRAPING {platform.upper()}")
        print(f"{'='*60}")
        
        start_time = datetime.now()
        
        # Load companies
        companies = self.load_companies_for_platform(platform)
        
        if not companies:
            return {
                'status': 'error',
                'message': f'No companies found for platform: {platform}'
            }
        
        # Limit companies if specified
        if max_companies:
            companies = companies[:max_companies]
        
        print(f"📊 Scraping {len(companies)} companies for {platform}")
        
        # Get the scraper
        scraper = self.scrapers[platform]
        
        # Track results
        successful_companies = 0
        total_jobs_found = 0
        results = []
        
        # Scrape each company
        for i, company in enumerate(companies, 1):
            print(f"\n[{i}/{len(companies)}] {company['name']} ({company['domain']})")
            
            try:
                result = scraper.scrape_company(company)
                results.append(result.to_dict())
                
                if result.status == 'success_with_jobs':
                    successful_companies += 1
                    total_jobs_found += result.job_count
                    print(f"  ✅ SUCCESS: Found {result.job_count} jobs")
                elif result.status == 'success_no_jobs':
                    print(f"  ✓ No jobs found")
                else:
                    print(f"  ❌ FAILED: {result.status}")
                
            except Exception as e:
                print(f"  💥 ERROR: {str(e)}")
                results.append({
                    'company': company['name'],
                    'domain': company['domain'],
                    'platform': platform,
                    'status': 'error_exception',
                    'job_count': 0,
                    'method': 'none'
                })
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        summary = {
            'platform': platform,
            'status': 'completed',
            'companies_processed': len(companies),
            'successful_companies': successful_companies,
            'total_jobs_found': total_jobs_found,
            'success_rate': (successful_companies / len(companies) * 100) if companies else 0,
            'duration_seconds': duration,
            'start_time': start_time.isoformat(),
            'end_time': end_time.isoformat(),
            'results': results
        }
        
        print(f"\n📊 {platform.upper()} SUMMARY:")
        print(f"   Companies processed: {len(companies)}")
        print(f"   Successful companies: {successful_companies}")
        print(f"   Total jobs found: {total_jobs_found}")
        print(f"   Success rate: {summary['success_rate']:.1f}%")
        print(f"   Duration: {duration:.1f} seconds")
        
        return summary
    
    def scrape_all_platforms(self, max_companies_per_platform: int = None) -> Dict[str, Any]:
        """Scrape all available platforms"""
        print("🤖 STARTING COORDINATED PLATFORM SCRAPING")
        print("=" * 80)
        
        available_platforms = self.detect_available_platforms()
        available_scrapers = [p for p in available_platforms.keys() if p in self.scrapers]
        
        if not available_scrapers:
            print("❌ No available scrapers found")
            return {'status': 'error', 'message': 'No available scrapers'}
        
        print(f"📋 Available platforms: {', '.join(available_scrapers)}")
        
        overall_start = datetime.now()
        self.results = {}
        
        for platform in available_scrapers:
            try:
                result = self.scrape_platform(platform, max_companies_per_platform)
                self.results[platform] = result
                
                # Brief pause between platforms
                time.sleep(3)
                
            except Exception as e:
                print(f"💥 PLATFORM {platform.upper()} FAILED: {str(e)}")
                self.results[platform] = {
                    'status': 'error',
                    'error': str(e)
                }
        
        overall_end = datetime.now()
        overall_duration = (overall_end - overall_start).total_seconds()
        
        # Generate summary
        total_companies = sum(r.get('companies_processed', 0) for r in self.results.values())
        total_successful = sum(r.get('successful_companies', 0) for r in self.results.values())
        total_jobs = sum(r.get('total_jobs_found', 0) for r in self.results.values())
        
        summary = {
            'status': 'completed',
            'overall_duration': overall_duration,
            'total_companies': total_companies,
            'total_successful': total_successful,
            'total_jobs': total_jobs,
            'overall_success_rate': (total_successful / total_companies * 100) if total_companies > 0 else 0,
            'platform_results': self.results
        }
        
        self.print_final_summary(summary)
        
        return summary
    
    def print_final_summary(self, summary: Dict[str, Any]):
        """Print final summary report"""
        print("\n" + "=" * 80)
        print("🏆 COORDINATED SCRAPING COMPLETE - FINAL SUMMARY")
        print("=" * 80)
        
        print(f"📊 OVERALL RESULTS:")
        print(f"   Total companies processed: {summary['total_companies']}")
        print(f"   Total successful companies: {summary['total_successful']}")
        print(f"   Total jobs found: {summary['total_jobs']}")
        print(f"   Overall success rate: {summary['overall_success_rate']:.1f}%")
        print(f"   Total duration: {summary['overall_duration']:.1f} seconds")
        
        print(f"\n📋 PLATFORM BREAKDOWN:")
        for platform, result in summary['platform_results'].items():
            if result.get('status') == 'completed':
                jobs = result.get('total_jobs_found', 0)
                companies = result.get('successful_companies', 0)
                total_companies = result.get('companies_processed', 0)
                rate = result.get('success_rate', 0)
                
                # Status indicator
                if jobs > 100:
                    status = "🟢 EXCELLENT"
                elif jobs > 10:
                    status = "🟡 GOOD"
                elif jobs > 0:
                    status = "🟠 LIMITED"
                else:
                    status = "🔴 NO JOBS"
                
                print(f"   {platform.upper()}: {jobs} jobs ({companies}/{total_companies} companies, {rate:.1f}%) {status}")
            else:
                print(f"   {platform.upper()}: ❌ FAILED")
    
    def save_results(self, filename: str = None):
        """Save results to JSON file"""
        if filename is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"coordinated_scraping_results_{timestamp}.json"
        
        import json
        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\n💾 Results saved to: {filename}")
        return filename


def main():
    """Main function for testing"""
    coordinator = PlatformCoordinator()
    
    # Test individual platform
    print("Testing individual platform scraping...")
    result = coordinator.scrape_platform('lever', max_companies=5)
    
    # Test all platforms
    print("\nTesting all platforms...")
    summary = coordinator.scrape_all_platforms(max_companies_per_platform=3)
    
    # Save results
    coordinator.save_results()


if __name__ == "__main__":
    main()