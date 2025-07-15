#!/usr/bin/env python3
"""
Test script to show the exact data being sent to Ollama
"""

import requests
import json

# This is what we expect a REAL user profile to look like
sample_real_profile = {
    "id": 3,
    "title": "My Profile",
    "personal_information": {
        "basic_information": {
            "first_name": "Dominik",
            "last_name": "Nasilowski"
        },
        "contact_information": {
            "email": "dominik.nasilowski@example.com",
            "telephone": "+1-555-123-4567"
        },
        "address": {
            "city": "New York",
            "state": "NY",
            "country": "USA"
        }
    },
    "work_experience": [
        {
            "title": "Software Engineer",
            "company": "Tech Corp",
            "start_date": "2022-01",
            "end_date": None,
            "description": "Developed full-stack web applications"
        }
    ],
    "education": [
        {
            "degree": "Bachelor of Science in Computer Science",
            "institution": "University of Technology",
            "year": "2021"
        }
    ],
    "skills": ["Python", "JavaScript", "React", "Node.js"],
    "job_preferences": {
        "desired_salary": "80000-120000",
        "location_preference": "Remote",
        "linkedin_link": "https://linkedin.com/in/dominik-nasilowski"
    }
}

# This is what we expect a clean Lever form to look like (simplified)
sample_lever_form = {
    "platform": "lever",
    "fields": [
        {
            "id": "",
            "name": "name",
            "type": "text",
            "label": "Full name✱"
        },
        {
            "id": "",
            "name": "email", 
            "type": "email",
            "label": "Email✱"
        },
        {
            "id": "location-input",
            "name": "location",
            "type": "text", 
            "label": "Current location"
        },
        {
            "id": "",
            "name": "opportunityLocationId",
            "type": "select-one",
            "label": "Which location are you applying for?",
            "options": [
                {"value": "", "text": "Select a location"},
                {"value": "remote", "text": "Remote"},
                {"value": "nyc", "text": "New York, NY"},
                {"value": "sf", "text": "San Francisco, CA"},
                {"value": "la", "text": "Los Angeles, CA"}
            ]
        },
        {
            "id": "",
            "name": "cards[fa18415e-6b2a-4e0e-aec7-3027e8b82fac][field0]",
            "type": "radio",
            "label": "Visa requirement question",
            "options": [
                {"value": "no", "text": "No visa required"},
                {"value": "yes", "text": "Yes, sponsorship is required"}
            ]
        },
        {
            "id": "",
            "name": "cards[1f9c12d3-942b-4c97-a06d-0f20434dd5fa][field0]",
            "type": "select-one",
            "label": "Language proficiency",
            "options": [
                {"value": "", "text": "Select language"},
                {"value": "english", "text": "English"},
                {"value": "spanish", "text": "Spanish"},
                {"value": "french", "text": "French"},
                {"value": "german", "text": "German"}
            ]
        }
    ]
}

def test_ollama_analysis():
    """Test the backend Ollama analysis with realistic data"""
    
    print("🧠 Testing Ollama Analysis with Realistic Data")
    print("=" * 60)
    
    print("\n📋 PROFILE DATA BEING SENT:")
    print(json.dumps(sample_real_profile, indent=2))
    
    print("\n📝 FORM STRUCTURE BEING SENT:")
    print(json.dumps(sample_lever_form, indent=2))
    
    print("\n🚀 Calling Backend API...")
    
    try:
        response = requests.post(
            'http://localhost:8000/ai/analyze-form',
            json={
                'formStructure': sample_lever_form,
                'userProfile': sample_real_profile
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("\n✅ SUCCESS! Ollama Response:")
            print(json.dumps(result, indent=2))
        else:
            print(f"\n❌ ERROR: HTTP {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"\n❌ EXCEPTION: {e}")

if __name__ == "__main__":
    test_ollama_analysis()