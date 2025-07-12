"""
Browser Tab Automation - Opens job applications in regular browser tabs
NO Chromium window automation - tab-based approach only
"""

import json
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime
import logging

class ChromeTabAutomation:
    """
    Prepares job application URLs and form data for regular browser tab opening
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.active_job_tabs = {}
    
    async def open_tab_only(self, job_url: str, user_profile: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Prepare URL and form filling data for tab opening
        """
        try:
            # Transform Lever URLs
            if "jobs.lever.co" in job_url and not job_url.endswith("/apply"):
                job_url = job_url.rstrip("/") + "/apply"
                self.logger.info(f"🔗 Lever URL transformed to: {job_url}")
            
            self.logger.info(f"📂 Preparing job URL for tab: {job_url}")
            
            # Extract profile data for form filling
            form_data = {}
            if user_profile:
                form_data = self._extract_form_data(user_profile)
                
            return {
                "success": True,
                "message": "Tab URL prepared with form data",
                "tab_url": job_url,
                "form_data": form_data,
                "action": "tab_with_form_data"
            }
            
        except Exception as e:
            self.logger.error(f"Error preparing tab URL: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": f"Failed to prepare tab URL: {str(e)}"
            }
    
    def _extract_form_data(self, user_profile: Dict[str, Any]) -> Dict[str, str]:
        """Extract form data from user profile"""
        try:
            personal = user_profile.get("personal_information", {})
            
            # Handle nested structure
            basic_info = personal.get("basic_information", {})
            contact_info = personal.get("contact_information", {})
            address_info = personal.get("address", {})
            
            # Extract name
            full_name = basic_info.get("full_name") or personal.get("full_name") or ""
            if not full_name and basic_info.get("first_name"):
                full_name = f"{basic_info.get('first_name', '')} {basic_info.get('last_name', '')}".strip()
            
            name_parts = full_name.split() if full_name else []
            first_name = name_parts[0] if name_parts else ""
            last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
            
            # Extract contact details
            email = contact_info.get("email") or personal.get("email") or ""
            phone = contact_info.get("telephone") or contact_info.get("phone") or personal.get("phone") or ""
            
            # Extract address
            city = address_info.get("city") or personal.get("city") or ""
            state = address_info.get("state") or personal.get("state") or ""
            zip_code = address_info.get("zip_code") or personal.get("zip_code") or ""
            country = address_info.get("country") or personal.get("country") or ""
            
            # Work experience
            work_exp = user_profile.get("work_experience", [])
            current_company = ""
            current_title = ""
            if work_exp and isinstance(work_exp, list) and len(work_exp) > 0:
                latest_job = work_exp[0]
                if isinstance(latest_job, dict):
                    current_company = latest_job.get("company", "")
                    current_title = latest_job.get("title", "")
            
            return {
                "full_name": full_name,
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "phone": phone,
                "city": city,
                "state": state,
                "zip_code": zip_code,
                "country": country,
                "current_company": current_company,
                "current_title": current_title
            }
            
        except Exception as e:
            self.logger.error(f"Error extracting form data: {e}")
            return {}
    
    async def open_job_in_tab(self, job_url: str, user_profile: Dict[str, Any], session_id: str) -> Dict[str, Any]:
        """
        Prepare job URL and form data for regular browser tab opening - NO CHROMIUM WINDOW
        """
        try:
            print(f"DEBUG: ===== PREPARING TAB URL WITH FORM DATA =====")
            print(f"DEBUG: Job URL: {job_url}")
            print(f"DEBUG: Session ID: {session_id}")
            print(f"DEBUG: User profile keys: {list(user_profile.keys()) if user_profile else 'None'}")
            
            # Transform Lever URLs
            if "jobs.lever.co" in job_url and not job_url.endswith("/apply"):
                job_url = job_url.rstrip("/") + "/apply"
                print(f"DEBUG: 🔗 Lever URL transformed to: {job_url}")
            
            # Extract form data from user profile for tab filling
            print(f"DEBUG: 📝 Extracting form data from profile...")
            form_data = self._extract_form_data(user_profile)
            print(f"DEBUG: Extracted form data: {form_data}")
            
            # Count non-empty fields
            filled_fields_count = len([v for v in form_data.values() if v and v.strip()])
            print(f"DEBUG: Ready to fill {filled_fields_count} fields in tab")
            
            return {
                "success": True,
                "message": f"Tab ready with {filled_fields_count} form fields prepared",
                "tab_url": job_url,
                "application_url": job_url,
                "form_data": form_data,
                "fields_filled": [{"field": k, "value": v} for k, v in form_data.items() if v and v.strip()],
                "session_id": session_id,
                "require_manual_submit": True,
                "tab_ready": True
            }
            
        except Exception as e:
            print(f"DEBUG: ❌ Exception in tab preparation: {str(e)}")
            import traceback
            print(f"DEBUG: Full traceback: {traceback.format_exc()}")
            
            return {
                "success": False,
                "error": str(e),
                "message": f"Failed to prepare tab: {str(e)}"
            }
    
    async def check_submission(self, session_id: str) -> Dict[str, Any]:
        """Check if user has submitted the job application"""
        try:
            if session_id not in self.active_job_tabs:
                return {"success": False, "error": "Session not found"}
            
            return {
                "success": True,
                "submitted": False,
                "message": "Job application not submitted yet"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def close_connection(self):
        """Close any active connections"""
        try:
            self.active_job_tabs.clear()
            self.logger.info("🔌 Cleared active job tabs")
        except Exception as e:
            self.logger.error(f"Error clearing job tabs: {e}")

# Global instance
chrome_tab_automation = ChromeTabAutomation()