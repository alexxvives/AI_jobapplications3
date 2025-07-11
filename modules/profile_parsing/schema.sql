-- AI Agent Job Applications Database Schema
-- SQLite schema (can be migrated to PostgreSQL)

-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    hashed_password TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User profiles table (contains all profile data)
CREATE TABLE user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    
    -- Personal Information
    full_name TEXT NOT NULL, -- For job applications (might differ from login name)
    phone TEXT,
    gender TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT,
    citizenship TEXT,
    
    -- Social Media Links
    linkedin_url TEXT,
    twitter_url TEXT,
    github_url TEXT,
    portfolio_url TEXT,
    other_url TEXT,
    
    -- Job Preferences
    notice_period TEXT,
    total_experience TEXT,
    default_experience TEXT,
    highest_education TEXT,
    companies_to_exclude TEXT,
    willing_to_relocate TEXT,
    driving_license TEXT,
    visa_requirement TEXT,
    race_ethnicity TEXT,
    
    -- Profile Data (JSON arrays/objects)
    work_experience TEXT, -- JSON array
    education TEXT, -- JSON array
    skills TEXT, -- JSON array
    languages TEXT, -- JSON array
    achievements TEXT, -- JSON array
    certificates TEXT, -- JSON array
    
    -- Resume source tracking
    resume_source TEXT, -- 'uploaded', 'manual', 'parsed'
    resume_text TEXT, -- original resume text for re-parsing
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Job listings table
CREATE TABLE job_listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crawlfire_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    remote BOOLEAN DEFAULT 0,
    salary_range TEXT, -- JSON for min/max
    job_type TEXT,
    experience_level TEXT,
    description TEXT,
    requirements TEXT, -- JSON array
    responsibilities TEXT, -- JSON array
    benefits TEXT, -- JSON array
    application_url TEXT,
    requires_cover_letter BOOLEAN DEFAULT 0,
    posted_date TIMESTAMP,
    application_deadline TIMESTAMP,
    tags TEXT, -- JSON array
    company_info TEXT, -- JSON object
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Applications table
CREATE TABLE applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    job_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, submitted, failed, accepted, rejected
    application_mode TEXT DEFAULT 'basic', -- basic, with_cover_letter, with_email
    cover_letter_generated BOOLEAN DEFAULT 0,
    cover_letter_text TEXT,
    missing_fields TEXT, -- JSON array of missing field names
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (job_id) REFERENCES job_listings(id)
);

-- Agent logs table
CREATE TABLE agent_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    agent_name TEXT NOT NULL,
    input_data TEXT, -- JSON
    output_data TEXT, -- JSON
    execution_time REAL, -- seconds
    success BOOLEAN DEFAULT 1,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_job_listings_crawlfire_id ON job_listings(crawlfire_id);
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_agent_logs_user_id ON agent_logs(user_id);
CREATE INDEX idx_agent_logs_agent_name ON agent_logs(agent_name);
CREATE INDEX idx_agent_logs_created_at ON agent_logs(created_at); 