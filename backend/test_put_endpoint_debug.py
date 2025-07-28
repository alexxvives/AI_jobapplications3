#!/usr/bin/env python3

import requests
import json

def test_put_endpoint_with_debug():
    """Test the PUT endpoint with detailed debugging"""
    
    # Test data to update profile ID 3
    test_update_data = {
        "title": "Updated Test Profile", 
        "personal_information": {
            "basic_information": {
                "first_name": "Dominik",
                "last_name": "Nasilowski"
            },
            "contact_information": {
                "email": "d.nasilowski@columbia.edu",
                "telephone": "(555) 954-7355"
            },
            "address": {
                "address": "123 Main St",
                "city": "New York", 
                "state": "NY",
                "zip_code": "10001",
                "country": "USA"
            },
            "gender": "Male",
            "citizenship": "US Citizen"
        }
    }
    
    print("🧪 Testing PUT endpoint with gender update...")
    print(f"📋 Update data: {json.dumps(test_update_data, indent=2)}")
    
    # Try to make the PUT request (will fail due to auth, but we can see the endpoint structure)
    try:
        response = requests.put(
            "http://localhost:8000/user/profile/3",
            json=test_update_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"📡 Response Status: {response.status_code}")
        print(f"📄 Response Body: {response.text}")
        
        if response.status_code == 401 or response.status_code == 403:
            print("✅ PUT endpoint exists and requires authentication (expected)")
            print("🔍 The issue might be in the frontend authentication or data format")
        elif response.status_code == 422:
            print("⚠️ Validation error - data format issue")
        else:
            print(f"❓ Unexpected status code: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Request failed: {e}")

if __name__ == '__main__':
    test_put_endpoint_with_debug()