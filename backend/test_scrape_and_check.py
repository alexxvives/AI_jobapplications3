#!/usr/bin/env python3

import sys
sys.path.append('/mnt/c/Users/alexx/AI_agent_jobApplications3')
from backend.services.job_scraping.scrapers.lever_scraper import LeverScraper
from backend.database import SessionLocal
from backend.models import Job

def scrape_and_test():
    # Run a scraper test to get jobs with descriptions
    scraper = LeverScraper()

    # Test company data
    company_data = {
        'name': 'ActiveCampaign',
        'company_id': 'activecampaign',
        'url': 'https://jobs.lever.co/activecampaign'
    }

    print('🔍 Scraping ActiveCampaign jobs to populate database...')
    result = scraper.try_lever_api(company_data)

    if result['success']:
        jobs = result['jobs']
        print(f'✅ Scraped {len(jobs)} jobs from Lever API')
        
        # Store jobs to database
        db = SessionLocal()
        try:
            for job_data in jobs:
                existing_job = db.query(Job).filter(Job.link == job_data['link']).first()
                if not existing_job:
                    new_job = Job(
                        title=job_data['title'],
                        company=job_data['company'],
                        location=job_data.get('location', ''),
                        description=job_data.get('description', ''),
                        link=job_data['link'],
                        platform='lever'
                    )
                    db.add(new_job)
            
            db.commit()
            print('✅ Jobs saved to database')
            
            # Now check for jobs with descriptions
            jobs_with_desc = db.query(Job).filter(Job.description.isnot(None), Job.description != '').limit(3).all()
            print(f'📝 Found {len(jobs_with_desc)} jobs with descriptions:')
            
            for job in jobs_with_desc:
                print(f'- {job.title} at {job.company}')
                print(f'  Link: {job.link}')
                print(f'  Description length: {len(job.description)} chars')
                if job.description:
                    preview = job.description[:200] + '...' if len(job.description) > 200 else job.description
                    print(f'  Preview: {preview}')
                print()
        
        finally:
            db.close()
            
    else:
        print('❌ Failed to scrape jobs:', result)

if __name__ == '__main__':
    scrape_and_test()