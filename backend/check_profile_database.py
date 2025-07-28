#!/usr/bin/env python3

import sys
sys.path.append('/mnt/c/Users/alexx/AI_agent_jobApplications3')
from backend.database import SessionLocal
from backend.models import Profile

def check_profile_in_database():
    """Check if profile ID 3 has the gender field saved in the database"""
    
    db = SessionLocal()
    try:
        # Get profile ID 3
        profile = db.query(Profile).filter(Profile.id == 3).first()
        
        if not profile:
            print("❌ Profile ID 3 not found in database")
            return
        
        print(f"📋 Profile ID 3 Database Contents:")
        print(f"Title: {profile.title}")
        print(f"Full Name: {profile.full_name}")
        print(f"Email: {profile.email}")
        print(f"Phone: {profile.phone}")
        print(f"Gender: {profile.gender}")
        print(f"Address: {profile.address}")
        print(f"City: {profile.city}")
        print(f"State: {profile.state}")
        print(f"Zip Code: {profile.zip_code}")
        print(f"Country: {profile.country}")
        print(f"Citizenship: {profile.citizenship}")
        print(f"Created At: {profile.created_at}")
        print(f"Updated At: {profile.updated_at}")
        print()
        
        # Check JSON fields
        print(f"📊 JSON Fields:")
        print(f"Work Experience: {profile.work_experience}")
        print(f"Education: {profile.education}")
        print(f"Skills: {profile.skills}")
        print(f"Languages: {profile.languages}")
        print(f"Job Preferences: {profile.job_preferences}")
        print(f"Achievements: {profile.achievements}")
        print(f"Certificates: {profile.certificates}")
        print()
        
        # Check if gender was actually saved
        if profile.gender:
            print(f"✅ Gender IS saved in database: '{profile.gender}'")
        else:
            print(f"❌ Gender is NOT saved in database (value: {repr(profile.gender)})")
        
        # Check last update time
        if profile.updated_at:
            print(f"🕒 Last updated: {profile.updated_at}")
        else:
            print(f"⚠️ No update timestamp recorded")
    
    finally:
        db.close()

if __name__ == '__main__':
    check_profile_in_database()