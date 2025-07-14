#!/usr/bin/env python3
"""
Scraper Runner - Prevents duplicate database files
Always run scrapers from backend/ directory to maintain unified database
"""

import os
import sys
from pathlib import Path

def ensure_backend_directory():
    """Ensure we're running from the backend directory"""
    current_dir = Path.cwd()
    
    # Check if we're in backend directory
    if current_dir.name == 'backend':
        return True
    
    # Check if we're in project root and can cd to backend
    backend_path = current_dir / 'backend'
    if backend_path.exists():
        os.chdir(backend_path)
        print(f"✅ Changed directory to: {backend_path}")
        return True
    
    # Check if we're in a subdirectory of backend
    for parent in current_dir.parents:
        if parent.name == 'backend':
            os.chdir(parent)
            print(f"✅ Changed directory to: {parent}")
            return True
    
    print("❌ Error: Cannot find backend directory!")
    print("Please run this script from the project root or backend directory.")
    return False

def main():
    """Main runner function"""
    if not ensure_backend_directory():
        sys.exit(1)
    
    print("🔍 Available scrapers:")
    print("1. Lever scraper")
    print("2. Workday scraper") 
    print("3. ADP scraper")
    print("4. Run all scrapers")
    
    choice = input("\nSelect scraper (1-4): ").strip()
    
    if choice == "1":
        from services.job_scraping.scrapers.lever_scraper import LeverScraper
        print("🎯 Running Lever scraper...")
        # Add Lever scraper execution logic here
        
    elif choice == "2":
        from services.job_scraping.scrapers.workday_scraper import WorkdayScraper
        print("🎯 Running Workday scraper...")
        # Add Workday scraper execution logic here
        
    elif choice == "3":
        from services.job_scraping.scrapers.adp_scraper import ADPScraper
        print("🎯 Running ADP scraper...")
        # Add ADP scraper execution logic here
        
    elif choice == "4":
        print("🎯 Running all scrapers...")
        # Add logic to run all scrapers
        
    else:
        print("❌ Invalid choice!")
        sys.exit(1)
    
    print("✅ Database location:", Path.cwd() / "job_automation.db")

if __name__ == "__main__":
    main()