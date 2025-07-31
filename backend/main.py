from fastapi import FastAPI, Depends, HTTPException, status, Query, File, UploadFile, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import uvicorn
import os
import time
import json
import subprocess
import requests
from datetime import timedelta
from pydantic import BaseModel

# Import our modules
from database import SessionLocal, engine, get_db
from models import Base, Job, User, Profile
from schemas import JobResult, UserCreate, UserResponse, ProfileResponse
# from services.job_scraping.scrapers import JobScraper  # TODO: Update when needed
from agent_orchestrator import AgentOrchestrator
from company_stats import get_comprehensive_stats, get_simple_job_stats_by_source
from automation_service import automator
from job_automation_service import automation_service
from auth import (
    authenticate_user, create_access_token, get_password_hash, 
    get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
)

# Pydantic models for authentication
class UserSignup(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int

# Create FastAPI app
app = FastAPI(title="AI Job Application Assistant", version="1.0.0")

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for Chrome extension resume upload - TEST_ID: CORS_FIX_v7
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create all database tables
Base.metadata.create_all(bind=engine)

# Ollama management functions
def check_ollama_running():
    """Check if Ollama service is running"""
    try:
        response = requests.get('http://localhost:11434/api/tags', timeout=5)
        return response.status_code == 200
    except requests.exceptions.RequestException:
        return False

def start_ollama_service():
    """Start Ollama service if not running"""
    try:
        if check_ollama_running():
            print("🤖 Ollama is already running")
            return True
        
        print("🤖 Starting Ollama service...")
        
        # Try different Ollama paths
        ollama_paths = [
            "/home/alexxvives/ollama/bin/ollama",  # Custom installation path
            "/usr/local/bin/ollama",              # Standard Linux path
            "/opt/homebrew/bin/ollama",           # macOS Homebrew path
            "ollama"                              # System PATH
        ]
        
        for ollama_path in ollama_paths:
            try:
                # Start Ollama service in background
                print(f"🤖 Trying to start Ollama at: {ollama_path}")
                subprocess.Popen([ollama_path, "serve"], 
                               stdout=subprocess.DEVNULL, 
                               stderr=subprocess.DEVNULL,
                               start_new_session=True)
                
                # Wait for service to start (up to 15 seconds)
                for i in range(15):
                    time.sleep(1)
                    if check_ollama_running():
                        print(f"🤖 ✅ Ollama started successfully at {ollama_path}")
                        return True
                
                print(f"🤖 ❌ Ollama didn't start at {ollama_path}")
                
            except FileNotFoundError:
                print(f"🤖 ❌ Ollama not found at {ollama_path}")
                continue
            except Exception as e:
                print(f"🤖 ❌ Error starting Ollama at {ollama_path}: {e}")
                continue
        
        print("🤖 ❌ Failed to start Ollama service")
        return False
        
    except Exception as e:
        print(f"🤖 ❌ Error in start_ollama_service: {e}")
        return False

# Initialize components
agent_orchestrator = AgentOrchestrator()

@app.get("/")
def read_root():
    return {
        "message": "AI Job Application Assistant API",
        "version": "2.0.0-NO-BROWSER-AUTOMATION",
        "status": "running",
        "semantic_form_filler": "PURE JAVASCRIPT INJECTION ONLY",
        "browser_automation": "DISABLED"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# Authentication endpoints
@app.post("/auth/signup", response_model=Token)
async def signup(user_data: UserSignup, db: Session = Depends(get_db)):
    """Create a new user account"""
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user
        hashed_password = get_password_hash(user_data.password)
        new_user = User(
            email=user_data.email,
            hashed_password=hashed_password
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(new_user.id)}, expires_delta=access_token_expires
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create account: {str(e)}"
        )

@app.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return access token"""
    try:
        # Authenticate user
        user = authenticate_user(db, user_data.email, user_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id)}, expires_delta=access_token_expires
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(e)}"
        )

@app.get("/auth/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None
    }

# Job-related endpoints
@app.get("/jobs/search", response_model=List[JobResult])
def search_jobs(
    title: str = Query("", description="Job title to search for"),
    location: str = Query("", description="Location filter"),
    limit: int = Query(50, description="Maximum number of results"),
    db: Session = Depends(get_db)
):
    """Search for jobs in the database"""
    try:
        # Build query
        query = db.query(Job)
        
        # Filter by title if provided
        if title:
            query = query.filter(Job.title.ilike(f"%{title}%"))
        
        # Filter by location/country if provided
        if location:
            if location == "Remote":
                # Match actual remote jobs and continent-only locations
                from sqlalchemy import or_
                query = query.filter(or_(
                    Job.location.ilike("%Remote%"),
                    Job.location.ilike("%Asia%"),
                    Job.location.ilike("%Europe%"),
                    Job.location.ilike("%South East Asia%"),
                    Job.location.ilike("%North America%"),
                    Job.location.ilike("%South America%"),
                    Job.location.ilike("%Africa%"),
                    Job.location.ilike("%Oceania%")
                ))
            else:
                # For specific countries, match both the country name and common city patterns
                location_patterns = [
                    f"%{location}%",  # Direct country match
                    f"%{location.split()[0]}%" if len(location.split()) > 1 else f"%{location}%"  # First word for compound names
                ]
                
                # Add common city patterns for major countries
                if location == "United States":
                    location_patterns.extend(["%US%", "%USA%", "%New York%", "%San Francisco%", "%Los Angeles%", "%Chicago%"])
                elif location == "United Kingdom":
                    location_patterns.extend(["%UK%", "%London%", "%Manchester%", "%Edinburgh%"])
                elif location == "France":
                    location_patterns.extend(["%Paris%", "%Lyon%", "%Marseille%"])
                elif location == "Germany":
                    location_patterns.extend(["%Berlin%", "%Munich%", "%Hamburg%"])
                elif location == "Japan":
                    location_patterns.extend(["%Tokyo%", "%Osaka%", "%Kyoto%"])
                elif location == "Canada":
                    location_patterns.extend(["%Toronto%", "%Vancouver%", "%Montreal%"])
                elif location == "Australia":
                    location_patterns.extend(["%Sydney%", "%Melbourne%", "%Brisbane%"])
                elif location == "United Arab Emirates":
                    location_patterns.extend(["%UAE%", "%Dubai%", "%Abu Dhabi%"])
                
                # Build OR condition for all patterns  
                from sqlalchemy import or_
                location_conditions = [Job.location.ilike(pattern) for pattern in location_patterns]
                query = query.filter(or_(*location_conditions))
        
        # Order by most recent and limit results
        jobs = query.order_by(Job.fetched_at.desc()).limit(limit).all()
        
        # Convert to response format
        job_results = []
        for job in jobs:
            job_results.append(JobResult(
                id=job.id,
                title=job.title,
                company=job.company,
                location=job.location or "",
                description=job.description or "",
                link=job.link,
                platform=job.platform or "",
                job_type=job.job_type or "",
                work_type=job.work_type or "",
                experience_level=job.experience_level or "",
                salary_range=job.salary_range or "",
                remote_option=job.remote_option or False,
                scraped_at=job.fetched_at
            ))
        
        return job_results
        
    except Exception as e:
        print(f"Error searching jobs: {e}")
        raise HTTPException(status_code=500, detail=f"Job search failed: {str(e)}")

@app.post("/jobs/fetch")
def fetch_jobs_manual(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Manually trigger job fetching from all sources"""
    try:
        # For now, return current database stats since scraper is not implemented
        total_jobs = db.query(Job).count()
        
        return {
            "message": "Job fetching endpoint - scraper not yet implemented",
            "total_jobs": total_jobs,
            "sources": {"database": total_jobs},
            "note": "Currently showing existing jobs from database. Job scraping will be implemented in future version."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Job fetch check failed: {str(e)}")

@app.get("/jobs/test")
def test_jobs(db: Session = Depends(get_db)):
    """Test endpoint to check if jobs are available (no auth required)"""
    try:
        total_jobs = db.query(Job).count()
        sample_jobs = db.query(Job).limit(3).all()
        
        return {
            "total_jobs": total_jobs,
            "sample_jobs": [
                {
                    "id": job.id,
                    "title": job.title,
                    "company": job.company,
                    "location": job.location
                } for job in sample_jobs
            ]
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/jobs/stats")
def get_job_stats(db: Session = Depends(get_db)):
    """Get comprehensive job and company statistics"""
    return get_comprehensive_stats(db)

@app.get("/jobs/countries")
def get_job_countries(db: Session = Depends(get_db)):
    """Get all countries with job counts"""
    try:
        from sqlalchemy import func
        
        # Complete list of countries (Remote will be added separately at the top)
        all_countries = [
            "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", 
            "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", 
            "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", 
            "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde", 
            "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", 
            "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", 
            "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", 
            "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", 
            "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", 
            "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", 
            "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", 
            "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", 
            "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", 
            "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", 
            "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", 
            "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", 
            "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", 
            "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", 
            "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", 
            "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", 
            "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", 
            "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", 
            "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", 
            "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", 
            "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", 
            "Yemen", "Zambia", "Zimbabwe"
        ]
        
        # Get job counts by country from database
        location_counts = db.query(
            Job.location,
            func.count(Job.id).label('count')
        ).filter(
            Job.location.isnot(None),
            Job.location != ''
        ).group_by(Job.location).all()
        
        # Create country job count mapping
        country_counts = {}
        for location, count in location_counts:
            # Extract country from location
            if 'Remote' in location:
                country = 'Remote'
            elif ',' in location:
                country = location.split(',')[-1].strip()
            else:
                country = location.strip()
            
            # Map common variations to standard country names
            # Continents/regions without specific countries are classified as Remote
            country_mapping = {
                'US': 'United States',
                'USA': 'United States',
                'UK': 'United Kingdom',
                'UAE': 'United Arab Emirates',
                'United Arab Emirates': 'United Arab Emirates',
                'Korea': 'South Korea',
                'Republic of Korea': 'South Korea',
                # Continents/regions → Remote
                'Asia': 'Remote',
                'South East Asia': 'Remote', 
                'Europe': 'Remote',
                'North America': 'Remote',
                'South America': 'Remote',
                'Africa': 'Remote',
                'Oceania': 'Remote',
                # Cities → Countries
                'Dubai': 'United Arab Emirates',
                'Taiwan': 'Taiwan',
                'Taipei': 'Taiwan',
                'Paris': 'France',
                'London': 'United Kingdom',
                'Singapore': 'Singapore',
                'Hong Kong': 'China',
                'Tokyo': 'Japan',
                'Berlin': 'Germany',
                'Amsterdam': 'Netherlands',
                'Sydney': 'Australia',
                'Toronto': 'Canada',
                'Vancouver': 'Canada'
            }
            
            country = country_mapping.get(country, country)
            
            # Only add if it's a recognized country or Remote
            if country in all_countries or country == 'Remote':
                if country in country_counts:
                    country_counts[country] += count
                else:
                    country_counts[country] = count
        
        # Create final list with Remote at the top, then alphabetical countries
        countries = []
        
        # Add Remote first
        remote_count = country_counts.get('Remote', 0)
        countries.append({
            "country": "Remote",
            "count": remote_count,
            "has_jobs": remote_count > 0
        })
        
        # Add all other countries alphabetically
        for country in sorted(all_countries):
            job_count = country_counts.get(country, 0)
            countries.append({
                "country": country,
                "count": job_count,
                "has_jobs": job_count > 0
            })
        
        return {
            "countries": countries,
            "total_countries": len(countries),
            "countries_with_jobs": len([c for c in countries if c["has_jobs"]])
        }
        
    except Exception as e:
        return {"error": str(e), "countries": [], "total_countries": 0}

@app.get("/jobs/stats/simple")
def get_simple_job_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get simple job statistics by source (legacy endpoint)"""
    return get_simple_job_stats_by_source()

# Agent-related endpoints
@app.post("/agents/parse-resume")
async def parse_resume_endpoint(
    file: UploadFile = File(...),
    title: str = Query("Resume Profile", description="Profile title"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Parse resume using the parse_resume agent and save to database for authenticated user"""
    try:
        print(f"📝 DEBUG: Starting resume parsing for user {current_user.id}")
        print(f"📝 DEBUG: File: {file.filename}, Title: {title}")
        
        # Read file content once
        file_content = await file.read()
        print(f"📝 DEBUG: Read {len(file_content)} bytes from uploaded file")
        
        # Reset file for saving
        await file.seek(0)
        resume_file_path = await save_resume_file_permanently(file, current_user.id)
        print(f"📝 DEBUG: Saved resume to: {resume_file_path}")
        
        # Parse the resume from content
        print("📝 DEBUG: Calling agent_orchestrator.process_resume_content...")
        result = await agent_orchestrator.process_resume_content(file_content, file.filename, title)
        print(f"📝 DEBUG: Agent returned result with keys: {list(result.keys())}")
        
        # Save the parsed profile to database with resume file path
        profile_saved = await save_profile_to_database(result, title, resume_file_path, current_user.id, db)
        
        return {
            "success": True, 
            "profile": result,
            "profile_saved": profile_saved,
            "resume_saved": bool(resume_file_path)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume parsing failed: {str(e)}")

async def save_resume_file_permanently(file: UploadFile, user_id: int) -> str:
    """Save uploaded resume file permanently and return the file path"""
    try:
        # Create organized resume storage
        resumes_base_dir = os.path.join(os.getcwd(), "storage", "resumes")
        user_resumes_dir = os.path.join(resumes_base_dir, f"user_{user_id}")
        os.makedirs(user_resumes_dir, exist_ok=True)
        
        # Create unique filename
        file_extension = os.path.splitext(file.filename)[1] if file.filename else ".pdf"
        unique_filename = f"resume_{int(time.time())}_{file.filename}"
        file_path = os.path.join(user_resumes_dir, unique_filename)
        
        # Reset file pointer and save file
        await file.seek(0)
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Reset file pointer again for agent processing
        await file.seek(0)
        
        return file_path
        
    except Exception as e:
        print(f"Error saving resume file: {str(e)}")
        return ""

async def save_profile_to_database(profile_data: dict, title: str, resume_file_path: str = None, user_id: int = None, db: Session = None) -> bool:
    """Save parsed profile data to database"""
    try:
        print(f"DEBUG: Attempting to save profile for user_id: {user_id}")
        print(f"DEBUG: Profile data keys: {list(profile_data.keys())}")
        print(f"DEBUG: Personal info: {profile_data.get('personal_information', {})}")
        # Extract data from parsed profile (using correct structure)
        personal_info = profile_data.get("personal_information", {})
        
        # Handle both flat and nested structures for frontend compatibility
        if "address" in personal_info:
            # Nested structure from frontend forms
            basic_info = personal_info.get("basic_information", {})
            contact_info = personal_info.get("contact_information", {})
            address_info = personal_info.get("address", {})
            
            # Merge all personal info into flat structure
            personal_info = {
                **basic_info,
                **contact_info, 
                **address_info,
                **personal_info  # Keep any other fields at root level
            }
        
        # Handle full_name construction
        full_name = personal_info.get("full_name", "")
        if not full_name and personal_info.get("first_name") and personal_info.get("last_name"):
            full_name = f"{personal_info['first_name']} {personal_info['last_name']}".strip()
        
        # Create new profile using the flat structure from parse_resume
        new_profile = Profile(
            user_id=user_id,  # Associate profile with user
            title=title,
            full_name=full_name,
            email=personal_info.get("email", ""),
            phone=personal_info.get("phone", "") or personal_info.get("telephone", ""),
            address=personal_info.get("address", ""),
            city=personal_info.get("city", ""),
            state=personal_info.get("state", ""),
            zip_code=personal_info.get("zip_code", ""),
            country=personal_info.get("country", ""),
            gender=personal_info.get("gender", ""),
            citizenship=personal_info.get("citizenship", ""),
            work_experience=profile_data.get("work_experience", []),
            education=profile_data.get("education", []),
            skills=profile_data.get("skills", []),
            languages=profile_data.get("languages", []),
            job_preferences=profile_data.get("job_preferences", {}),
            achievements=profile_data.get("achievements", []),
            certificates=profile_data.get("certificates", []),
            resume_path=resume_file_path  # Optional resume file path (None if not saving files)
        )
        
        # Add to database
        db.add(new_profile)
        db.commit()
        db.refresh(new_profile)
        
        print(f"Profile saved to database with ID: {new_profile.id}")
        return True
        
    except Exception as e:
        print(f"Error saving profile to database: {str(e)}")
        db.rollback()
        return False

@app.post("/agents/generate-cover-letter")
async def generate_cover_letter_endpoint(request: Request):
    """Generate cover letter using the cover_letter agent"""
    try:
        data = await request.json()
        user_profile = data.get("user_profile", {})
        job_details = data.get("job_details", {})
        
        cover_letter = await agent_orchestrator.generate_cover_letter(user_profile, job_details)
        return {"success": True, "cover_letter": cover_letter}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cover letter generation failed: {str(e)}")

@app.post("/agents/generate-application-instructions")
async def generate_application_instructions(request: Request):
    """Generate job application instructions using the apply_to_jobs agent"""
    try:
        data = await request.json()
        user_profile = data.get("user_profile", {})
        job_details = data.get("job_details", {})
        
        instructions = await agent_orchestrator.generate_application_instructions(user_profile, job_details)
        return {"success": True, "instructions": instructions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Application instruction generation failed: {str(e)}")

# Automation-related endpoints
@app.post("/automation/start")
async def start_automation_session(
    request: Request, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a new job application automation session with profile selection"""
    try:
        print("DEBUG: /automation/start endpoint reached")
        
        # Start Ollama service if not running
        print("🤖 Checking Ollama service...")
        if not start_ollama_service():
            print("🤖 ⚠️ Warning: Ollama service failed to start - AI form filling may not work")
        
        print(f"DEBUG: Current user: {current_user.email if current_user else 'None'}")
        print(f"DEBUG: Current user ID: {current_user.id if current_user else 'None'}")
        data = await request.json()
        print(f"DEBUG: Request data: {data}")
        jobs = data.get("jobs", [])
        profile_id = data.get("profile_id")
        print(f"DEBUG: Looking for profile_id: {profile_id} for user_id: {current_user.id if current_user else 'None'}")
        
        if not profile_id:
            raise HTTPException(status_code=400, detail="profile_id is required")
        
        # Get the selected profile from database (only user's own profiles)
        profile = db.query(Profile).filter(
            Profile.id == profile_id,
            Profile.user_id == current_user.id
        ).first()
        
        print(f"DEBUG: Profile lookup result: {profile}")
        if profile:
            print(f"DEBUG: Found profile - ID: {profile.id}, Title: {profile.title}, User: {profile.user_id}")
        else:
            print(f"DEBUG: No profile found for profile_id={profile_id} and user_id={current_user.id}")
            # Let's see what profiles exist for this user
            user_profiles = db.query(Profile).filter(Profile.user_id == current_user.id).all()
            print(f"DEBUG: User {current_user.id} has {len(user_profiles)} profiles:")
            for p in user_profiles:
                print(f"DEBUG:   - Profile ID: {p.id}, Title: {p.title}")
        
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found or access denied")
        
        # Convert profile to the expected format
        user_profile = {
            "personal_information": {
                "basic_information": {
                    "first_name": profile.full_name.split()[0] if profile.full_name else "",
                    "last_name": " ".join(profile.full_name.split()[1:]) if profile.full_name and len(profile.full_name.split()) > 1 else ""
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
                }
            },
            "work_experience": profile.work_experience or [],
            "education": profile.education or [],
            "skills": profile.skills or [],
            "languages": profile.languages or [],
            "job_preferences": profile.job_preferences or {},
            "achievements": profile.achievements or [],
            "certificates": profile.certificates or []
        }
        
        # Use the resume file associated with this profile
        resume_file_path = profile.resume_path
        if not resume_file_path or not os.path.exists(resume_file_path):
            raise HTTPException(status_code=400, detail="No resume file found for this profile")
        
        # Create UploadFile object from saved resume
        with open(resume_file_path, "rb") as f:
            resume_content = f.read()
        
        from fastapi import UploadFile
        from io import BytesIO
        
        resume_file = UploadFile(
            filename=os.path.basename(resume_file_path),
            file=BytesIO(resume_content)
        )
        
        result = await automator.start_automation_session(jobs, user_profile, resume_file)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start automation: {str(e)}")

@app.post("/automation/{session_id}/next")
async def process_next_job(session_id: str):
    """Process the next job in automation session"""
    try:
        result = await automator.process_next_job(session_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process next job: {str(e)}")

@app.post("/automation/{session_id}/complete")
async def mark_job_complete(session_id: str, request: Request):
    """Mark current job as complete and move to next"""
    try:
        data = await request.json()
        status = data.get("status", "completed")  # completed, failed, skipped
        notes = data.get("notes", "")
        
        result = await automator.mark_job_complete(session_id, status, notes)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark job complete: {str(e)}")

@app.get("/automation/{session_id}/status")
async def get_automation_status(session_id: str):
    """Get current status of automation session"""
    try:
        result = await automator.get_session_status(session_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get automation status: {str(e)}")

@app.get("/automation/{session_id}/browser")
async def get_browser_status(session_id: str):
    """Get current browser automation status"""
    try:
        result = await automator.get_browser_status(session_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get browser status: {str(e)}")

@app.get("/automation/{session_id}/submission-status")
async def check_submission_status(session_id: str):
    """Check if current job has been submitted by user"""
    try:
        # Import submit monitor
        import sys
        import os
        sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'modules'))
        from job_application.submit_monitor import submit_monitor
        
        result = await submit_monitor.check_submission_status(session_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check submission status: {str(e)}")

@app.post("/automation/{session_id}/wait-for-submit") 
async def wait_for_submit(session_id: str, request: Request):
    """Wait for user to submit current job before proceeding"""
    try:
        data = await request.json()
        timeout = data.get("timeout", 300)  # 5 minute default
        
        # Import submit monitor
        import sys
        import os
        sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'modules'))
        from job_application.submit_monitor import submit_monitor
        
        result = await submit_monitor.start_monitoring(session_id, timeout)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to wait for submission: {str(e)}")

@app.post("/automation/{session_id}/mark-submitted")
async def mark_job_submitted(session_id: str):
    """Mark current job as submitted by user - allows next job to proceed"""
    try:
        result = await automator.mark_job_submitted(session_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark job as submitted: {str(e)}")

# New Automation Service Endpoints for Chrome Extension Integration
@app.post("/automation/sessions/create")
async def create_automation_session(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new automation session for Chrome extension"""
    try:
        print("🔥 NEW AUTOMATION ENDPOINT CALLED")
        data = await request.json()
        print(f"🔥 Request data: {data}")
        
        profile_id = data.get("profile_id")
        selected_jobs = data.get("selected_jobs", [])
        
        print(f"🔥 Profile ID: {profile_id}")
        print(f"🔥 Selected jobs count: {len(selected_jobs)}")
        print(f"🔥 Current user: {current_user.email}")
        
        if not profile_id:
            print("❌ Missing profile_id")
            raise HTTPException(status_code=400, detail="profile_id is required")
        
        if not selected_jobs:
            print("❌ Missing selected_jobs")
            raise HTTPException(status_code=400, detail="selected_jobs is required")
        
        # Verify profile belongs to user
        profile = db.query(Profile).filter(
            Profile.id == profile_id,
            Profile.user_id == current_user.id
        ).first()
        
        print(f"🔥 Profile found: {profile is not None}")
        
        if not profile:
            print("❌ Profile not found")
            raise HTTPException(status_code=404, detail="Profile not found")
        
        # Create automation session
        print("🔥 Creating automation session...")
        session_id = automation_service.create_session(
            user_id=current_user.id,
            profile_id=profile_id,
            selected_jobs=selected_jobs
        )
        
        print(f"✅ Session created: {session_id}")
        return {"success": True, "sessionId": session_id}
        
    except HTTPException as e:
        print(f"❌ HTTP Exception: {e.detail}")
        raise
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        print(f"❌ Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create automation session: {str(e)}")

@app.post("/automation/sessions/{session_id}/start")
async def start_automation_session_new(session_id: str):
    """Start the automation session - returns first job to process"""
    try:
        result = automation_service.start_session(session_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start session: {str(e)}")

@app.get("/automation/sessions/{session_id}/current-job")
async def get_current_job(session_id: str):
    """Get current job being processed in session"""
    try:
        result = automation_service.get_current_job(session_id)
        if result is None:
            raise HTTPException(status_code=404, detail="Session not found or completed")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get current job: {str(e)}")

@app.post("/automation/sessions/{session_id}/form-filled")
async def mark_form_filled(session_id: str, request: Request):
    """Mark current job form as filled, waiting for user submission"""
    try:
        data = await request.json()
        form_data = data.get("form_data", {})
        
        result = automation_service.mark_job_form_filled(session_id, form_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark form filled: {str(e)}")

@app.post("/automation/sessions/{session_id}/submit")
async def submit_job_application(session_id: str, request: Request):
    """Mark current job as submitted and move to next job"""
    try:
        data = await request.json()
        success = data.get("success", True)
        error_message = data.get("error_message")
        
        result = automation_service.mark_job_submitted(session_id, success, error_message)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit job application: {str(e)}")

@app.get("/automation/sessions/{session_id}/status")
async def get_session_status(session_id: str):
    """Get full automation session status"""
    try:
        result = automation_service.get_session_status(session_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get session status: {str(e)}")

@app.post("/automation/sessions/{session_id}/cancel")
async def cancel_automation_session(session_id: str):
    """Cancel an active automation session"""
    try:
        result = automation_service.cancel_session(session_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel session: {str(e)}")

@app.post("/automation/sessions/{session_id}/recover")
async def recover_automation_session(session_id: str):
    """Recover a failed automation session"""
    try:
        result = automation_service.recover_session(session_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to recover session: {str(e)}")

@app.post("/automation/sessions/{session_id}/skip")
async def skip_current_job(session_id: str, request: Request):
    """Skip the current job and move to the next one"""
    try:
        data = await request.json()
        reason = data.get("reason", "User skipped")
        
        result = automation_service.skip_current_job(session_id, reason)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to skip job: {str(e)}")

@app.get("/debug/profiles/{user_id}")
async def debug_get_profiles(user_id: int, db: Session = Depends(get_db)):
    """Debug endpoint to check profiles for a specific user ID (no auth required)"""
    try:
        profiles = db.query(Profile).filter(Profile.user_id == user_id).all()
        
        if not profiles:
            return {"profiles": [], "message": f"No profiles found for user ID {user_id}"}
        
        profile_list = []
        for profile in profiles:
            profile_list.append({
                "id": profile.id,
                "title": profile.title,
                "full_name": profile.full_name,
                "email": profile.email,
                "phone": profile.phone,
                "created_at": profile.created_at.isoformat() if profile.created_at else None,
                "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
                "has_resume": bool(profile.resume_path)
            })
        
        return {"profiles": profile_list, "count": len(profile_list)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get profiles: {str(e)}")

@app.get("/user/profiles")
async def get_all_user_profiles(
    user_id: int = Query(default=1, description="User ID for development"),
    db: Session = Depends(get_db)
):
    """Get all profiles for a user (dev mode: no auth required)"""
    try:
        profiles = db.query(Profile).filter(
            Profile.user_id == user_id
        ).order_by(Profile.updated_at.desc()).all()
        
        if not profiles:
            return {"profiles": [], "message": "No profiles found. Please upload a resume to create your first profile."}
        
        profile_list = []
        for profile in profiles:
            profile_list.append({
                "id": profile.id,
                "title": profile.title,
                "full_name": profile.full_name,
                "email": profile.email,
                "phone": profile.phone,
                "created_at": profile.created_at.isoformat() if profile.created_at else None,
                "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
                "has_resume": bool(profile.resume_path and os.path.exists(profile.resume_path) if profile.resume_path else False)
            })
        
        return {"profiles": profile_list}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch profiles: {str(e)}")

@app.get("/user/profile/{profile_id}")
async def get_user_profile_by_id(
    profile_id: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific user profile by ID (only user's own profiles)"""
    try:
        profile = db.query(Profile).filter(
            Profile.id == profile_id,
            Profile.user_id == current_user.id
        ).first()
        
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        return {
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
            "has_resume": bool(profile.resume_path and os.path.exists(profile.resume_path) if profile.resume_path else False)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {str(e)}")

@app.get("/user/profile/{profile_id}/resume")
async def get_profile_resume(profile_id: int, db: Session = Depends(get_db)):
    """Download resume file for a specific profile"""
    try:
        # Get the profile
        profile = db.query(Profile).filter(Profile.id == profile_id).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        # Check if resume file exists
        if not profile.resume_path or not os.path.exists(profile.resume_path):
            raise HTTPException(status_code=404, detail="Resume file not found")
        
        # Return the resume file
        return FileResponse(
            path=profile.resume_path,
            filename=os.path.basename(profile.resume_path),
            media_type='application/octet-stream'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download resume: {str(e)}")

@app.get("/user/profile")
async def get_user_profile(db: Session = Depends(get_db)):
    """Get user profile - first check database, then return mock if none exists"""
    try:
        # Try to get the most recent profile from database
        profile = db.query(Profile).order_by(Profile.updated_at.desc()).first()
        
        if profile:
            # Convert database profile to the expected format
            return {
                "personal_information": {
                    "basic_information": {
                        "first_name": profile.full_name.split()[0] if profile.full_name else "",
                        "last_name": " ".join(profile.full_name.split()[1:]) if profile.full_name and len(profile.full_name.split()) > 1 else ""
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
                    }
                },
                "work_experience": profile.work_experience or [],
                "education": profile.education or [],
                "skills": profile.skills or [],
                "languages": profile.languages or [],
                "job_preferences": profile.job_preferences or {},
                "achievements": profile.achievements or [],
                "certificates": profile.certificates or []
            }
        else:
            # No profile found, return mock data with a clear indicator
            return {
                "personal_information": {
                    "basic_information": {
                        "first_name": "John",
                        "last_name": "Doe"
                    },
                    "contact_information": {
                        "email": "john.doe@example.com",
                        "telephone": "555-123-4567"
                    },
                    "address": {
                        "address": "123 Main St",
                        "city": "Springfield",
                        "state": "IL",
                        "zip_code": "62704",
                        "country": "USA"
                    }
                },
                "work_experience": [],
                "education": [],
                "skills": [],
                "job_preferences": {
                    "linkedin_link": "https://linkedin.com/in/johndoe",
                    "github_link": "https://github.com/johndoe"
                },
                "_is_mock_data": True  # Flag to indicate this is mock data
            }
    except Exception as e:
        # If there's an error, return mock data as fallback
        return {
            "personal_information": {
                "basic_information": {
                    "first_name": "John",
                    "last_name": "Doe"
                },
                "contact_information": {
                    "email": "john.doe@example.com",
                    "telephone": "555-123-4567"
                }
            },
            "work_experience": [],
            "education": [],
            "skills": [],
            "_is_mock_data": True,
            "_error": str(e)
        }

@app.put("/user/profile/{profile_id}")
async def update_user_profile(
    profile_id: int,
    profile_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a specific user profile by ID (only user's own profiles)"""
    print(f"🔍 PUT /user/profile/{profile_id} called by user {current_user.id}")
    print(f"📋 Received profile_data: {json.dumps(profile_data, indent=2, default=str)}")
    
    # Debug specific field locations
    personal_info = profile_data.get('personal_information', {})
    basic_info = personal_info.get('basic_information', {})
    contact_info = personal_info.get('contact_information', {})
    address_info = personal_info.get('address', {})
    
    print(f"🔍 DEBUG - basic_info: {basic_info}")
    print(f"🔍 DEBUG - contact_info: {contact_info}")
    print(f"🔍 DEBUG - address_info: {address_info}")
    print(f"🔍 DEBUG - personal_info citizenship: {personal_info.get('citizenship')}")
    print(f"🔍 DEBUG - personal_info gender: {personal_info.get('gender')}")
    try:
        # Find the profile that belongs to the current user
        profile = db.query(Profile).filter(
            Profile.id == profile_id,
            Profile.user_id == current_user.id
        ).first()
        
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        # Extract and update basic profile fields
        personal_info = profile_data.get('personal_information', {})
        basic_info = personal_info.get('basic_information', {})
        contact_info = personal_info.get('contact_information', {})
        address_info = personal_info.get('address', {})
        
        # Update individual fields with detailed logging
        if basic_info:
            first_name = basic_info.get('first_name', '')
            last_name = basic_info.get('last_name', '')
            if first_name or last_name:
                old_name = profile.full_name
                profile.full_name = f"{first_name} {last_name}".strip()
                print(f"🔍 Name: '{old_name}' → '{profile.full_name}'")
        
        if contact_info:
            if 'email' in contact_info:
                old_email = profile.email
                profile.email = contact_info['email']
                print(f"🔍 Email: '{old_email}' → '{profile.email}'")
            if 'telephone' in contact_info:
                old_phone = profile.phone
                profile.phone = contact_info['telephone']
                print(f"🔍 Phone: '{old_phone}' → '{profile.phone}'")
        
        if address_info:
            if 'address' in address_info:
                old_address = profile.address
                profile.address = address_info['address']
                print(f"🔍 Address: '{old_address}' → '{profile.address}'")
            if 'city' in address_info:
                old_city = profile.city
                profile.city = address_info['city']
                print(f"🔍 City: '{old_city}' → '{profile.city}'")
            if 'state' in address_info:
                old_state = profile.state
                profile.state = address_info['state']
                print(f"🔍 State: '{old_state}' → '{profile.state}'")
            if 'zip_code' in address_info:
                old_zip = profile.zip_code
                profile.zip_code = address_info['zip_code']
                print(f"🔍 Zip: '{old_zip}' → '{profile.zip_code}'")
            if 'country' in address_info:
                old_country = profile.country
                profile.country = address_info['country']
                print(f"🔍 Country: '{old_country}' → '{profile.country}'")
        
        # Update structured data fields (JSON fields)
        if 'work_experience' in profile_data:
            profile.work_experience = profile_data['work_experience']
        
        if 'education' in profile_data:
            profile.education = profile_data['education']
        
        if 'skills' in profile_data:
            profile.skills = profile_data['skills']
        
        if 'languages' in profile_data:
            profile.languages = profile_data['languages']
        
        if 'job_preferences' in profile_data:
            profile.job_preferences = profile_data['job_preferences']
        
        if 'achievements' in profile_data:
            profile.achievements = profile_data['achievements']
        
        if 'certificates' in profile_data:
            profile.certificates = profile_data['certificates']
        
        # Update profile title if provided
        if 'title' in profile_data:
            profile.title = profile_data['title']
        
        # Update gender if provided (should be in basic_information)
        if basic_info.get('gender'):
            profile.gender = basic_info['gender']
            print(f"🔍 Setting gender to: {basic_info['gender']}")
        
        # Update citizenship if provided (prioritize personal_information over address)
        citizenship_value = None
        if personal_info.get('citizenship'):
            citizenship_value = personal_info['citizenship']
        elif address_info.get('citizenship'):
            citizenship_value = address_info['citizenship']
        
        if citizenship_value:
            profile.citizenship = citizenship_value
            print(f"🔍 Setting citizenship to: {citizenship_value}")
        elif 'citizenship' in address_info or 'citizenship' in personal_info:
            # Field was provided but empty, so clear it
            profile.citizenship = None
            print(f"🔍 Clearing citizenship (was empty)")
        
        # Set updated timestamp
        from datetime import datetime
        profile.updated_at = datetime.utcnow()
        
        # Commit changes to database
        print(f"💾 Committing changes to database...")
        print(f"📝 Profile before commit - Gender: {profile.gender}, Updated_at: {profile.updated_at}")
        db.commit()
        db.refresh(profile)
        print(f"✅ Database committed and refreshed")
        print(f"📝 Profile after commit - Gender: {profile.gender}, Updated_at: {profile.updated_at}")
        
        # Return updated profile in the same format as get_user_profile_by_id
        return {
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
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Profile update error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")

@app.delete("/user/profile/{profile_id}")
async def delete_user_profile(
    profile_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a specific user profile by ID (only user's own profiles)"""
    try:
        # Find the profile that belongs to the current user
        profile = db.query(Profile).filter(
            Profile.id == profile_id,
            Profile.user_id == current_user.id
        ).first()
        
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        # Delete associated resume file if it exists
        if profile.resume_path and os.path.exists(profile.resume_path):
            try:
                os.remove(profile.resume_path)
                print(f"Deleted resume file: {profile.resume_path}")
            except Exception as e:
                print(f"Warning: Could not delete resume file {profile.resume_path}: {str(e)}")
        
        # Delete the profile from database
        db.delete(profile)
        db.commit()
        
        return {
            "success": True,
            "message": f"Profile '{profile.title}' deleted successfully",
            "deleted_profile_id": profile_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete profile: {str(e)}")

# Chrome Extension API Bridge Endpoints
@app.post("/api/chrome-extension/analyze-form")
async def analyze_form_fields(
    request: Request
):
    """
    Analyze form fields extracted by Chrome extension
    Returns AI-generated field mappings
    """
    # Redirect to modern AI endpoint logic - no authentication required for Chrome extension
    try:
        request_data = await request.json()
        
        # Check if request is in new format (formStructure/userProfile) or old format  
        if 'formStructure' in request_data and 'userProfile' in request_data:
            # New format - pass through to modern AI logic
            return await analyze_form_with_ollama(request_data)
        else:
            # Old format - convert and redirect
            form_fields = request_data.get('form_fields', [])
            profile_id = request_data.get('profile_id')
            
            if not form_fields:
                raise HTTPException(status_code=400, detail="No form fields provided")
            
            # Convert to new format and call modern endpoint
            converted_request = {
                'formStructure': {'fields': form_fields},
                'userProfile': {'id': profile_id},  # Minimal profile for now
                'jobUrl': request_data.get('jobUrl', '')
            }
            
            # Create new request object
            from fastapi import Request
            import json
            
            class MockRequest:
                def __init__(self, data):
                    self._data = data
                async def json(self):
                    return self._data
            
            return await analyze_form_with_ollama(converted_request)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Form analysis failed: {str(e)}")

@app.post("/api/chrome-extension/submit-application")
async def submit_application_status(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Record application submission status from Chrome extension
    """
    try:
        data = await request.json()
        job_url = data.get('job_url')
        profile_id = data.get('profile_id')
        status = data.get('status', 'applied')
        
        if not job_url:
            raise HTTPException(status_code=400, detail="Job URL is required")
        
        # Find or create job record
        job = db.query(Job).filter(Job.link == job_url).first()
        if not job:
            # Create basic job record
            job = Job(
                title=data.get('job_title', 'Unknown Position'),
                company=data.get('company', 'Unknown Company'),
                location=data.get('location', ''),
                link=job_url,
                source='chrome_extension'
            )
            db.add(job)
            db.flush()
        
        # Create application record
        application = Application(
            user_id=current_user.id,
            job_id=job.id,
            profile_id=profile_id,
            status=status,
            applied_at=func.now() if status == 'applied' else None
        )
        
        db.add(application)
        db.commit()
        
        return {
            "success": True,
            "application_id": application.id,
            "message": "Application status recorded"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to record application: {str(e)}")

async def generate_field_mappings(profile_data: dict, form_fields: list) -> dict:
    """
    Generate field mappings using AI
    TODO: Integrate with Ollama for intelligent field mapping
    """
    # Simple rule-based mapping for now
    # This will be replaced with Ollama integration
    mappings = {}
    
    for field in form_fields:
        field_id = field.get('id', '')
        field_name = field.get('name', '')
        field_label = field.get('label', '').lower()
        field_type = field.get('type', 'text')
        
        # Simple mapping rules
        if any(term in field_label for term in ['first name', 'fname', 'firstname']):
            name_parts = profile_data['personal_information']['full_name'].split(' ', 1)
            mappings[field_id] = name_parts[0] if name_parts else ''
            
        elif any(term in field_label for term in ['last name', 'lname', 'lastname', 'surname']):
            name_parts = profile_data['personal_information']['full_name'].split(' ', 1)
            mappings[field_id] = name_parts[1] if len(name_parts) > 1 else ''
            
        elif any(term in field_label for term in ['full name', 'name']):
            mappings[field_id] = profile_data['personal_information']['full_name']
            
        elif 'email' in field_label:
            mappings[field_id] = profile_data['personal_information']['email']
            
        elif 'phone' in field_label:
            mappings[field_id] = profile_data['personal_information']['phone']
            
        elif any(term in field_label for term in ['address', 'street']):
            mappings[field_id] = profile_data['personal_information']['address']
            
        elif 'city' in field_label:
            mappings[field_id] = profile_data['personal_information']['city']
            
        elif 'state' in field_label:
            mappings[field_id] = profile_data['personal_information']['state']
            
        elif any(term in field_label for term in ['zip', 'postal']):
            mappings[field_id] = profile_data['personal_information']['zip_code']
    
    return mappings

def extract_user_data_from_profile(user_profile: dict) -> dict:
    """Extract COMPLETE user data from profile - include everything for intelligent AI decisions"""
    try:
        # Extract nested profile structure or flat structure
        personal_info = user_profile.get("personal_information", {})
        basic_info = personal_info.get("basic_information", {})
        contact_info = personal_info.get("contact_information", {})
        address_info = personal_info.get("address_information", personal_info.get("address", {}))
        
        # Get all sections
        work_exp = user_profile.get("work_experience", [])
        education = user_profile.get("education", [])
        skills = user_profile.get("skills", [])
        languages = user_profile.get("languages", [])
        job_prefs = user_profile.get("job_preferences", {})
        achievements = user_profile.get("achievements", [])
        certificates = user_profile.get("certificates", [])
        
        # Build comprehensive user data structure
        user_data = {
            # === PERSONAL INFORMATION ===
            "first_name": basic_info.get("first_name") or contact_info.get("first_name") or (user_profile.get("full_name", "").split()[0] if user_profile.get("full_name") else None),
            "last_name": basic_info.get("last_name") or contact_info.get("last_name") or (" ".join(user_profile.get("full_name", "").split()[1:]) if user_profile.get("full_name") and len(user_profile.get("full_name", "").split()) > 1 else None),
            "full_name": user_profile.get("full_name") or contact_info.get("full_name") or f"{basic_info.get('first_name', '')} {basic_info.get('last_name', '')}".strip(),
            "email": contact_info.get("email") or user_profile.get("email"),
            "phone": contact_info.get("telephone") or contact_info.get("phone") or user_profile.get("phone"),
            "gender": user_profile.get("gender"),
            
            # === ADDRESS INFORMATION ===
            "address": user_profile.get("address") or address_info.get("street_address"),
            "city": user_profile.get("city") or address_info.get("city"),
            "state": user_profile.get("state") or address_info.get("state"),
            "zip_code": user_profile.get("zip_code") or address_info.get("zip_code"),
            "country": user_profile.get("country") or address_info.get("country"),
            "citizenship": user_profile.get("citizenship"),
            
            # === WORK EXPERIENCE (FULL DETAILS) ===
            "work_experience": work_exp,
            "current_company": work_exp[0].get("company") if work_exp else None,
            "current_title": work_exp[0].get("title") if work_exp else None,
            "current_job_description": work_exp[0].get("description") if work_exp else None,
            "years_of_experience": len(work_exp),
            "total_work_experience": job_prefs.get("total_work_experience"),
            
            # === EDUCATION (FULL DETAILS) ===
            "education": education,
            "highest_degree": education[0].get("degree") if education else job_prefs.get("highest_education"),
            "school": education[0].get("school") or (education[0].get("institution") if education else None),
            "gpa": education[0].get("gpa") if education else None,
            
            # === SKILLS & CAPABILITIES ===
            "skills": skills,
            "languages": languages,
            "certificates": certificates,
            "achievements": achievements,
            
            # === JOB PREFERENCES & REQUIREMENTS ===
            "preferred_location": job_prefs.get("location_preference"),
            "willing_to_relocate": job_prefs.get("willing_to_relocate"),
            "remote_preference": job_prefs.get("remote_preference", "Remote"),  # Default to remote
            "current_salary": job_prefs.get("current_salary"),
            "expected_salary": job_prefs.get("expected_salary"),
            "notice_period": job_prefs.get("notice_period"),
            "visa_requirement": job_prefs.get("visa_requirement"),
            "driving_license": job_prefs.get("driving_license"),
            
            # === PROFESSIONAL LINKS ===
            "linkedin": job_prefs.get("linkedin_link"),
            "github": job_prefs.get("github_link"), 
            "portfolio": job_prefs.get("portfolio_link"),
            
            # === ADDITIONAL FIELDS (from flat structure) ===
            "resume_path": user_profile.get("resume_path")
        }
        
        # Remove None/empty values but keep False/0 values
        cleaned_data = {}
        for k, v in user_data.items():
            if v is not None and v != "" and v != ", ":
                cleaned_data[k] = v
        
        return cleaned_data
        
    except Exception as e:
        print(f"Error extracting user data: {e}")
        return {}

def clean_form_structure(form_structure: dict) -> list:
    """Create minimal, intelligent form field representation for Ollama"""
    try:
        minimal_fields = []
        
        for field in form_structure.get("fields", []):
            # Extract the essential question and field identifier
            field_id = field.get("name") or field.get("id", f"field_{len(minimal_fields)}")
            # For radio buttons, prefer the 'question' field over 'label'
            question = field.get("question") or field.get("label") or field.get("placeholder", "Unknown field")
            field_type = field.get("type", "text")
            
            # Create minimal field representation
            minimal_field = {
                "id": field_id,
                "question": question,
                "type": field_type
            }
            
            # Handle select/radio fields intelligently
            if field_type in ["select", "radio", "select-one"] and field.get("options"):
                options = []
                for opt in field.get("options", []):
                    if isinstance(opt, dict):
                        option_text = opt.get("text", opt.get("value", ""))
                    else:
                        option_text = str(opt)
                    
                    if option_text.strip():
                        options.append(option_text.strip())
                
                if len(options) <= 10:
                    # Short list - include all options for precise matching
                    minimal_field["type"] = "select"
                    minimal_field["options"] = options
                else:
                    # Long dropdown - include first 5 options as examples
                    minimal_field["type"] = "text_from_dropdown"
                    minimal_field["sample_options"] = options[:5]  # First 5 options as examples
                    minimal_field["all_options"] = options  # Store all options for validation
                    minimal_field["total_options"] = len(options)
                    minimal_field["note"] = f"Dropdown with {len(options)} options - provide best match from similar values"
            
            minimal_fields.append(minimal_field)
        
        return minimal_fields
        
    except Exception as e:
        print(f"Error creating minimal form structure: {e}")
        return []

def create_semantic_field_mapping(clean_form):
    """
    Create semantic field names for Ollama to avoid UUID confusion.
    Returns: (mapping_dict, llm_form_structure)
    """
    semantic_mapping = {}  # semantic_name -> html_field_id
    llm_form = []
    
    # Counters for duplicate semantic names
    counters = {}
    
    for field in clean_form:
        html_field_id = field.get("id") or field.get("name")
        question = field.get("question", "").lower().strip()
        field_type = field.get("type", "")
        
        # Generate semantic name based on question content
        semantic_name = generate_semantic_name(question, field_type, counters)
        
        # Store mapping
        semantic_mapping[semantic_name] = html_field_id
        
        # Create LLM field structure with semantic name
        llm_field = {
            "id": semantic_name,  # Use semantic name instead of HTML ID
            "question": field.get("question"),
            "type": field_type
        }
        
        # Copy relevant field properties (but not all_options to avoid confusing LLM)
        if "options" in field:
            llm_field["options"] = field["options"]
        if "sample_options" in field:
            llm_field["sample_options"] = field["sample_options"]
            llm_field["total_options"] = field.get("total_options", len(field["sample_options"]))
            llm_field["note"] = field.get("note", "")
            # Don't send all_options to LLM - keep only in clean_form for validation
            
        llm_form.append(llm_field)
    
    return semantic_mapping, llm_form

def generate_semantic_name(question, field_type, counters):
    """Generate clean semantic field names based on question content."""
    question = question.lower().strip().replace("✱", "").replace("*", "")
    
    # Define semantic mappings based on question keywords
    semantic_mappings = {
        # Personal info
        ("full name", "name"): "full_name",
        ("first name",): "first_name", 
        ("last name",): "last_name",
        ("email",): "email",
        ("phone", "telephone"): "phone",
        
        # Location/Address
        ("current location", "where do you live", "location"): "current_location",
        ("address",): "address",
        ("city",): "city",
        ("state",): "state",
        ("zip", "postal"): "zip_code",
        ("country", "nationality", "what is your nationality"): "nationality",
        
        # Work/Company
        ("current company", "company", "organization", "org"): "current_company",
        ("current position", "current title", "position", "title"): "current_title",
        
        # Social/Links
        ("linkedin", "social", "links", "urls", "url"): "linkedin_url",
        ("website", "portfolio"): "website",
        
        # Visa/Legal
        ("visa", "sponsorship", "sponsor", "work authorization"): "visa_sponsorship",
        
        # Languages
        ("language",): "language",
        
        # Location preference
        ("which location", "applying for", "office location", "location preference", "opportunity location"): "job_location_preference",
        
        # Files
        ("resume", "cv"): "resume_file",
        ("cover letter",): "cover_letter_file",
        
        # Open-ended
        ("additional", "comments", "tell us", "why", "describe", "information"): "additional_info"
    }
    
    # Find matching semantic name (check longer patterns first for better matching)
    semantic_name = None
    # Sort by longest keyword first to prioritize more specific matches
    sorted_mappings = sorted(semantic_mappings.items(), key=lambda x: max(len(kw) for kw in x[0]), reverse=True)
    
    for keywords, name in sorted_mappings:
        if any(keyword in question for keyword in keywords):
            semantic_name = name
            break
    
    # Default fallback based on field type
    if not semantic_name:
        if field_type == "file":
            semantic_name = "file_upload"
        elif field_type in ["select", "text_from_dropdown"]:
            semantic_name = "dropdown_field"
        elif field_type == "textarea":
            semantic_name = "text_area"
        else:
            semantic_name = "text_field"
    
    # Handle duplicates by adding counter
    if semantic_name in counters:
        counters[semantic_name] += 1
        semantic_name = f"{semantic_name}_{counters[semantic_name]}"
    else:
        counters[semantic_name] = 1
        
    return semantic_name

@app.post("/ai/analyze-form")
async def analyze_form_with_ollama(request: dict):
    """
    Analyze job application form using Ollama AI
    Bypasses Chrome extension CORS restrictions
    """
    try:
        form_structure = request.get('formStructure')
        user_profile = request.get('userProfile')
        job_url = request.get('jobUrl', '')  # Optional job URL to lookup job description
        
        if not form_structure or not user_profile:
            raise HTTPException(status_code=400, detail="Missing formStructure or userProfile")
        
        print(f"🧠 Backend: Received form analysis request for {len(form_structure.get('fields', []))} fields")
        
        # Try to fetch job description from database if URL provided
        job_description = ""
        if job_url:
            try:
                db_session = SessionLocal()
                
                # Clean the job URL to match database format (remove /apply if present)
                clean_job_url = job_url.replace('/apply', '').rstrip('/')
                
                # Try exact match first
                job = db_session.query(Job).filter(Job.link == clean_job_url).first()
                
                # If no exact match, try partial match (for URLs with different query params)
                if not job:
                    job = db_session.query(Job).filter(Job.link.like(f'%{clean_job_url.split("/")[-1]}%')).first()
                
                if job and job.description:
                    job_description = job.description
                    print(f"🧠 ✅ Found job description ({len(job_description)} chars): {job_description[:100]}...")
                    print(f"🧠 📋 Job title: {job.title}")
                    print(f"🧠 🏢 Company: {job.company}")
                else:
                    print(f"🧠 ❌ No job description found for URL: {job_url}")
                    print(f"🧠 🔍 Cleaned URL: {clean_job_url}")
                    # Debug: show some example URLs from database
                    sample_jobs = db_session.query(Job).limit(3).all()
                    print(f"🧠 📊 Sample URLs in database:")
                    for sample in sample_jobs:
                        print(f"🧠   - {sample.link}")
                
                db_session.close()
            except Exception as e:
                print(f"🧠 ❌ Error fetching job description: {e}")
                if 'db_session' in locals():
                    db_session.close()
        
        # Extract clean user data from profile
        user_data = extract_user_data_from_profile(user_profile)
        print(f"🧠 DEBUG: Extracted user data: {json.dumps(user_data, indent=2)}")
        
        # Clean form structure (remove positioning and unnecessary data)
        clean_form = clean_form_structure(form_structure)
        print(f"🧠 DEBUG: Clean form structure: {json.dumps(clean_form, indent=2)}")
        
        # Create semantic field mapping for Ollama (to avoid UUID confusion)
        semantic_mapping, llm_form = create_semantic_field_mapping(clean_form)
        print("🔄 SEMANTIC FIELD MAPPING:")
        print("=" * 40)
        for semantic_name, html_id in semantic_mapping.items():
            # Find the question for this field
            question = next((f.get('question', '') for f in clean_form if f.get('id', f.get('name')) == html_id), '')
            print(f"  {semantic_name} -> {html_id}")
            print(f"    Question: \"{question}\"")
        print("=" * 40)
        
        prompt = f"""You are filling a job application form using a candidate profile and job description.

🎯 GOAL:  
Answer every form field accurately using the profile and job data.  
Always use real values. Adapt to any form layout or question style.

===========================
📄 PROFILE DATA:
{json.dumps(user_data, indent=2)}
===========================

===========================
🧾 JOB DESCRIPTION (if available):
{job_description if job_description else "No job description available"}
===========================

===========================
📋 FORM FIELDS:
{json.dumps(llm_form, indent=2)}
===========================

===========================
🚨 RULES FOR FORM FILLING:

1. ✅ **USE REAL PROFILE VALUES**  
   - Do not use "null" if profile has valid info  
   - Never use placeholders like "your_email@example.com"  
   - Do not invent or guess values not in the profile  

2. ✅ **ANSWER BASED ON QUESTION TEXT (NOT FIELD ID)**  
   - Read each field's "question" text and interpret its intent  
   - Match based on meaning, not field naming

3. ✅ **DROPDOWN FIELDS**  
   - Choose ONLY from listed options  
   - Match as closely as possible using profile values  
   - Return `null` if no match is valid  

4. 🧭 **MAP MEANING TO PROFILE FIELDS**  
   If the question is about:

   - **Full name** → profile.full_name  
   - **Email** → profile.email  
   - **Phone** → profile.phone  
   - **Current location** → profile.city + ", " + profile.state  
   - **Current company** → profile.current_company  
   - **LinkedIn** or similar URLs → profile.linkedin  
   - **Resume** → profile.resume_path  
   - **Nationality / Country** → use profile.country (e.g. "USA" → "United States")  
   - **Languages** → use in order from profile.languages  
   - **Visa or sponsorship** →  
     - If profile.visa_requirement is "No" → Answer that **no sponsorship is required**  
     - If profile.visa_requirement is "Yes" → Answer that **sponsorship is required**  
     - Use the best-matching option from the dropdown  

5. 🧠 **OPEN-ENDED QUESTIONS (e.g. "Additional Info", "Why are you a good fit?", "Tell us more")**  
   - Generate a tailored response (2–4 sentences) by analyzing:
     - **Job requirements** from the description (keywords, skills, responsibilities)
     - **Matching profile strengths** (work experience, education, skills, achievements)
     - **Specific alignment** between candidate background and role needs
   - Focus on **concrete fit, quantifiable impact, and relevant experience**  
   - Highlight specific skills/experience mentioned in job description
   - Use job title/company context to tailor the response
   - Avoid vague filler or generic statements  
   - If no job description is provided, use profile strengths that apply broadly  
   - If nothing applies, return `null`

6. 📊 **USE JOB DESCRIPTION FOR CONTEXT**  
   - **Skills questions**: Prioritize skills mentioned in job description
   - **Experience questions**: Emphasize relevant work experience that matches job requirements
   - **Location preferences**: Consider job location vs. candidate location
   - **Salary expectations**: Use job-appropriate ranges based on role level
   - **Additional info**: Connect candidate strengths to specific job needs

6. ❌ **DO NOT:**  
   - Answer required fields with null unless data is truly missing  
   - Pick dropdown options that aren't listed  
   - Make up institutions, job titles, or experience  
   - Repeat data in open-ended answers that's already covered in other fields unless it adds new context  

===========================
📤 RESPONSE FORMAT:
Return ONLY a JSON object mapping field IDs to values:

{{
{chr(10).join([f'  "{field.get("id")}": "answer_here",' for field in llm_form])}
}}

ONLY return the JSON object - no explanations:"""

        # Ensure Ollama is running before calling API
        print("🤖 Ensuring Ollama service is running...")
        if not start_ollama_service():
            raise HTTPException(status_code=503, detail="Ollama service is not available. Please ensure Ollama is installed and running.")

        # Call Ollama API
        import requests
        print("🧠 Backend: Calling Ollama API...")
        print("=" * 80)
        print("📋 EXACT PROMPT SENT TO OLLAMA:")
        print("=" * 80)
        print(prompt)
        print("=" * 80)
        
        try:
            print("🧠 Backend: Starting Ollama API call...")
            start_time = time.time()
            
            ollama_response = requests.post(
                'http://localhost:11434/api/generate',
                json={
                    'model': 'llama3.2',
                    'prompt': prompt,
                    'stream': False
                },
                timeout=120
            )
            
            end_time = time.time()
            print(f"🧠 Backend: Ollama API call completed in {end_time - start_time:.2f} seconds")
            
        except requests.exceptions.Timeout as e:
            print(f"🧠 Backend: ❌ Ollama API timeout after 120 seconds")
            raise HTTPException(status_code=500, detail="Ollama AI service timed out. Please try again with a simpler form or check if Ollama is running properly.")
        except requests.exceptions.RequestException as e:
            print(f"🧠 Backend: ❌ Ollama API connection error: {e}")
            raise HTTPException(status_code=500, detail=f"Ollama AI service connection error: {str(e)}")
        
        if ollama_response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Ollama API error: {ollama_response.status_code}")
        
        ollama_data = ollama_response.json()
        raw_response = ollama_data.get('response', '')
        print("=" * 80)
        print("🤖 EXACT OLLAMA RESPONSE:")
        print("=" * 80)
        print(raw_response)
        print("=" * 80)
        
        # Enhanced JSON parsing - properly extract complete JSON objects
        try:
            # Try to parse the entire response as JSON first
            answers = json.loads(raw_response.strip())
            print(f"🧠 ✅ Direct JSON parse successful: {type(answers)} with {len(answers)} fields")
        except json.JSONDecodeError:
            # Fallback: Extract complete JSON object using brace counting
            import re
            
            # Find the start of the JSON object
            json_start = raw_response.find('{')
            if json_start == -1:
                print(f"🧠 ❌ No opening brace found in response: {raw_response[:500]}...")
                raise HTTPException(status_code=500, detail="No JSON object found in Ollama response")
            
            # Count braces to find the complete JSON object
            brace_count = 0
            json_end = json_start
            in_string = False
            escaped = False
            
            for i, char in enumerate(raw_response[json_start:], json_start):
                if not escaped:
                    if char == '"' and not in_string:
                        in_string = True
                    elif char == '"' and in_string:
                        in_string = False
                    elif not in_string:
                        if char == '{':
                            brace_count += 1
                        elif char == '}':
                            brace_count -= 1
                            if brace_count == 0:
                                json_end = i + 1
                                break
                
                escaped = (char == '\\' and not escaped)
            
            if brace_count != 0:
                print(f"🧠 ❌ Unmatched braces in JSON response: {raw_response[:500]}...")
                raise HTTPException(status_code=500, detail="Malformed JSON in Ollama response")
            
            # Extract and parse the complete JSON
            json_text = raw_response[json_start:json_end]
            try:
                answers = json.loads(json_text)
                print(f"🧠 ✅ Brace-counted JSON parse successful: {type(answers)} with {len(answers)} fields")
                print(f"🧠 📄 Extracted JSON length: {len(json_text)} characters")
            except json.JSONDecodeError as e:
                print(f"🧠 ❌ JSON parse failed: {e}")
                print(f"🧠 Attempted to parse {len(json_text)} chars: {json_text[:500]}...")
                print(f"🧠 Full JSON text: {json_text}")
                raise HTTPException(status_code=500, detail=f"Failed to parse JSON: {str(e)}")
        
        # Map semantic field names back to HTML field IDs
        html_answers = {}
        for semantic_name, answer in answers.items():
            if semantic_name in semantic_mapping:
                html_field_id = semantic_mapping[semantic_name]
                html_answers[html_field_id] = answer
            else:
                print(f"⚠️ Semantic field '{semantic_name}' not found in mapping")
        
        # Replace answers with mapped HTML field IDs
        answers = html_answers
        
        # Validate that we got answers for expected fields
        expected_fields = [field.get("id") or field.get("name") for field in clean_form]
        received_fields = list(answers.keys())
        
        missing_fields = [f for f in expected_fields if f not in received_fields]
        extra_fields = [f for f in received_fields if f not in expected_fields]
        
        print("=" * 80)
        print("🔍 FIELD VALIDATION:")
        print("=" * 80)
        print(f"Expected {len(expected_fields)} fields: {expected_fields}")
        print(f"Received {len(received_fields)} fields: {received_fields}")
        
        if missing_fields:
            print(f"⚠️ MISSING FIELDS: {missing_fields}")
        if extra_fields:
            print(f"⚠️ EXTRA FIELDS: {extra_fields}")
        
        # Check dropdown validation and auto-correct violations
        dropdown_violations = []
        for field in clean_form:
            field_id = field.get("id") or field.get("name")
            field_type = field.get("type")
            
            # Check both "select" and "text_from_dropdown" fields
            if field_id in answers and field_type in ["select", "text_from_dropdown"]:
                answer = answers[field_id]
                # Use all_options if available (for large dropdowns), otherwise use options or sample_options
                valid_options = field.get("all_options") or field.get("options") or field.get("sample_options", [])
                
                if answer is not None and valid_options and answer not in valid_options:
                    dropdown_violations.append({
                        "field": field_id,
                        "answer": answer,
                        "valid_options": valid_options,
                        "question": field.get("question", "")
                    })
                    
                    # AUTO-CORRECT: Try to find best match
                    print(f"🔧 AUTO-CORRECTING dropdown violation for '{field_id}':")
                    print(f"   Question: {field.get('question', '')}")
                    print(f"   Bad answer: '{answer}'")
                    print(f"   Using {len(valid_options)} validation options: {valid_options[:10]}{'...' if len(valid_options) > 10 else ''}")
                    
                    # Smart matching based on common patterns
                    corrected_answer = None
                    answer_lower = str(answer).lower()
                    question_lower = field.get('question', '').lower()
                    
                    # Special handling for visa/sponsorship questions
                    if 'visa' in question_lower or 'sponsor' in question_lower:
                        if 'no' in answer_lower or answer_lower == 'usa' or answer_lower == 'us':
                            # User probably doesn't need sponsorship
                            for option in valid_options:
                                if 'no' in option.lower() and ('visa' in option.lower() or 'sponsor' in option.lower()):
                                    corrected_answer = option
                                    break
                        elif 'yes' in answer_lower:
                            # User needs sponsorship
                            for option in valid_options:
                                if 'yes' in option.lower() and 'sponsor' in option.lower():
                                    corrected_answer = option
                                    break
                    
                    # Special handling for country/nationality questions
                    elif 'nationality' in question_lower or 'country' in question_lower:
                        # Map common country codes/names
                        country_mappings = {
                            'usa': ['united states', 'america', 'usa', 'us'],
                            'uk': ['united kingdom', 'britain', 'uk', 'england'],
                            'spain': ['spain', 'spanish'],
                            'france': ['france', 'french'],
                            'germany': ['germany', 'german'],
                            'canada': ['canada', 'canadian'],
                            'australia': ['australia', 'australian']
                        }
                        
                        for country_group in country_mappings.values():
                            if answer_lower in country_group:
                                for option in valid_options:
                                    if any(country in option.lower() for country in country_group):
                                        corrected_answer = option
                                        break
                                if corrected_answer:
                                    break
                    
                    # Special handling for language questions
                    elif 'language' in question_lower:
                        # Map common language names
                        language_mappings = {
                            'english': ['english', 'en'],
                            'spanish': ['spanish', 'español', 'es'],
                            'french': ['french', 'français', 'fr'],
                            'german': ['german', 'deutsch', 'de'],
                            'italian': ['italian', 'italiano', 'it'],
                            'portuguese': ['portuguese', 'português', 'pt'],
                            'chinese': ['chinese', 'mandarin', 'zh'],
                            'japanese': ['japanese', 'ja'],
                            'korean': ['korean', 'ko'],
                            'arabic': ['arabic', 'ar'],
                            'russian': ['russian', 'ru']
                        }
                        
                        for lang_variants in language_mappings.values():
                            if answer_lower in lang_variants:
                                for option in valid_options:
                                    if any(variant in option.lower() for variant in lang_variants):
                                        corrected_answer = option
                                        break
                                if corrected_answer:
                                    break
                    
                    # General partial matching
                    if not corrected_answer:
                        for option in valid_options:
                            if option.lower() != 'select...' and answer_lower in option.lower():
                                corrected_answer = option
                                break
                    
                    # If still no match, set to null
                    if corrected_answer:
                        answers[field_id] = corrected_answer
                        print(f"   ✅ Corrected to: '{corrected_answer}'")
                    else:
                        answers[field_id] = None
                        print(f"   ❌ No match found, set to null (will be skipped)")
        
        if dropdown_violations:
            print("❌ DROPDOWN VIOLATIONS:")
            for violation in dropdown_violations:
                print(f"  Field '{violation['field']}': answered '{violation['answer']}' but options are {violation['valid_options']}")
        
        print("=" * 80)
        print("✅ FINAL PARSED ANSWERS:")
        print("=" * 80)
        print(json.dumps(answers, indent=2))
        print("=" * 80)
        
        return {"success": True, "answers": answers}
        
    except Exception as e:
        print(f"❌ Backend: Ollama analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)