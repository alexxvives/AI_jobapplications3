#!/usr/bin/env python3
"""
Company and job statistics from consolidated sources
"""

import json
import os
from typing import Dict, List

try:
    from sqlalchemy.orm import Session
    from models import Job
    SQLALCHEMY_AVAILABLE = True
except ImportError:
    SQLALCHEMY_AVAILABLE = False
    Session = None
    Job = None

# Use unified database path
from database_service import db_service

def load_consolidated_companies():
    """Load consolidated companies data"""
    json_file = os.path.join(os.path.dirname(__file__), 'data', 'consolidated_companies.json')
    
    try:
        with open(json_file, 'r') as f:
            data = json.load(f)
            return data
    except Exception as e:
        print(f"Error loading consolidated companies: {e}")
        return None

def get_company_source_stats():
    """Get statistics about company sources"""
    data = load_consolidated_companies()
    if not data:
        return {}
    
    companies = data.get('companies', [])
    source_stats = {}
    platform_stats = {}
    
    # Count by source
    for company in companies:
        for source in company.get('sources', []):
            source_stats[source] = source_stats.get(source, 0) + 1
    
    # Count by platform
    for company in companies:
        for platform in company.get('platforms', []):
            platform_stats[platform] = platform_stats.get(platform, 0) + 1
    
    return {
        'total_companies': len(companies),
        'sources': source_stats,
        'platforms': platform_stats,
        'generated_at': data.get('generated_at', 'unknown')
    }

def get_job_stats_by_company(db=None):
    """Get job statistics by company name from scraping database"""
    import sqlite3
    
    try:
        # Connect to the scraping database
        scraping_db_path = db_service.db_path
        conn = sqlite3.connect(scraping_db_path)
        cursor = conn.cursor()
        
        # Query jobs grouped by company
        cursor.execute("""
            SELECT 
                companies.name as company_name,
                companies.platform as platform,
                COUNT(jobs.id) as job_count
            FROM companies 
            LEFT JOIN jobs ON companies.id = jobs.company_id 
            GROUP BY companies.name, companies.platform
            HAVING job_count > 0
            ORDER BY job_count DESC
        """)
        
        results = cursor.fetchall()
        company_stats = []
        for row in results:
            company_stats.append({
                'company': row[0],
                'platform': row[1],
                'jobs': row[2]
            })
        
        conn.close()
        return company_stats
        
    except Exception as e:
        print(f"Error getting job stats by company: {e}")
        return []

def get_job_stats_by_platform(db=None):
    """Get job statistics by platform from scraping database"""
    import sqlite3
    
    try:
        # Connect to the scraping database
        scraping_db_path = db_service.db_path
        conn = sqlite3.connect(scraping_db_path)
        cursor = conn.cursor()
        
        # Query jobs grouped by platform
        cursor.execute("""
            SELECT 
                companies.platform as platform,
                COUNT(jobs.id) as job_count,
                COUNT(DISTINCT companies.id) as company_count
            FROM companies 
            LEFT JOIN jobs ON companies.id = jobs.company_id 
            WHERE companies.platform IS NOT NULL AND jobs.id IS NOT NULL
            GROUP BY companies.platform
            ORDER BY job_count DESC
        """)
        
        results = cursor.fetchall()
        platform_stats = {}
        for row in results:
            platform_stats[row[0]] = {
                'jobs': row[1],
                'companies': row[2]
            }
        
        conn.close()
        return platform_stats
        
    except Exception as e:
        print(f"Error getting job stats by platform: {e}")
        return {}

def get_simple_job_stats_by_source():
    """Get simple job statistics by source like the original dashboard"""
    import sqlite3
    
    try:
        scraping_db_path = db_service.db_path
        conn = sqlite3.connect(scraping_db_path)
        cursor = conn.cursor()
        
        # Get jobs by platform (source)
        cursor.execute("""
            SELECT 
                companies.platform as source,
                COUNT(jobs.id) as job_count
            FROM companies 
            LEFT JOIN jobs ON companies.id = jobs.company_id 
            WHERE companies.platform IS NOT NULL AND jobs.id IS NOT NULL
            GROUP BY companies.platform
            ORDER BY job_count DESC
        """)
        
        results = cursor.fetchall()
        source_stats = {}
        for row in results:
            source_stats[row[0]] = row[1]
        
        conn.close()
        return source_stats
        
    except Exception as e:
        print(f"Error getting simple job stats: {e}")
        return {}

def get_comprehensive_stats(db):
    """Get comprehensive statistics combining company sources and job data"""
    
    # Get company source statistics
    company_stats = get_company_source_stats()
    
    # Get job statistics from database
    job_stats_by_company = get_job_stats_by_company(db)
    job_stats_by_platform = get_job_stats_by_platform(db)
    
    # Get total job count from scraping database
    import sqlite3
    try:
        scraping_db_path = db_service.db_path
        conn = sqlite3.connect(scraping_db_path)
        cursor = conn.cursor()
        
        # Get total jobs
        cursor.execute("SELECT COUNT(*) FROM jobs")
        total_jobs = cursor.fetchone()[0]
        
        # Get total companies with jobs
        cursor.execute("SELECT COUNT(DISTINCT company_id) FROM jobs WHERE company_id IS NOT NULL")
        companies_with_jobs_count = cursor.fetchone()[0]
        
        conn.close()
    except Exception as e:
        print(f"Error getting totals: {e}")
        total_jobs = 0
        companies_with_jobs_count = 0
    
    # Get simple source breakdown for the original-style display
    simple_source_stats = get_simple_job_stats_by_source()
    
    return {
        'company_sources': company_stats,
        'job_database': {
            'total_jobs': total_jobs,
            'companies_with_jobs': companies_with_jobs_count,
            'by_platform': job_stats_by_platform,
            'top_companies': job_stats_by_company[:20],  # Top 20 companies
            'simple_sources': simple_source_stats  # Original-style source breakdown
        },
        'summary': {
            'available_companies': company_stats.get('total_companies', 0),
            'scraped_companies': companies_with_jobs_count,
            'success_rate': round((companies_with_jobs_count / company_stats.get('total_companies', 1)) * 100, 1) if company_stats.get('total_companies') else 0,
            'total_jobs_found': total_jobs
        }
    }

if __name__ == "__main__":
    # Test the functions
    print("=== Company Source Statistics ===")
    stats = get_company_source_stats()
    print(f"Total companies: {stats.get('total_companies', 0)}")
    print(f"Sources: {len(stats.get('sources', {}))}")
    print(f"Platforms: {len(stats.get('platforms', {}))}")