from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    profiles = relationship("Profile", back_populates="user")
    applications = relationship("Application", back_populates="user")

class Profile(Base):
    __tablename__ = "profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False, default="My Profile")
    
    # Personal Information
    full_name = Column(String)
    email = Column(String)
    phone = Column(String)
    gender = Column(String)
    address = Column(String)
    city = Column(String)
    state = Column(String)
    zip_code = Column(String)
    country = Column(String)
    citizenship = Column(String)
    
    # JSON fields for structured data
    work_experience = Column(JSON, default=list)
    education = Column(JSON, default=list)
    skills = Column(JSON, default=list)
    languages = Column(JSON, default=list)
    job_preferences = Column(JSON, default=dict)
    achievements = Column(JSON, default=list)
    certificates = Column(JSON, default=list)
    
    # Resume file path
    resume_path = Column(String)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="profiles")

class Job(Base):
    __tablename__ = "jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    company = Column(String, nullable=False, index=True)
    location = Column(String)
    description = Column(Text)
    link = Column(String, unique=True, nullable=False)
    platform = Column(String, index=True)  # "Ashby", "Greenhouse", "Lever", etc.
    
    # Additional metadata
    job_type = Column(String)  # "full-time", "part-time", "contract", "internship"
    work_type = Column(String)  # "remote", "hybrid", "on-site"
    experience_level = Column(String)  # "entry", "mid", "senior", "executive"
    salary_range = Column(String)
    remote_option = Column(Boolean, default=False)  # Kept for backward compatibility
    
    fetched_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    applications = relationship("Application", back_populates="job")

class Application(Base):
    __tablename__ = "applications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    profile_id = Column(Integer, ForeignKey("profiles.id"))
    
    # Application status
    status = Column(String, default="pending")  # "pending", "applied", "interviewed", "rejected", "offered"
    
    # Generated content
    cover_letter = Column(Text)
    application_instructions = Column(JSON)
    
    # Tracking
    applied_at = Column(DateTime(timezone=True))
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    notes = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="applications")
    job = relationship("Job", back_populates="applications")
    profile = relationship("Profile")

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True, unique=True)
    url = Column(String)
    job_count = Column(Integer, default=0)
    last_scraped = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())