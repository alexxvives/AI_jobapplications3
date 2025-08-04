#!/usr/bin/env python3
"""
Centralized database configuration
Always points to backend/job_automation.db regardless of working directory
"""

import os

# Get absolute path to backend directory
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))

# Database paths - always in backend directory
DB_PATH = os.path.join(BACKEND_DIR, "job_automation.db")
TRACKER_PATH = os.path.join(BACKEND_DIR, "scrapers", "lever", "company_job_tracker.json")

# For SQLAlchemy
DATABASE_URL = f"sqlite:///{DB_PATH}"

def get_db_path():
    """Get absolute path to database file"""
    return DB_PATH

def get_tracker_path():
    """Get absolute path to company tracker file"""
    return TRACKER_PATH

def get_database_url():
    """Get SQLAlchemy database URL"""
    return DATABASE_URL

if __name__ == "__main__":
    print("Database Configuration:")
    print(f"  Backend Dir: {BACKEND_DIR}")
    print(f"  DB Path: {DB_PATH}")
    print(f"  Tracker Path: {TRACKER_PATH}")
    print(f"  Database URL: {DATABASE_URL}")