#!/usr/bin/env python3

import sys
sys.path.append('/mnt/c/Users/alexx/AI_agent_jobApplications3')
from backend.database import SessionLocal
from backend.models import Profile

def test_all_profile_fields():
    """Test that all profile fields persist correctly"""
    
    db = SessionLocal()
    try:
        # Get profile ID 3
        profile = db.query(Profile).filter(Profile.id == 3).first()
        
        if not profile:
            print("❌ Profile ID 3 not found")
            return
        
        print("📊 Testing All Profile Fields for Persistence:")
        print("=" * 60)
        
        # Test basic fields
        fields_to_test = [
            ("Title", profile.title),
            ("Full Name", profile.full_name),
            ("Email", profile.email),
            ("Phone", profile.phone), 
            ("Gender", profile.gender),
            ("Address", profile.address),
            ("City", profile.city),
            ("State", profile.state),
            ("Zip Code", profile.zip_code),
            ("Country", profile.country),
            ("Citizenship", profile.citizenship),
            ("Updated At", profile.updated_at)
        ]
        
        for field_name, field_value in fields_to_test:
            status = "✅" if field_value else "❌"
            print(f"{status} {field_name:15}: {field_value}")
        
        print("\n📋 JSON Fields:")
        json_fields = [
            ("Work Experience", profile.work_experience),
            ("Education", profile.education),
            ("Skills", profile.skills),
            ("Languages", profile.languages),
            ("Job Preferences", profile.job_preferences),
            ("Achievements", profile.achievements),
            ("Certificates", profile.certificates)
        ]
        
        for field_name, field_value in json_fields:
            count = len(field_value) if field_value else 0
            status = "✅" if field_value else "❌"
            print(f"{status} {field_name:15}: {count} items")
        
        # Summary
        total_basic_fields = len([v for _, v in fields_to_test if v])
        total_json_fields = len([v for _, v in json_fields if v])
        
        print(f"\n📈 Summary:")
        print(f"Basic fields populated: {total_basic_fields}/{len(fields_to_test)}")
        print(f"JSON fields populated: {total_json_fields}/{len(json_fields)}")
        
        if profile.updated_at:
            print(f"✅ Profile has been updated: {profile.updated_at}")
        else:
            print(f"❌ Profile has never been updated")
    
    finally:
        db.close()

if __name__ == '__main__':
    test_all_profile_fields()