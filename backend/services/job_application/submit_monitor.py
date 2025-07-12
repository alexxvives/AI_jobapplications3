"""
Submit monitoring service for tab-based automation
Detects when user submits a job application to control job progression
"""

import asyncio
from typing import Dict, Any, Optional
from datetime import datetime
import logging

from .chrome_tab_automation import chrome_tab_automation

class SubmitMonitorService:
    """
    Monitors job application submissions to control when next job should open
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.monitoring_sessions = {}
    
    async def start_monitoring(self, session_id: str, timeout: int = 300) -> Dict[str, Any]:
        """
        Start monitoring for form submission on the current job
        """
        try:
            self.logger.info(f"⏳ Starting submit monitoring for session {session_id}")
            
            # Use Chrome tab automation's submission check
            result = await chrome_tab_automation.check_submission(session_id)
            
            if result.get("submitted", False):
                self.logger.info(f"✅ Form submitted successfully for session {session_id}")
                return {
                    "success": True,
                    "submitted": True,
                    "message": "Form successfully submitted by user",
                    "can_proceed_to_next": True,
                    "session_id": session_id
                }
            else:
                self.logger.warning(f"⚠️ Form not submitted yet for session {session_id}")
                return {
                    "success": False,
                    "submitted": False,
                    "message": "User has not submitted the form yet",
                    "can_proceed_to_next": False,
                    "session_id": session_id,
                    "timeout": False
                }
                
        except Exception as e:
            self.logger.error(f"Error monitoring submission: {e}")
            return {
                "success": False,
                "submitted": False,
                "error": str(e),
                "can_proceed_to_next": False,
                "session_id": session_id
            }
    
    async def check_submission_status(self, session_id: str) -> Dict[str, Any]:
        """
        Check if a job has been submitted without waiting
        """
        try:
            # Use Chrome tab automation's submission check
            result = await chrome_tab_automation.check_submission(session_id)
            
            if result.get("submitted", False):
                self.logger.info(f"✅ Form appears to have been submitted")
                return {
                    "success": True,
                    "submitted": True,
                    "message": "Form appears to have been submitted",
                    "can_proceed_to_next": True
                }
            elif result.get("success", False):
                return {
                    "success": True,
                    "submitted": False,
                    "message": "Form has not been submitted yet",
                    "can_proceed_to_next": False
                }
            else:
                return {
                    "success": False,
                    "error": result.get("error", "Session not found"),
                    "can_proceed_to_next": False
                }
                
        except Exception as e:
            self.logger.error(f"Error checking submission status: {e}")
            return {
                "success": False,
                "error": str(e),
                "can_proceed_to_next": False
            }

# Global instance
submit_monitor = SubmitMonitorService()