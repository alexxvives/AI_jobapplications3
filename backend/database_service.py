"""
Unified Database Service
Provides both SQLAlchemy ORM and raw SQL access to the same database
"""

import sqlite3
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from database import engine, SessionLocal, SCRAPING_DB_PATH
from models import Base, Job, User, Profile, Application, Company


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
        
        # The companies table from SQLAlchemy models is sufficient
        # No additional scraper-specific tables needed
    
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
                platform=job_data.get('platform', job_data.get('source', '')),
                job_type=job_data.get('job_type'),
                work_type=job_data.get('work_type'),
                experience_level=job_data.get('experience_level'),
                salary_range=job_data.get('salary_range')
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
    
    def save_company_result(self, company_name: str, url: str = None, job_count: int = 0) -> int:
        """Save company scraping result using simplified companies table"""
        db = self.get_sqlalchemy_session()
        try:
            # Check for existing company by name
            existing = db.query(Company).filter(Company.name == company_name).first()
            
            if existing:
                # Update existing company
                existing.job_count = job_count
                if url:
                    existing.url = url
                db.commit()
                return existing.id
            else:
                # Create new company
                company = Company(
                    name=company_name,
                    url=url,
                    job_count=job_count
                )
                db.add(company)
                db.commit()
                db.refresh(company)
                return company.id
                
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
    
    def get_job_count(self) -> int:
        """Get total number of jobs in database"""
        db = self.get_sqlalchemy_session()
        try:
            count = db.query(Job).count()
            return count
        finally:
            db.close()
    
    def get_jobs_by_platform(self) -> Dict[str, int]:
        """Get job counts grouped by platform"""
        conn = self.get_raw_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                SELECT platform, COUNT(*) as count 
                FROM jobs 
                GROUP BY platform
            ''')
            
            results = {}
            for row in cursor.fetchall():
                results[row[0]] = row[1]
            return results
            
        finally:
            conn.close()


# Global instance for import
db_service = UnifiedDatabaseService()