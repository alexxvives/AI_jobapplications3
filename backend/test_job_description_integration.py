#!/usr/bin/env python3

import sys
import json
sys.path.append('/mnt/c/Users/alexx/AI_agent_jobApplications3')
from backend.database import SessionLocal
from backend.models import Job

def test_job_description_integration():
    """Test the enhanced job description integration"""
    
    db = SessionLocal()
    try:
        # Get a job with description from database
        job_with_desc = db.query(Job).filter(Job.description.isnot(None), Job.description != '').first()
        
        if not job_with_desc:
            print('❌ No jobs with descriptions found in database')
            return
        
        print(f'🎯 Testing job description integration with:')
        print(f'Title: {job_with_desc.title}')
        print(f'Company: {job_with_desc.company}')
        print(f'Link: {job_with_desc.link}')
        print(f'Description length: {len(job_with_desc.description)} chars')
        print(f'Description preview: {job_with_desc.description[:200]}...')
        print()
        
        # Test URL cleaning logic that was implemented
        job_url = job_with_desc.link
        clean_job_url = job_url.replace('/apply', '').rstrip('/')
        print(f'🔧 URL cleaning test:')
        print(f'Original URL: {job_url}')
        print(f'Cleaned URL: {clean_job_url}')
        print()
        
        # Test exact match search (this is what the backend does)
        exact_match = db.query(Job).filter(Job.link == clean_job_url).first()
        print(f'🔍 Database search test:')
        print(f'Exact match found: {exact_match is not None}')
        
        if not exact_match:
            # Test partial match (fallback logic)
            partial_match = db.query(Job).filter(Job.link.like(f'%{clean_job_url.split("/")[-1]}%')).first()
            print(f'Partial match found: {partial_match is not None}')
        
        print()
        
        # Show what the enhanced prompt would receive
        print(f'📝 Enhanced Ollama prompt would receive:')
        print(f'Job Title: {job_with_desc.title}')
        print(f'Company: {job_with_desc.company}')
        print(f'Job Description: {job_with_desc.description[:300]}...')
        print()
        
        print('✅ Job description integration is ready for testing!')
        print(f'💡 To test live: Start automation with this job URL: {job_with_desc.link}')
        
    finally:
        db.close()

if __name__ == '__main__':
    test_job_description_integration()