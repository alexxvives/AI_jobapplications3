"""
Integration service for semantic job application automation
Advanced form filling with semantic field matching and AI fallback
"""

import asyncio
from typing import Dict, Any, Optional
from datetime import datetime
import logging
import os
import sys

# Add the modules directory to Python path for imports
modules_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)))
if modules_dir not in sys.path:
    sys.path.append(modules_dir)

try:
    from .semantic_form_filler import semantic_form_filler
    SEMANTIC_AVAILABLE = True
    print("✅ Semantic form filler available")
except ImportError as e:
    print(f"❌ Semantic form filler not available: {e}")
    SEMANTIC_AVAILABLE = False
    semantic_form_filler = None

class IntelligentJobApplicationService:
    """
    Service for semantic form filling with AI fallback
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.active_sessions = {}
    
    async def start_intelligent_automation(
        self, 
        job_url: str, 
        user_profile: Dict[str, Any],
        resume_file_path: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Start semantic form filling with AI fallback - NO BROWSER AUTOMATION
        """
        try:
            print(f"🔥 DEBUG INTEGRATION: ===== SEMANTIC FORM FILLING START =====")
            print(f"🔥 DEBUG INTEGRATION: VERSION: NO BROWSER AUTOMATION - JAVASCRIPT ONLY")
            print(f"🔥 DEBUG INTEGRATION: Job URL: {job_url}")
            print(f"🔥 DEBUG INTEGRATION: Resume path: {resume_file_path}")
            print(f"🔥 DEBUG INTEGRATION: Session ID: {session_id}")
            print(f"🔥 DEBUG INTEGRATION: Profile structure: {user_profile.keys() if user_profile else 'None'}")
            print(f"🔥 DEBUG INTEGRATION: Semantic form filler available: {SEMANTIC_AVAILABLE}")
            print(f"🔥 DEBUG INTEGRATION: About to call semantic_form_filler.fill_form_semantically()")
            
            if not SEMANTIC_AVAILABLE:
                print(f"🔥 DEBUG INTEGRATION: ❌ Semantic form filler not available, returning error")
                return {
                    "success": False,
                    "error": "Semantic form filler not available",
                    "message": "Dependencies missing for semantic form filling"
                }
            
            self.logger.info("🚀 Starting semantic form filling with AI fallback...")
            
            # Ensure resume path exists or use default
            if not resume_file_path or not os.path.exists(resume_file_path):
                # Use default resume path from temp_resumes
                temp_resume_dir = os.path.join(os.path.dirname(__file__), "..", "..", "backend", "temp_resumes")
                try:
                    resume_files = [f for f in os.listdir(temp_resume_dir) if f.endswith('.pdf')]
                    if resume_files:
                        resume_file_path = os.path.join(temp_resume_dir, resume_files[0])
                    else:
                        resume_file_path = "/user_data/resume.pdf"  # Fallback path
                except Exception as e:
                    print(f"DEBUG: Error finding resume files: {e}")
                    resume_file_path = "/user_data/resume.pdf"  # Fallback path
            
            print(f"DEBUG: Using resume path: {resume_file_path}")
            
            # Start semantic form filling
            print(f"🔥 DEBUG INTEGRATION: Calling semantic_form_filler.fill_form_semantically() NOW")
            result = await semantic_form_filler.fill_form_semantically(
                job_url=job_url,
                user_profile=user_profile,
                resume_path=resume_file_path
            )
            print(f"🔥 DEBUG INTEGRATION: ===== SEMANTIC FILLING RESULT =====")
            print(f"🔥 DEBUG INTEGRATION: Result keys: {list(result.keys()) if result else 'None'}")
            print(f"🔥 DEBUG INTEGRATION: Success: {result.get('success', False)}")
            print(f"🔥 DEBUG INTEGRATION: Fields filled: {result.get('fields_filled', 0)}")
            print(f"🔥 DEBUG INTEGRATION: Has JS injection: {'js_injection' in result}")
            print(f"🔥 DEBUG INTEGRATION: Full result: {result}")
            
            # Return result based on success
            if result.get("success", False):
                fields_filled = result.get("fields_filled", 0)
                semantic_matches = result.get("semantic_matches", 0)
                js_injection = result.get("js_injection", "")
                
                print(f"🔥 DEBUG INTEGRATION: ✅ SUCCESS PATH - Preparing response")
                print(f"🔥 DEBUG INTEGRATION: Fields: {fields_filled}, Matches: {semantic_matches}")
                print(f"🔥 DEBUG INTEGRATION: JS injection length: {len(js_injection) if js_injection else 0}")
                
                final_result = {
                    "success": True,
                    "automation_type": "semantic_with_ai_fallback", 
                    "status": "awaiting_user_confirmation",
                    "message": f"Semantic form filling completed - {fields_filled} fields filled with {semantic_matches} semantic matches",
                    "tab_url": job_url,
                    "application_url": job_url,
                    "fields_filled": [{"field": f"semantic_field_{i}", "value": "auto-filled"} for i in range(fields_filled)],
                    "session_id": session_id,
                    "require_manual_submit": True,
                    "semantic_matches": semantic_matches,
                    "total_fields_filled": fields_filled,
                    "js_injection": js_injection,
                    "form_data": result.get("form_data", {})
                }
                
                print(f"🔥 DEBUG INTEGRATION: ===== FINAL SUCCESS RESPONSE =====")
                print(f"🔥 DEBUG INTEGRATION: Response automation_type: {final_result['automation_type']}")
                print(f"🔥 DEBUG INTEGRATION: Response status: {final_result['status']}")
                print(f"🔥 DEBUG INTEGRATION: Response success: {final_result['success']}")
                
                return final_result
            else:
                return {
                    "success": False,
                    "automation_type": "tab_only",
                    "error": result.get("error", "Failed to prepare tab URL"),
                    "message": result.get("message", "Failed to prepare job URL"),
                    "stop_process": True
                }
            
        except Exception as e:
            print(f"DEBUG: ❌ LangChain integration exception: {str(e)}")
            import traceback
            print(f"DEBUG: Exception traceback: {traceback.format_exc()}")
            
            self.logger.error(f"Chrome tab automation failed: {e}")
            
            try:
                await chrome_tab_automation.close_connection()
                print(f"DEBUG: Chrome connection closed after exception")
            except Exception as cleanup_error:
                print(f"DEBUG: Chrome cleanup failed: {cleanup_error}")
            
            return {
                "success": False,
                "automation_type": "chrome_tab_only",
                "error": str(e),
                "stop_process": True,
                "no_fallback": True
            }
    
    async def _user_progress_callback(self, progress_data: Dict[str, Any]):
        """
        Callback for providing real-time progress feedback to users
        """
        status = progress_data.get("status", "")
        
        if status == "analyzing_form":
            self.logger.info("🔍 AI is analyzing the job application form...")
        elif status == "mapping_fields":
            self.logger.info("🎯 AI is mapping your profile data to form fields...")
        elif status == "filling_form":
            filled = progress_data.get("filled_fields", 0)
            total = progress_data.get("total_fields", 0)
            self.logger.info(f"✍️  AI is filling form fields... ({filled}/{total})")
        elif status == "uploading_files":
            self.logger.info("📄 AI is uploading your resume...")
        elif status == "filling_complete":
            filled = progress_data.get("filled_fields", 0)
            errors = progress_data.get("errors", 0)
            if errors == 0:
                self.logger.info(f"✅ Form filling completed successfully! {filled} fields filled.")
            else:
                self.logger.info(f"⚠️  Form filling completed with {errors} issues. {filled} fields filled.")
    
    async def get_session_status(self, session_id: str) -> Dict[str, Any]:
        """
        Get status of an active automation session
        """
        session = self.active_sessions.get(session_id)
        if not session:
            return {
                "success": False,
                "error": "Session not found"
            }
        
        return {
            "success": True,
            "session_active": True,
            "result": session["result"],
            "started_at": session["started_at"]
        }
    
    async def complete_session(self, session_id: str) -> Dict[str, Any]:
        """
        Complete and cleanup an automation session
        """
        session = self.active_sessions.get(session_id)
        if session:
            await chrome_tab_automation.close_connection()
            del self.active_sessions[session_id]
            
            return {
                "success": True,
                "message": "Session completed and cleaned up"
            }
        
        return {
            "success": False,
            "error": "Session not found"
        }
    
    async def fallback_to_traditional(
        self, 
        job_url: str, 
        user_profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Fallback to traditional Selenium automation if AI fails
        """
        try:
            # Import traditional automation
            from ..job_application.form_filler import VisualJobApplicationAutomator
            
            traditional_automator = VisualJobApplicationAutomator()
            
            # Use traditional automation as fallback
            result = await traditional_automator.fill_job_application(
                job_url=job_url,
                user_profile=user_profile
            )
            
            return {
                "success": True,
                "automation_type": "traditional_selenium",
                "result": result,
                "message": "Fallback to traditional automation completed"
            }
            
        except Exception as e:
            return {
                "success": False,
                "automation_type": "fallback_failed",
                "error": str(e),
                "message": "Both AI and traditional automation failed"
            }

# Global service instance
intelligent_automation_service = IntelligentJobApplicationService()