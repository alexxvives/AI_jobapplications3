"""
Enhanced Job Application Automation Service
Manages automation sessions, progress tracking, and Chrome extension communication
"""

import uuid
import time
from typing import Dict, List, Optional, Any
from datetime import datetime
from dataclasses import dataclass, asdict
from enum import Enum
import json


class AutomationStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress" 
    WAITING_FOR_SUBMISSION = "waiting_for_submission"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobApplicationStatus(Enum):
    PENDING = "pending"
    FORM_FILLING = "form_filling"
    WAITING_FOR_USER = "waiting_for_user"
    SUBMITTED = "submitted"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class JobApplicationTask:
    job_id: int
    job_url: str
    job_title: str
    company_name: str
    status: JobApplicationStatus = JobApplicationStatus.PENDING
    tab_id: Optional[int] = None
    form_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


@dataclass
class AutomationSession:
    session_id: str
    user_id: int
    profile_id: int
    jobs: List[JobApplicationTask]
    current_job_index: int = 0
    status: AutomationStatus = AutomationStatus.PENDING
    created_at: datetime = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    total_jobs: int = 0
    completed_jobs: int = 0
    failed_jobs: int = 0

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()
        self.total_jobs = len(self.jobs)


class JobAutomationService:
    """Manages job application automation sessions"""
    
    def __init__(self):
        self.active_sessions: Dict[str, AutomationSession] = {}
    
    def create_session(self, user_id: int, profile_id: int, selected_jobs: List[Dict[str, Any]]) -> str:
        """Create a new automation session"""
        session_id = str(uuid.uuid4())
        
        # Convert job data to automation tasks
        tasks = []
        for job_data in selected_jobs:
            task = JobApplicationTask(
                job_id=job_data['id'],
                job_url=job_data['link'],
                job_title=job_data['title'],
                company_name=job_data['company']
            )
            tasks.append(task)
        
        session = AutomationSession(
            session_id=session_id,
            user_id=user_id,
            profile_id=profile_id,
            jobs=tasks
        )
        
        self.active_sessions[session_id] = session
        print(f"✅ Created automation session {session_id} with {len(tasks)} jobs")
        
        return session_id
    
    def get_session(self, session_id: str) -> Optional[AutomationSession]:
        """Get automation session by ID"""
        return self.active_sessions.get(session_id)
    
    def start_session(self, session_id: str) -> Dict[str, Any]:
        """Start the automation session"""
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        session.status = AutomationStatus.IN_PROGRESS
        session.started_at = datetime.now()
        
        if session.jobs:
            # Start with the first job
            current_job = session.jobs[session.current_job_index]
            current_job.status = JobApplicationStatus.FORM_FILLING
            current_job.started_at = datetime.now()
            
            return {
                "session_id": session_id,
                "status": "started",
                "current_job": self._job_to_dict(current_job),
                "progress": {
                    "current": session.current_job_index + 1,
                    "total": session.total_jobs,
                    "completed": session.completed_jobs
                },
                "next_action": "open_job_tab",
                "job_url": current_job.job_url
            }
        
        return {"error": "No jobs in session"}
    
    def get_current_job(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get the current job being processed"""
        session = self.get_session(session_id)
        if not session or session.current_job_index >= len(session.jobs):
            return None
        
        current_job = session.jobs[session.current_job_index]
        return {
            "job": self._job_to_dict(current_job),
            "progress": {
                "current": session.current_job_index + 1,
                "total": session.total_jobs,
                "completed": session.completed_jobs
            },
            "session_status": session.status.value
        }
    
    def mark_job_form_filled(self, session_id: str, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """Mark current job as form filled and waiting for user submission"""
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        current_job = session.jobs[session.current_job_index]
        current_job.status = JobApplicationStatus.WAITING_FOR_USER
        current_job.form_data = form_data
        session.status = AutomationStatus.WAITING_FOR_SUBMISSION
        
        print(f"📝 Job {current_job.job_title} form filled, waiting for user submission")
        
        return {
            "status": "waiting_for_submission",
            "message": "Form filled. Please review and submit the application.",
            "job": self._job_to_dict(current_job)
        }
    
    def mark_job_submitted(self, session_id: str, success: bool = True, error_message: str = None) -> Dict[str, Any]:
        """Mark current job as submitted and move to next job"""
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        # Handle recovery from failed state
        if session.status == AutomationStatus.FAILED:
            print(f"🔄 Recovering session {session_id} from failed state")
            session.status = AutomationStatus.IN_PROGRESS
        
        current_job = session.jobs[session.current_job_index]
        current_job.completed_at = datetime.now()
        
        if success:
            current_job.status = JobApplicationStatus.SUBMITTED
            session.completed_jobs += 1
            print(f"✅ Job {current_job.job_title} submitted successfully")
        else:
            current_job.status = JobApplicationStatus.FAILED
            current_job.error_message = error_message or "Unknown error occurred"
            session.failed_jobs += 1
            print(f"❌ Job {current_job.job_title} failed: {current_job.error_message}")
            
            # Check if we should retry this job
            if self._should_retry_job(current_job, error_message):
                return self._retry_current_job(session, error_message)
        
        # Move to next job
        session.current_job_index += 1
        
        # Check if we're done
        if session.current_job_index >= len(session.jobs):
            session.status = AutomationStatus.COMPLETED
            session.completed_at = datetime.now()
            
            return {
                "status": "session_completed",
                "message": f"All jobs completed. {session.completed_jobs} successful, {session.failed_jobs} failed.",
                "summary": {
                    "total": session.total_jobs,
                    "completed": session.completed_jobs,
                    "failed": session.failed_jobs
                }
            }
        
        # Start next job with error handling
        try:
            next_job = session.jobs[session.current_job_index]
            next_job.status = JobApplicationStatus.FORM_FILLING
            next_job.started_at = datetime.now()
            session.status = AutomationStatus.IN_PROGRESS
            
            return {
                "status": "next_job_ready",
                "message": f"Moving to next job: {next_job.job_title}",
                "current_job": self._job_to_dict(next_job),
                "progress": {
                    "current": session.current_job_index + 1,
                    "total": session.total_jobs,
                    "completed": session.completed_jobs,
                    "failed": session.failed_jobs
                },
                "next_action": "open_job_tab",
                "job_url": next_job.job_url
            }
        except Exception as e:
            print(f"❌ Error starting next job: {e}")
            session.status = AutomationStatus.FAILED
            return {
                "status": "error",
                "message": f"Failed to start next job: {str(e)}",
                "error": str(e)
            }
    
    def get_session_status(self, session_id: str) -> Dict[str, Any]:
        """Get full session status"""
        session = self.get_session(session_id)
        if not session:
            return {"error": "Session not found"}
        
        return {
            "session_id": session_id,
            "status": session.status.value,
            "user_id": session.user_id,
            "profile_id": session.profile_id,
            "created_at": session.created_at.isoformat(),
            "started_at": session.started_at.isoformat() if session.started_at else None,
            "completed_at": session.completed_at.isoformat() if session.completed_at else None,
            "progress": {
                "current": session.current_job_index + 1 if session.current_job_index < len(session.jobs) else session.total_jobs,
                "total": session.total_jobs,
                "completed": session.completed_jobs,
                "failed": session.failed_jobs
            },
            "jobs": [self._job_to_dict(job) for job in session.jobs]
        }
    
    def cancel_session(self, session_id: str) -> Dict[str, Any]:
        """Cancel an active session"""
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        session.status = AutomationStatus.CANCELLED
        session.completed_at = datetime.now()
        
        return {
            "status": "cancelled",
            "message": "Automation session cancelled",
            "session_id": session_id
        }
    
    def _job_to_dict(self, job: JobApplicationTask) -> Dict[str, Any]:
        """Convert job task to dictionary"""
        return {
            "job_id": job.job_id,
            "job_url": job.job_url,
            "job_title": job.job_title,
            "company_name": job.company_name,
            "status": job.status.value,
            "tab_id": job.tab_id,
            "form_data": job.form_data,
            "error_message": job.error_message,
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None
        }
    
    def cleanup_old_sessions(self, max_age_hours: int = 24):
        """Clean up old completed/cancelled sessions"""
        current_time = datetime.now()
        to_remove = []
        
        for session_id, session in self.active_sessions.items():
            if session.completed_at:
                age_hours = (current_time - session.completed_at).total_seconds() / 3600
                if age_hours > max_age_hours:
                    to_remove.append(session_id)
        
        for session_id in to_remove:
            del self.active_sessions[session_id]
            print(f"🧹 Cleaned up old session {session_id}")

    def _should_retry_job(self, job: JobApplicationTask, error_message: str) -> bool:
        """Determine if a job should be retried based on error type"""
        if not error_message:
            return False
            
        # Don't retry if already attempted too many times
        retry_count = getattr(job, 'retry_count', 0)
        if retry_count >= 2:  # Max 2 retries
            return False
            
        # Retry for certain types of errors
        retryable_errors = [
            'timeout',
            'network error',
            'connection refused',
            'page not found',
            'form not detected',
            'fields not found'
        ]
        
        error_lower = error_message.lower()
        return any(err in error_lower for err in retryable_errors)
    
    def _retry_current_job(self, session: AutomationSession, error_message: str) -> Dict[str, Any]:
        """Retry the current job with error recovery"""
        current_job = session.jobs[session.current_job_index]
        
        # Increment retry count
        if not hasattr(current_job, 'retry_count'):
            current_job.retry_count = 0
        current_job.retry_count += 1
        
        # Reset job status for retry
        current_job.status = JobApplicationStatus.PENDING
        current_job.error_message = None
        current_job.started_at = None
        current_job.completed_at = None
        
        print(f"🔄 Retrying job {current_job.job_title} (attempt {current_job.retry_count + 1})")
        
        return {
            "status": "job_retry",
            "message": f"Retrying job: {current_job.job_title} (attempt {current_job.retry_count + 1})",
            "current_job": self._job_to_dict(current_job),
            "retry_count": current_job.retry_count,
            "previous_error": error_message,
            "next_action": "retry_job",
            "job_url": current_job.job_url
        }

    def recover_session(self, session_id: str) -> Dict[str, Any]:
        """Recover a failed session by resetting current job"""
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        if session.status not in [AutomationStatus.FAILED, AutomationStatus.CANCELLED]:
            return {
                "status": "no_recovery_needed",
                "message": "Session is not in a failed state"
            }
        
        # Reset current job if it failed
        if session.current_job_index < len(session.jobs):
            current_job = session.jobs[session.current_job_index]
            if current_job.status == JobApplicationStatus.FAILED:
                current_job.status = JobApplicationStatus.PENDING
                current_job.error_message = None
                current_job.started_at = None
                current_job.completed_at = None
        
        # Reset session status
        session.status = AutomationStatus.IN_PROGRESS
        
        print(f"🔧 Recovered session {session_id}")
        
        return {
            "status": "session_recovered",
            "message": "Session has been recovered and can continue",
            "current_job": self._job_to_dict(session.jobs[session.current_job_index]) if session.current_job_index < len(session.jobs) else None
        }

    def skip_current_job(self, session_id: str, reason: str = "User skipped") -> Dict[str, Any]:
        """Skip the current job and move to the next one"""
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        current_job = session.jobs[session.current_job_index]
        current_job.status = JobApplicationStatus.SKIPPED
        current_job.error_message = reason
        current_job.completed_at = datetime.now()
        
        print(f"⏭️ Skipped job {current_job.job_title}: {reason}")
        
        # Move to next job
        session.current_job_index += 1
        
        # Check if we're done
        if session.current_job_index >= len(session.jobs):
            session.status = AutomationStatus.COMPLETED
            session.completed_at = datetime.now()
            
            return {
                "status": "session_completed",
                "message": f"All jobs completed. {session.completed_jobs} successful, {session.failed_jobs} failed.",
                "summary": {
                    "total": session.total_jobs,
                    "completed": session.completed_jobs,
                    "failed": session.failed_jobs
                }
            }
        
        # Start next job
        next_job = session.jobs[session.current_job_index]
        next_job.status = JobApplicationStatus.FORM_FILLING
        next_job.started_at = datetime.now()
        session.status = AutomationStatus.IN_PROGRESS
        
        return {
            "status": "next_job_ready",
            "message": f"Skipped job, moving to: {next_job.job_title}",
            "current_job": self._job_to_dict(next_job),
            "progress": {
                "current": session.current_job_index + 1,
                "total": session.total_jobs,
                "completed": session.completed_jobs,
                "failed": session.failed_jobs
            },
            "next_action": "open_job_tab",
            "job_url": next_job.job_url
        }


# Global instance
automation_service = JobAutomationService()