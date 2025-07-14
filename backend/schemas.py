from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class JobResult(BaseModel):
    id: int
    title: str
    company: str
    location: Optional[str] = None
    description: Optional[str] = None
    link: Optional[str] = None
    platform: Optional[str] = None
    job_type: Optional[str] = None
    work_type: Optional[str] = None
    experience_level: Optional[str] = None
    salary_range: Optional[str] = None
    remote_option: Optional[bool] = False
    scraped_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True

class ProfileResponse(BaseModel):
    id: int
    user_id: int
    personal_information: Dict[str, Any]
    work_experience: List[Dict[str, Any]]
    education: List[Dict[str, Any]]
    skills: List[Dict[str, Any]]
    languages: List[str]
    job_preferences: Dict[str, Any]
    achievements: List[Dict[str, Any]]
    certificates: List[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True