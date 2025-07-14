from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Job
from typing import Dict, Any, List

def get_comprehensive_stats(db: Session = None) -> Dict[str, Any]:
    """Get comprehensive job statistics"""
    if db is None:
        db = next(get_db())
    
    try:
        total_jobs = db.query(Job).count()
        
        # Jobs by platform
        platform_stats = db.query(
            Job.platform,
            func.count(Job.id).label('count')
        ).group_by(Job.platform).all()
        
        # Jobs by company
        company_stats = db.query(
            Job.company,
            func.count(Job.id).label('count')
        ).group_by(Job.company).order_by(func.count(Job.id).desc()).limit(10).all()
        
        return {
            "total_jobs": total_jobs,
            "platforms": [{"platform": p.platform, "count": p.count} for p in platform_stats],
            "top_companies": [{"company": c.company, "count": c.count} for c in company_stats]
        }
    except Exception as e:
        return {
            "total_jobs": 0,
            "platforms": [],
            "top_companies": [],
            "error": str(e)
        }

def get_simple_job_stats_by_source(db: Session = None) -> Dict[str, int]:
    """Get simple job statistics by platform"""
    if db is None:
        db = next(get_db())
    
    try:
        stats = db.query(
            Job.platform,
            func.count(Job.id).label('count')
        ).group_by(Job.platform).all()
        
        return {stat.platform or "unknown": stat.count for stat in stats}
    except Exception as e:
        return {"error": str(e)}