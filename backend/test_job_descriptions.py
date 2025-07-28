#!/usr/bin/env python3

import sys
sys.path.append('/mnt/c/Users/alexx/AI_agent_jobApplications3')
from backend.database import SessionLocal
from backend.models import Job
from sqlalchemy import func

def check_job_descriptions():
    db = SessionLocal()
    try:
        # Check if we have any jobs with descriptions
        jobs_with_desc = db.query(Job).filter(Job.description.isnot(None), Job.description != '').limit(5).all()
        
        print('📊 Jobs with descriptions in database:')
        for job in jobs_with_desc:
            print(f'- {job.title} at {job.company}')
            print(f'  Link: {job.link}')
            desc_len = len(job.description) if job.description else 0
            print(f'  Description length: {desc_len} chars')
            if job.description:
                preview = job.description[:100] + '...' if len(job.description) > 100 else job.description
                print(f'  Description preview: {preview}')
            print()
        
        if not jobs_with_desc:
            print('❌ No jobs with descriptions found in database')
        
        # Count total jobs vs jobs with descriptions  
        total_jobs = db.query(func.count(Job.id)).scalar()
        jobs_with_desc_count = db.query(func.count(Job.id)).filter(Job.description.isnot(None), Job.description != '').scalar()
        
        print(f'📈 Database stats:')
        print(f'Total jobs: {total_jobs}')
        print(f'Jobs with descriptions: {jobs_with_desc_count}')
        
    finally:
        db.close()

if __name__ == '__main__':
    check_job_descriptions()