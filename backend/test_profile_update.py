#!/usr/bin/env python3

import requests
import json

def test_profile_update():
    """Test the new profile update endpoint"""
    
    # First, get an existing profile to test with
    print("🔍 Getting existing profile...")
    
    try:
        # Get profiles list (using dev endpoint with no auth)
        response = requests.get("http://localhost:8000/user/profiles", params={"user_id": 1})
        
        if response.status_code != 200:
            print(f"❌ Failed to get profiles: {response.status_code}")
            print(response.text)
            return
        
        profiles = response.json()["profiles"]
        
        if not profiles:
            print("❌ No profiles found in database")
            return
        
        # Get the first profile
        profile = profiles[0]
        profile_id = profile["id"]
        print(f"✅ Found profile: {profile['title']} (ID: {profile_id})")
        print(f"Current name: {profile.get('full_name', 'No name')}")
        print(f"Current email: {profile.get('email', 'No email')}")
        
        # Test update data
        test_update_data = {
            "title": "Updated Test Profile",
            "personal_information": {
                "basic_information": {
                    "first_name": "Jane",
                    "last_name": "Smith"
                },
                "contact_information": {
                    "email": "jane.smith@example.com",
                    "telephone": "555-9876"
                },
                "address": {
                    "address": "456 New Street",
                    "city": "San Francisco",
                    "state": "CA",
                    "zip_code": "94102",
                    "country": "USA"
                }
            },
            "skills": ["Python", "React", "Machine Learning", "Updated Skills"],
            "work_experience": [
                {
                    "title": "Updated Job Title", 
                    "company": "Updated Company",
                    "start_date": "2023-01",
                    "end_date": "Present",
                    "description": "Updated job description with new responsibilities"
                }
            ]
        }
        
        print(f"\n🧪 Testing profile update...")
        print(f"Update data: {json.dumps(test_update_data, indent=2)}")
        
        # Make update request (this will fail without auth, but we'll see the structure)
        update_response = requests.put(
            f"http://localhost:8000/user/profile/{profile_id}",
            json=test_update_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"\n📡 Update response status: {update_response.status_code}")
        
        if update_response.status_code == 401:
            print("⚠️ Authentication required (expected for PUT endpoint)")
            print("✅ PUT endpoint exists and requires authentication correctly")
        elif update_response.status_code == 200:
            result = update_response.json()
            print("✅ Profile updated successfully!")
            print(f"Updated title: {result.get('title')}")
            print(f"Updated name: {result.get('personal_information', {}).get('basic_information', {}).get('first_name')} {result.get('personal_information', {}).get('basic_information', {}).get('last_name')}")
            print(f"Updated email: {result.get('personal_information', {}).get('contact_information', {}).get('email')}")
        else:
            print(f"❌ Unexpected status: {update_response.status_code}")
            print(f"Response: {update_response.text}")
    
    except requests.exceptions.RequestException as e:
        print(f"❌ Request error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == '__main__':
    test_profile_update()