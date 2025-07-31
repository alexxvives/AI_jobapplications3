#!/usr/bin/env python3
"""
Migration script to convert languages from simple strings to objects with proficiency.

Old format: ['English', 'Spanish']
New format: [{'name': 'English', 'proficiency': ''}, {'name': 'Spanish', 'proficiency': ''}]
"""

import sys
import json
import os
sys.path.append('/mnt/c/Users/alexx/AI_agent_jobApplications3/backend')
from database import SessionLocal
from models import Profile

def migrate_languages_format():
    """Convert all language fields from string arrays to object arrays"""
    
    db = SessionLocal()
    try:
        # Get all profiles with languages
        profiles = db.query(Profile).all()
        updated_count = 0
        
        print("🔄 Starting languages format migration...")
        
        for profile in profiles:
            if profile.languages:
                print(f"\n📋 Profile {profile.id}: {profile.title}")
                print(f"   Current languages: {profile.languages}")
                
                # Check if migration is needed
                needs_migration = False
                if isinstance(profile.languages, list) and len(profile.languages) > 0:
                    # Check if first item is a string
                    if isinstance(profile.languages[0], str):
                        needs_migration = True
                
                if needs_migration:
                    # Convert strings to objects
                    new_languages = []
                    for lang in profile.languages:
                        if isinstance(lang, str):
                            new_languages.append({
                                'name': lang,
                                'proficiency': ''  # Default empty proficiency
                            })
                        else:
                            # Already in correct format
                            new_languages.append(lang)
                    
                    profile.languages = new_languages
                    updated_count += 1
                    
                    print(f"   ✅ Updated to: {profile.languages}")
                else:
                    print(f"   ⏭️  Already in correct format or empty")
        
        if updated_count > 0:
            print(f"\n💾 Committing changes for {updated_count} profiles...")
            db.commit()
            print("✅ Migration completed successfully!")
        else:
            print("\n✅ No profiles needed migration. All languages are already in correct format.")
            
        return updated_count
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        db.rollback()
        return 0
    finally:
        db.close()

def verify_migration():
    """Verify the migration worked correctly"""
    
    db = SessionLocal()
    try:
        profiles = db.query(Profile).all()
        
        print("\n🔍 Verifying migration...")
        for profile in profiles:
            if profile.languages:
                print(f"\nProfile {profile.id}: {profile.title}")
                print(f"Languages: {profile.languages}")
                
                # Verify format
                for i, lang in enumerate(profile.languages):
                    if isinstance(lang, str):
                        print(f"   ⚠️  Language {i+1} is still a string: {lang}")
                    elif isinstance(lang, dict):
                        name = lang.get('name', 'MISSING_NAME')
                        proficiency = lang.get('proficiency', '')
                        print(f"   ✅ Language {i+1}: {name} ({proficiency or 'No proficiency'})")
                    else:
                        print(f"   ❌ Language {i+1} has unexpected format: {type(lang)}")
        
        print("\n✅ Verification completed!")
        
    except Exception as e:
        print(f"❌ Verification failed: {e}")
    finally:
        db.close()

if __name__ == '__main__':
    print("🚀 Languages Format Migration Tool")
    print("=" * 50)
    
    # Run migration
    updated_count = migrate_languages_format()
    
    # Verify results
    verify_migration()
    
    print(f"\n🎉 Migration Summary:")
    print(f"   • Updated {updated_count} profiles")
    print(f"   • Languages now support proficiency levels")
    print(f"   • Backward compatibility maintained")