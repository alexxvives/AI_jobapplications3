"""
Unified Database Service
Provides both SQLAlchemy ORM and raw SQL access to the same database
"""

import sqlite3
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from database import engine, SessionLocal, SCRAPING_DB_PATH
from models import Base, Job, User, Profile, Application


class UnifiedDatabaseService:
    """
    Unified database service that ensures scrapers and FastAPI use the same database
    with compatible schemas
    """
    
    def __init__(self):
        self.db_path = SCRAPING_DB_PATH
        self.setup_database()
    
    def setup_database(self):
        """Create all tables using SQLAlchemy schema"""
        # Create all SQLAlchemy tables
        Base.metadata.create_all(bind=engine)
        
        # Create any additional scraper-specific tables if needed
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Company tracking table for scrapers
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS scraper_companies (
                id INTEGER PRIMARY KEY,
                name TEXT,
                domain TEXT,
                platform TEXT,
                url TEXT,
                status TEXT,
                job_count INTEGER DEFAULT 0,
                last_scraped TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def get_sqlalchemy_session(self) -> Session:
        """Get SQLAlchemy session for ORM operations"""
        return SessionLocal()
    
    def get_raw_connection(self):
        """Get raw SQLite connection for scraper operations"""
        return sqlite3.connect(self.db_path)
    
    def save_scraped_job(self, job_data: Dict[str, Any]) -> int:
        """
        Save job from scraper using SQLAlchemy schema
        Converts scraper format to SQLAlchemy Job model format
        """
        db = self.get_sqlalchemy_session()
        try:
            # Convert scraper job format to SQLAlchemy Job model
            job = Job(
                title=job_data.get('title', ''),
                company=job_data.get('company', ''),
                location=job_data.get('location', ''),
                description=job_data.get('description', ''),
                link=job_data.get('link', ''),
                source=job_data.get('platform', job_data.get('source', '')),
                job_type=job_data.get('job_type'),
                work_type=job_data.get('work_type'),
                experience_level=job_data.get('experience_level'),
                salary_range=job_data.get('salary_range'),
                remote_option=job_data.get('remote_option', False)
            )
            
            # Check for duplicates by link
            existing = db.query(Job).filter(Job.link == job.link).first()
            if existing:
                return existing.id
            
            db.add(job)
            db.commit()
            db.refresh(job)
            return job.id
            
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
    
    def save_scraped_jobs_batch(self, jobs: List[Dict[str, Any]]) -> List[int]:
        """Save multiple jobs in batch for efficiency"""
        job_ids = []
        for job_data in jobs:
            try:
                job_id = self.save_scraped_job(job_data)
                job_ids.append(job_id)
            except Exception as e:
                print(f"Error saving job {job_data.get('title', 'Unknown')}: {e}")
                continue
        return job_ids
    
    def save_company_result(self, company_name: str, domain: str, platform: str, 
                          url: str, status: str, job_count: int = 0) -> int:
        """Save company scraping result"""
        conn = self.get_raw_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO scraper_companies 
                (name, domain, platform, url, status, job_count, last_scraped)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (company_name, domain, platform, url, status, job_count))
            
            company_id = cursor.lastrowid
            conn.commit()
            return company_id
            
        finally:
            conn.close()
    
    def get_job_count(self) -> int:
        """Get total number of jobs in database"""
        db = self.get_sqlalchemy_session()
        try:
            count = db.query(Job).count()
            return count
        finally:
            db.close()
    
    def get_jobs_by_source(self) -> Dict[str, int]:
        """Get job counts grouped by source/platform"""
        conn = self.get_raw_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                SELECT source, COUNT(*) as count 
                FROM jobs 
                GROUP BY source
            ''')
            
            results = {}
            for row in cursor.fetchall():
                results[row[0]] = row[1]
            return results
            
        finally:
            conn.close()


# Global instance for import
db_service = UnifiedDatabaseService()