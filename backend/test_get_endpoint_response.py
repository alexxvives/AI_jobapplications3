#!/usr/bin/env python3

import requests

def test_get_endpoint():
    """Test what the GET endpoint actually returns"""
    
    try:
        # Test the GET endpoint (no auth required for testing)
        response = requests.get("http://localhost:8000/user/profiles", params={"user_id": 1})
        
        if response.status_code == 200:
            profiles = response.json()["profiles"]
            if profiles:
                profile = profiles[0]  # Get first profile
                
                print("📡 GET endpoint response structure:")
                print("=" * 50)
                
                # Check personal_information structure
                personal_info = profile.get('personal_information', {})
                print(f"Personal Information exists: {bool(personal_info)}")
                
                if personal_info:
                    basic_info = personal_info.get('basic_information', {})
                    contact_info = personal_info.get('contact_information', {})
                    address_info = personal_info.get('address', {})
                    
                    print(f"\nBasic Information: {basic_info}")
                    print(f"Contact Information: {contact_info}")
                    print(f"Address Information: {address_info}")
                    
                    # Check where citizenship is located
                    citizenship_locations = []
                    if personal_info.get('citizenship'):
                        citizenship_locations.append(f"personal_information.citizenship: '{personal_info['citizenship']}'")
                    if address_info.get('citizenship'):
                        citizenship_locations.append(f"address.citizenship: '{address_info['citizenship']}'")
                    if basic_info.get('citizenship'):
                        citizenship_locations.append(f"basic_information.citizenship: '{basic_info['citizenship']}'")
                    
                    print(f"\n🔍 Citizenship found in:")
                    if citizenship_locations:
                        for location in citizenship_locations:
                            print(f"  ✅ {location}")
                    else:
                        print(f"  ❌ No citizenship field found anywhere!")
                        
                    # Check gender too
                    gender_locations = []
                    if personal_info.get('gender'):
                        gender_locations.append(f"personal_information.gender: '{personal_info['gender']}'")
                    if basic_info.get('gender'):
                        gender_locations.append(f"basic_information.gender: '{basic_info['gender']}'")
                    
                    print(f"\n🔍 Gender found in:")
                    if gender_locations:
                        for location in gender_locations:
                            print(f"  ✅ {location}")
                    else:
                        print(f"  ❌ No gender field found!")
                
            else:
                print("❌ No profiles found")
        else:
            print(f"❌ GET request failed: {response.status_code}")
            print(response.text)
    
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    test_get_endpoint()