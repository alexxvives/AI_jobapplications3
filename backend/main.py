from fastapi import FastAPI, Depends, HTTPException, status, Query, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import uvicorn
import os
import time
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
    allow_origins=[
        "http://localhost:3000",  # React frontend
        "http://localhost:3001",  # Alternative frontend port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create all database tables
Base.metadata.create_all(bind=engine)

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
    title: str = Query(..., description="Job title to search for"),
    location: str = Query("", description="Location filter"),
    limit: int = Query(50, description="Maximum number of results"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search for jobs in the database"""
    try:
        # Build query
        query = db.query(Job)
        
        # Filter by title if provided
        if title:
            query = query.filter(Job.title.ilike(f"%{title}%"))
        
        # Filter by location if provided
        if location:
            query = query.filter(Job.location.ilike(f"%{location}%"))
        
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
def get_job_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get comprehensive job and company statistics"""
    return get_comprehensive_stats(db)

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

@app.get("/user/profiles")
async def get_all_user_profiles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all profiles for the authenticated user"""
    try:
        profiles = db.query(Profile).filter(
            Profile.user_id == current_user.id
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
            "certificates": profile.certificates or [],
            "resume_path": profile.resume_path,
            "has_resume": bool(profile.resume_path and os.path.exists(profile.resume_path) if profile.resume_path else False)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {str(e)}")

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
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """
    Analyze form fields extracted by Chrome extension
    Returns AI-generated field mappings
    """
    try:
        data = await request.json()
        form_fields = data.get('form_fields', [])
        profile_id = data.get('profile_id')
        
        if not form_fields:
            raise HTTPException(status_code=400, detail="No form fields provided")
        
        # Get user profile
        db = SessionLocal()
        try:
            profile = db.query(Profile).filter(
                Profile.id == profile_id,
                Profile.user_id == current_user.id
            ).first()
            
            if not profile:
                raise HTTPException(status_code=404, detail="Profile not found")
            
            # Convert profile to dict for AI processing
            profile_data = {
                'personal_information': {
                    'full_name': profile.full_name,
                    'email': profile.email,
                    'phone': profile.phone,
                    'address': profile.address,
                    'city': profile.city,
                    'state': profile.state,
                    'zip_code': profile.zip_code,
                    'country': profile.country
                },
                'work_experience': profile.work_experience or [],
                'education': profile.education or [],
                'skills': profile.skills or [],
                'languages': profile.languages or []
            }
            
            # Generate field mappings using AI (placeholder for Ollama integration)
            field_mappings = await generate_field_mappings(profile_data, form_fields)
            
            return {
                "success": True,
                "field_mappings": field_mappings,
                "profile_id": profile_id
            }
            
        finally:
            db.close()
            
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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)