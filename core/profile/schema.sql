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

-- Resume data table
CREATE TABLE resume_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    personal_information TEXT, -- JSON
    work_experience TEXT, -- JSON
    education TEXT, -- JSON
    skills TEXT, -- JSON
    languages TEXT, -- JSON
    job_preferences TEXT, -- JSON
    achievements TEXT, -- JSON
    certificates TEXT, -- JSON
    original_filename TEXT,
    file_size INTEGER,
    file_type TEXT,
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
    salary_range TEXT, -- JSON
    job_type TEXT,
    experience_level TEXT,
    description TEXT,
    requirements TEXT, -- JSON
    responsibilities TEXT, -- JSON
    benefits TEXT, -- JSON
    application_url TEXT,
    posted_date TIMESTAMP,
    application_deadline TIMESTAMP,
    tags TEXT, -- JSON
    company_info TEXT, -- JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Applications table
CREATE TABLE applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    job_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, submitted, failed, accepted, rejected
    application_data TEXT, -- JSON
    responses TEXT, -- JSON
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
CREATE INDEX idx_resume_data_user_id ON resume_data(user_id);
CREATE INDEX idx_job_listings_crawlfire_id ON job_listings(crawlfire_id);
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_agent_logs_user_id ON agent_logs(user_id);
CREATE INDEX idx_agent_logs_agent_name ON agent_logs(agent_name);
CREATE INDEX idx_agent_logs_created_at ON agent_logs(created_at); 