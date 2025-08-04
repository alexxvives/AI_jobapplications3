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
        
        # Jobs by company (exclude empty company names)
        company_stats = db.query(
            Job.company,
            func.count(Job.id).label('count')
        ).filter(Job.company.isnot(None), Job.company != "").group_by(Job.company).order_by(func.count(Job.id).desc()).all()
        
        # Companies by platform
        companies_by_platform_raw = db.query(
            Job.platform,
            func.count(func.distinct(Job.company)).label('company_count')
        ).filter(Job.company.isnot(None), Job.company != "").group_by(Job.platform).order_by(func.count(func.distinct(Job.company)).desc()).all()
        
        # Get company names for each platform
        companies_by_platform = []
        for platform, company_count in companies_by_platform_raw:
            # Get distinct company names for this platform
            platform_companies = db.query(func.distinct(Job.company)).filter(
                Job.platform == platform,
                Job.company.isnot(None),
                Job.company != ""
            ).all()
            
            company_names = sorted([company[0] for company in platform_companies])
            
            companies_by_platform.append({
                "platform": platform,
                "company_count": company_count,
                "companies": company_names
            })
        
        return {
            "total_jobs": total_jobs,
            "platforms": [{"platform": p.platform, "count": p.count} for p in platform_stats],
            "companies_by_platform": companies_by_platform,
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