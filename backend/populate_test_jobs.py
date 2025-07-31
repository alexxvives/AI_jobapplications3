#!/usr/bin/env python3
"""
Populate the database with some test jobs for UI testing
"""

import sys
import json
import os
from datetime import datetime, timedelta
import random

sys.path.append('/mnt/c/Users/alexx/AI_agent_jobApplications3/backend')
from database import SessionLocal
from models import Job

def create_test_jobs():
    """Create diverse test jobs for UI testing"""
    
    test_jobs = [
        {
            'title': 'Senior Software Engineer',
            'company': 'Google',
            'location': 'Mountain View, CA',
            'description': 'We are looking for a Senior Software Engineer to join our core infrastructure team. You will work on building scalable systems that serve billions of users worldwide.',
            'link': 'https://careers.google.com/jobs/results/123456/',
            'platform': 'lever',
            'job_type': 'Full-time',
            'work_type': 'Hybrid',
            'remote_option': False,
            'salary_range': '$150,000 - $250,000'
        },
        {
            'title': 'Frontend Developer',
            'company': 'Airbnb',
            'location': 'San Francisco, CA',
            'description': 'Join our design systems team to build beautiful, accessible React components used across all Airbnb products. Work with designers and product managers to create delightful user experiences.',
            'link': 'https://careers.airbnb.com/positions/123',
            'platform': 'greenhouse',
            'job_type': 'Full-time',
            'work_type': 'Remote',
            'remote_option': True,
            'salary_range': '$120,000 - $180,000'
        },
        {
            'title': 'Data Scientist',
            'company': 'Netflix',
            'location': 'Los Gatos, CA',
            'description': 'Help us understand user behavior and improve our recommendation algorithms. Work with machine learning models and big data to drive product decisions.',
            'link': 'https://jobs.netflix.com/jobs/123456789',
            'platform': 'workday',
            'job_type': 'Full-time',
            'work_type': 'Hybrid',
            'remote_option': False,
            'salary_range': '$160,000 - $220,000'
        },
        {
            'title': 'DevOps Engineer',
            'company': 'Stripe',
            'location': 'Remote',
            'description': 'Build and maintain the infrastructure that powers global payments. Work with Kubernetes, AWS, and modern CI/CD pipelines.',
            'link': 'https://stripe.com/jobs/listing/devops-engineer',
            'platform': 'lever',
            'job_type': 'Full-time',
            'work_type': 'Remote',
            'remote_option': True,
            'salary_range': '$140,000 - $200,000'
        },
        {
            'title': 'Product Manager',
            'company': 'Slack',
            'location': 'New York, NY',
            'description': 'Lead product strategy for our enterprise messaging platform. Work cross-functionally with engineering, design, and sales teams.',
            'link': 'https://slack.com/careers/123',
            'platform': 'greenhouse',
            'job_type': 'Full-time',
            'work_type': 'Hybrid',
            'remote_option': False,
            'salary_range': '$130,000 - $190,000'
        },
        {
            'title': 'UX Designer',
            'company': 'Figma',
            'location': 'San Francisco, CA',
            'description': 'Design the future of collaborative design tools. Work on user research, prototyping, and creating intuitive interfaces for creative professionals.',
            'link': 'https://www.figma.com/careers/job/ux-designer',
            'platform': 'bamboohr',
            'job_type': 'Full-time',
            'work_type': 'Hybrid',
            'remote_option': False,
            'salary_range': '$110,000 - $160,000'
        },
        {
            'title': 'Software Engineering Intern',
            'company': 'Microsoft',
            'location': 'Redmond, WA',
            'description': 'Join our summer internship program and work on cutting-edge technology projects. Gain hands-on experience with cloud computing and AI.',
            'link': 'https://careers.microsoft.com/students/us/en/job/123',
            'platform': 'smartrecruiters',
            'job_type': 'Internship',
            'work_type': 'On-site',
            'remote_option': False,
            'salary_range': '$6,000 - $8,000/month'
        },
        {
            'title': 'Full Stack Developer',
            'company': 'Shopify',
            'location': 'Remote',
            'description': 'Build e-commerce solutions that empower millions of entrepreneurs worldwide. Work with Ruby on Rails, React, and GraphQL.',
            'link': 'https://www.shopify.com/careers/full-stack-developer',
            'platform': 'lever',
            'job_type': 'Full-time',
            'work_type': 'Remote',
            'remote_option': True,
            'salary_range': '$100,000 - $150,000'
        },
        {
            'title': 'Machine Learning Engineer',
            'company': 'OpenAI',
            'location': 'San Francisco, CA',
            'description': 'Research and develop next-generation AI systems. Work on large language models, computer vision, and reinforcement learning.',
            'link': 'https://openai.com/careers/machine-learning-engineer',
            'platform': 'greenhouse',
            'job_type': 'Full-time',
            'work_type': 'Hybrid',
            'remote_option': False,
            'salary_range': '$200,000 - $300,000'
        },
        {
            'title': 'Marketing Manager',
            'company': 'Notion',
            'location': 'Remote',
            'description': 'Drive growth marketing initiatives for our productivity platform. Develop campaigns, analyze metrics, and optimize user acquisition.',
            'link': 'https://www.notion.so/careers/marketing-manager',
            'platform': 'workday',
            'job_type': 'Full-time',
            'work_type': 'Remote',
            'remote_option': True,
            'salary_range': '$90,000 - $130,000'
        }
    ]
    
    db = SessionLocal()
    try:
        print("🚀 Creating test jobs for UI testing...")
        
        # Clear existing test jobs (optional)
        # db.query(Job).delete()
        
        created_count = 0
        for job_data in test_jobs:
            # Check if job already exists
            existing = db.query(Job).filter(
                Job.title == job_data['title'],
                Job.company == job_data['company']
            ).first()
            
            if not existing:
                # Add random fetched_at date (last 30 days)
                days_ago = random.randint(1, 30)
                fetched_at = datetime.utcnow() - timedelta(days=days_ago)
                
                job = Job(
                    title=job_data['title'],
                    company=job_data['company'],
                    location=job_data['location'],
                    description=job_data['description'],
                    link=job_data['link'],
                    platform=job_data['platform'],
                    job_type=job_data['job_type'],
                    work_type=job_data['work_type'],
                    remote_option=job_data['remote_option'],
                    salary_range=job_data['salary_range'],
                    fetched_at=fetched_at
                )
                
                db.add(job)
                created_count += 1
                print(f"✅ Added: {job_data['title']} at {job_data['company']}")
            else:
                print(f"⏭️  Skipped: {job_data['title']} at {job_data['company']} (already exists)")
        
        if created_count > 0:
            db.commit()
            print(f"\n🎉 Successfully created {created_count} test jobs!")
        else:
            print(f"\n✅ All test jobs already exist in database")
            
        return created_count
        
    except Exception as e:
        print(f"❌ Error creating test jobs: {e}")
        db.rollback()
        return 0
    finally:
        db.close()

def show_job_stats():
    """Show current job statistics"""
    db = SessionLocal()
    try:
        total_jobs = db.query(Job).count()
        platforms = db.query(Job.platform).distinct().all()
        
        print(f"\n📊 Database Statistics:")
        print(f"   • Total jobs: {total_jobs}")
        print(f"   • Platforms: {[p[0] for p in platforms]}")
        
        # Count by platform
        for platform in platforms:
            count = db.query(Job).filter(Job.platform == platform[0]).count()
            print(f"   • {platform[0]}: {count} jobs")
        
    except Exception as e:
        print(f"❌ Error getting stats: {e}")
    finally:
        db.close()

if __name__ == '__main__':
    print("🎯 Test Job Population Tool")
    print("=" * 50)
    
    # Create test jobs
    created_count = create_test_jobs()
    
    # Show stats
    show_job_stats()
    
    print(f"\n✨ Ready for UI testing!")
    print(f"   • Visit http://localhost:3000/jobs-modern to see the new interface")
    print(f"   • Compare with http://localhost:3000/jobs for the original")