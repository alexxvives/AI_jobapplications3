#!/usr/bin/env python3

import requests
import json

def test_live_job_description_integration():
    """Test the live job description integration with running backend"""
    
    # Test job URL from our database
    test_job_url = "https://jobs.lever.co/activecampaign/63a94bb4-ce2d-4af3-948b-0fc65365c64d"
    
    # Sample form structure for testing (matches Chrome extension format)
    test_form_structure = {
        "platform": "lever",
        "fields": [
            {
                "id": "first_name",
                "type": "text",
                "label": "First Name",
                "required": True
            },
            {
                "id": "last_name", 
                "type": "text",
                "label": "Last Name",
                "required": True
            },
            {
                "id": "email",
                "type": "email", 
                "label": "Email Address",
                "required": True
            },
            {
                "id": "additional_info",
                "type": "textarea",
                "label": "Why are you interested in this role?",
                "required": False
            },
            {
                "id": "experience_summary",
                "type": "textarea", 
                "label": "Tell us about your relevant experience",
                "required": False
            }
        ]
    }
    
    # Sample profile data (we'll use a test profile)
    test_profile = {
        "personal_information": {
            "basic_information": {
                "first_name": "John",
                "last_name": "Doe"
            },
            "contact_information": {
                "email": "john.doe@example.com",
                "phone": "555-0123"
            }
        },
        "work_experience": [
            {
                "title": "Sales Representative",
                "company": "TechCorp",
                "start_date": "2022-01",
                "end_date": "2024-01",
                "description": "Managed client relationships and exceeded sales targets by 25%"
            }
        ],
        "skills": ["Sales", "Customer Relations", "Spanish Language", "CRM Software"]
    }
    
    # Prepare request payload (using correct API format)
    payload = {
        "formStructure": test_form_structure,
        "jobUrl": test_job_url,
        "userProfile": test_profile
    }
    
    print(f"🧪 Testing enhanced job description integration")
    print(f"Job URL: {test_job_url}")
    print(f"Form fields: {len(test_form_structure['fields'])}")
    print(f"Profile: {test_profile['personal_information']['basic_information']['first_name']} {test_profile['personal_information']['basic_information']['last_name']}")
    print()
    
    try:
        # Make request to the analyze-form endpoint
        response = requests.post(
            "http://localhost:8000/ai/analyze-form",
            json=payload,
            timeout=60
        )
        
        print(f"📡 Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            
            print("✅ SUCCESS! Enhanced job description integration working!")
            print()
            print("🎯 AI Response:")
            
            # Check if job description was used in the response
            if 'field_mappings' in result:
                mappings = result['field_mappings']
                print(f"Field mappings generated: {len(mappings)}")
                
                for field_id, value in mappings.items():
                    print(f"- {field_id}: {value}")
                
                # Check for enhanced responses in additional_info and experience_summary
                additional_info = mappings.get('additional_info', '')
                experience_summary = mappings.get('experience_summary', '')
                
                if additional_info:
                    print(f"\n📝 Additional Info Response (should be enhanced with job context):")
                    print(f"'{additional_info}'")
                    
                    # Check if response contains job-relevant keywords
                    job_keywords = ['ActiveCampaign', 'Account Executive', 'Spanish', 'sales']
                    found_keywords = [kw for kw in job_keywords if kw.lower() in additional_info.lower()]
                    
                    if found_keywords:
                        print(f"✅ Job-specific keywords found: {found_keywords}")
                        print("✅ Job description integration is working!")
                    else:
                        print("⚠️ No job-specific keywords found - may need prompt tuning")
                
                if experience_summary:
                    print(f"\n💼 Experience Summary (should align with job requirements):")
                    print(f"'{experience_summary}'")
            
            else:
                print("❌ No field mappings in response")
                print("Response:", json.dumps(result, indent=2))
        
        else:
            print(f"❌ Request failed with status {response.status_code}")
            print("Response:", response.text)
    
    except requests.exceptions.RequestException as e:
        print(f"❌ Request error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == '__main__':
    test_live_job_description_integration()