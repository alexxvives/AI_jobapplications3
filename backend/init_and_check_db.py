#!/usr/bin/env python3

import sys
sys.path.append('/mnt/c/Users/alexx/AI_agent_jobApplications3')
from backend.database import SessionLocal, engine
from backend.models import Base, Job
from sqlalchemy import func

def init_and_check_db():
    # Create all tables
    print('🔧 Creating database tables...')
    Base.metadata.create_all(bind=engine)
    print('✅ Database tables created/verified')
    
    db = SessionLocal()
    try:
        # Check if we have any jobs with descriptions
        jobs_with_desc = db.query(Job).filter(Job.description.isnot(None), Job.description != '').limit(5).all()
        
        print('\n📊 Jobs with descriptions in database:')
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
        
        print(f'\n📈 Database stats:')
        print(f'Total jobs: {total_jobs}')
        print(f'Jobs with descriptions: {jobs_with_desc_count}')
        
        # Show a sample of job URLs for testing
        print(f'\n🔗 Sample job URLs for testing:')
        sample_jobs = db.query(Job).limit(3).all()
        for job in sample_jobs:
            print(f'- {job.title} at {job.company}: {job.link}')
        
    finally:
        db.close()

if __name__ == '__main__':
    init_and_check_db()