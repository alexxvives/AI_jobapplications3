#!/usr/bin/env python3
"""
Check what's actually in the database after scraping
"""

import sqlite3

def check_database():
    """Check actual database contents"""
    
    from db_config import get_db_path
    conn = sqlite3.connect(get_db_path())
    cursor = conn.cursor()
    
    # Count total jobs and companies
    cursor.execute('SELECT COUNT(*) FROM jobs')
    total_jobs = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(DISTINCT company) FROM jobs WHERE company IS NOT NULL AND company != ""')
    unique_companies = cursor.fetchone()[0]
    
    print(f'📊 DATABASE REALITY CHECK:')
    print(f'  💼 Total jobs: {total_jobs:,}')
    print(f'  🏢 Unique companies: {unique_companies}')
    
    # List all companies
    cursor.execute('SELECT company, COUNT(*) FROM jobs WHERE company IS NOT NULL AND company != "" GROUP BY company ORDER BY COUNT(*) DESC')
    companies = cursor.fetchall()
    
    print(f'\n📋 All {len(companies)} companies with jobs:')
    for i, (company, count) in enumerate(companies, 1):
        print(f'  {i:2d}. {company}: {count} jobs')
    
    # Check if there are any jobs without company names
    cursor.execute('SELECT COUNT(*) FROM jobs WHERE company IS NULL OR company = ""')
    no_company = cursor.fetchone()[0]
    
    if no_company > 0:
        print(f'\n⚠️  {no_company} jobs have no company name')
    
    # Check recent jobs (from today)
    cursor.execute('SELECT company, COUNT(*) FROM jobs WHERE date(fetched_at) = date("now") GROUP BY company ORDER BY COUNT(*) DESC')
    recent_jobs = cursor.fetchall()
    
    if recent_jobs:
        print(f'\n🕐 Jobs scraped today ({len(recent_jobs)} companies):')
        total_today = 0
        for company, count in recent_jobs:
            print(f'    • {company}: {count} jobs')
            total_today += count
        print(f'  📊 Total jobs scraped today: {total_today}')
    else:
        print(f'\n❌ No jobs were scraped today!')
    
    conn.close()

if __name__ == "__main__":
    check_database()