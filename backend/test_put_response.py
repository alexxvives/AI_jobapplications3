#!/usr/bin/env python3

import sys
import json
import os
sys.path.append('/mnt/c/Users/alexx/AI_agent_jobApplications3')
from backend.database import SessionLocal
from backend.models import Profile

def test_put_response_format():
    """Test what the PUT endpoint should return"""
    
    db = SessionLocal()
    try:
        profile = db.query(Profile).filter(Profile.id == 3).first()
        
        if not profile:
            print("❌ Profile not found")
            return
        
        # Simulate the PUT endpoint response format
        put_response = {
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
            "has_resume": bool(profile.resume_path and os.path.exists(profile.resume_path) if profile.resume_path else False),
            "updated_at": profile.updated_at.isoformat() if profile.updated_at else None
        }
        
        print("🔍 PUT endpoint should return:")
        print(f"Citizenship in response: '{put_response['personal_information']['citizenship']}'")
        print(f"Gender in response: '{put_response['personal_information']['basic_information']['gender']}'")
        print(f"Country in response: '{put_response['personal_information']['address']['country']}'")
        print()
        
        print("📋 Response structure for citizenship:")
        print("response.personal_information.citizenship =", f"'{put_response['personal_information']['citizenship']}'")
        
        # Check if citizenship path is correct
        if put_response['personal_information']['citizenship']:
            print("✅ Citizenship will be in the response at the correct path")
        else:
            print("❌ Citizenship is missing from response")
    
    finally:
        db.close()

if __name__ == '__main__':
    test_put_response_format()