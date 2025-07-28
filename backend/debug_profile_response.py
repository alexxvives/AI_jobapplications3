#!/usr/bin/env python3

import sys
sys.path.append('/mnt/c/Users/alexx/AI_agent_jobApplications3')
from backend.database import SessionLocal
from backend.models import Profile

def debug_profile_response_format():
    """Debug what the actual profile response should look like"""
    
    db = SessionLocal()
    try:
        profile = db.query(Profile).filter(Profile.id == 3).first()
        
        if not profile:
            print("❌ Profile not found")
            return
        
        # Simulate the exact response format from get_user_profile_by_id
        response_format = {
            "id": profile.id,
            "title": profile.title,
            "personal_information": {
                "basic_information": {
                    "first_name": profile.full_name.split()[0] if profile.full_name else "",
                    "last_name": " ".join(profile.full_name.split()[1:]) if profile.full_name and len(profile.full_name.split()) > 1 else "",
                    "gender": profile.gender or ""
                },
                "contact_information": {
                    "email": profile.email or "",
                    "telephone": profile.phone or ""
                },
                "address": {
                    "address": profile.address or "",
                    "city": profile.city or "",
                    "state": profile.state or "",
                    "zip_code": profile.zip_code or "",
                    "country": profile.country or ""
                },
                "citizenship": profile.citizenship or ""
            },
            "work_experience": profile.work_experience or [],
            "education": profile.education or [],
            "skills": profile.skills or [],
            "languages": profile.languages or [],
            "job_preferences": profile.job_preferences or {},
            "achievements": profile.achievements or [],
            "certificates": profile.certificates or [],
            "resume_path": profile.resume_path,
            "has_resume": bool(profile.resume_path)
        }
        
        print("📋 Current profile database values:")
        print(f"Gender: '{profile.gender}'")
        print(f"Citizenship: '{profile.citizenship}'")
        print(f"Country: '{profile.country}'")
        print()
        
        print("📡 GET endpoint response format:")
        personal_info = response_format["personal_information"]
        print(f"✅ basic_information.gender: '{personal_info['basic_information']['gender']}'")
        print(f"✅ personal_information.citizenship: '{personal_info['citizenship']}'")
        print(f"✅ address.country: '{personal_info['address']['country']}'")
        print()
        
        print("🔍 Expected frontend structure:")
        print("personal_information:")
        print("  basic_information:")
        print(f"    gender: '{personal_info['basic_information']['gender']}'")
        print("  address:")
        print(f"    country: '{personal_info['address']['country']}'")
        print(f"  citizenship: '{personal_info['citizenship']}'")
    
    finally:
        db.close()

if __name__ == '__main__':
    debug_profile_response_format()