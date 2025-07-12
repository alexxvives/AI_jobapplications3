from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime

# User schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Job schemas
class JobResult(BaseModel):
    id: Optional[int] = None
    title: str
    company: str
    location: Optional[str] = ""
    description: Optional[str] = ""
    link: str
    source: Optional[str] = ""
    job_type: Optional[str] = None
    salary_range: Optional[str] = None
    remote_option: Optional[bool] = False
    
    class Config:
        from_attributes = True

class JobSearchRequest(BaseModel):
    title: str
    location: Optional[str] = ""
    limit: Optional[int] = 50

# Profile schemas
class ProfileCreate(BaseModel):
    title: str = "My Profile"
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    image_url: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    citizenship: Optional[str] = None
    work_experience: Optional[List[Dict[str, Any]]] = []
    education: Optional[List[Dict[str, Any]]] = []
    skills: Optional[List[Dict[str, Any]]] = []
    languages: Optional[List[str]] = []
    job_preferences: Optional[Dict[str, Any]] = {}
    achievements: Optional[List[Dict[str, Any]]] = []
    certificates: Optional[List[Dict[str, Any]]] = []

class ProfileUpdate(ProfileCreate):
    pass

class ProfileResponse(BaseModel):
    id: int
    user_id: int
    title: str
    full_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    image_url: Optional[str]
    gender: Optional[str]
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    zip_code: Optional[str]
    country: Optional[str]
    citizenship: Optional[str]
    work_experience: List[Dict[str, Any]]
    education: List[Dict[str, Any]]
    skills: List[Dict[str, Any]]
    languages: List[str]
    job_preferences: Dict[str, Any]
    achievements: List[Dict[str, Any]]
    certificates: List[Dict[str, Any]]
    resume_path: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

# Agent request/response schemas
class ResumeParseRequest(BaseModel):
    title: Optional[str] = "Resume Profile"

class ResumeParseResponse(BaseModel):
    success: bool
    profile: Optional[ProfileResponse] = None
    error: Optional[str] = None

class CoverLetterRequest(BaseModel):
    user_profile: Dict[str, Any]
    job_details: Dict[str, Any]
    tone: Optional[str] = "professional"

class CoverLetterResponse(BaseModel):
    success: bool
    cover_letter: Optional[str] = None
    error: Optional[str] = None

class ApplicationInstructionsRequest(BaseModel):
    user_profile: Dict[str, Any]
    job_details: Dict[str, Any]
    application_mode: Optional[str] = "auto"

class ApplicationInstructionsResponse(BaseModel):
    success: bool
    instructions: Optional[List[Dict[str, Any]]] = None
    estimated_time: Optional[str] = None
    success_probability: Optional[float] = None
    error: Optional[str] = None

# Application schemas
class ApplicationCreate(BaseModel):
    job_id: int
    profile_id: Optional[int] = None
    cover_letter: Optional[str] = None
    notes: Optional[str] = None

class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    cover_letter: Optional[str] = None
    notes: Optional[str] = None

class ApplicationResponse(BaseModel):
    id: int
    user_id: int
    job_id: int
    profile_id: Optional[int]
    status: str
    cover_letter: Optional[str]
    application_instructions: Optional[List[Dict[str, Any]]]
    applied_at: Optional[datetime]
    last_updated: datetime
    notes: Optional[str]
    created_at: datetime
    job: JobResult
    
    class Config:
        from_attributes = True