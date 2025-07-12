import os
import tempfile
import json
import uuid
from typing import Dict, Any, List, Optional
from fastapi import HTTPException, UploadFile
from datetime import datetime
import asyncio
# REMOVED: from visual_automation import visual_automator - NO BROWSER AUTOMATION

# Import new LangChain automation with improved fallback handling
try:
    import sys
    import os
    sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'modules'))
    from job_application.integration_service import intelligent_automation_service
    LANGCHAIN_AVAILABLE = True
    print("✅ LangChain automation available (with fallback support)")
except ImportError as e:
    print(f"⚠️  LangChain automation not available: {e}")
    print("📝 Will use traditional automation only")
    LANGCHAIN_AVAILABLE = False

class JobApplicationAutomator:
    """
    Handles automated job application process with user control points
    """
    
    def __init__(self):
        self.max_applications_per_session = 5
        self.temp_resume_dir = os.path.join(os.getcwd(), "storage", "temp_automation")
        self.active_sessions = {}
        self.active_browser_sessions = {}  # Track browser sessions
        
        # Ensure temporary resume directory exists (for automation file uploads only)
        os.makedirs(self.temp_resume_dir, exist_ok=True)
    
    async def start_automation_session(self, jobs: List[Dict], user_profile: Dict, resume_file: UploadFile) -> Dict[str, Any]:
        """
        Start a new automation session for multiple jobs
        """
        try:
            # Validate session limits
            if len(jobs) > self.max_applications_per_session:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Maximum {self.max_applications_per_session} applications per session allowed"
                )
            
            if not jobs:
                raise HTTPException(status_code=400, detail="No jobs provided for automation")
            
            # Validate user profile
            if not self._validate_user_profile(user_profile):
                raise HTTPException(status_code=400, detail="Incomplete user profile")
            
            # Store resume file
            resume_path = await self._store_resume_file(resume_file)
            
            # Create session
            session_id = str(uuid.uuid4())
            session_data = {
                "session_id": session_id,
                "jobs": jobs,
                "user_profile": user_profile,
                "resume_path": resume_path,
                "current_job_index": 0,
                "status": "ready",
                "results": [],
                "created_at": datetime.now().isoformat()
            }
            
            self.active_sessions[session_id] = session_data
            
            return {
                "success": True,
                "session_id": session_id,
                "total_jobs": len(jobs),
                "message": "Automation session created successfully"
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to start automation session: {str(e)}")
    
    async def process_next_job(self, session_id: str) -> Dict[str, Any]:
        """
        Process the next job in the automation session with visual automation
        """
        try:
            session = self.active_sessions.get(session_id)
            if not session:
                raise HTTPException(status_code=404, detail="Automation session not found")
            
            # Check if session has failed - if so, stop everything
            if session.get("status") == "failed":
                print(f"DEBUG: 🛑 Session has failed - stopping all job processing")
                return {
                    "success": False,
                    "status": "session_failed",
                    "message": f"Session failed: {session.get('error', 'Unknown error')} - all job processing stopped",
                    "error": session.get("error", "Session failed"),
                    "stop_all_jobs": True
                }
            
            # Check if current job is awaiting submission - if so, don't process next
            if session.get("current_job_needs_submission", False):
                print(f"🚀 DEBUG AUTOMATION: ⛔ BLOCKING NEXT JOB - Current job awaiting submission")
                print(f"🚀 DEBUG AUTOMATION: current_job_needs_submission: {session.get('current_job_needs_submission')}")
                print(f"🚀 DEBUG AUTOMATION: current_job_index: {session.get('current_job_index')}")
                return {
                    "success": False,
                    "status": "awaiting_submission",
                    "message": "Please submit the current job before proceeding to the next one",
                    "current_job_index": session["current_job_index"],
                    "require_submission": True
                }
            
            current_index = session["current_job_index"]
            jobs = session["jobs"]
            
            if current_index >= len(jobs):
                session["status"] = "completed"
                # Clean up any browser sessions
                await self._cleanup_browser_session(session_id)
                return {
                    "success": True,
                    "status": "completed",
                    "message": "All jobs processed"
                }
            
            current_job = jobs[current_index]
            user_profile = session["user_profile"]
            resume_path = session.get("resume_path")
            
            # Try LangChain AI automation first, then visual automation as fallback
            automation_result = None
            
            print(f"DEBUG: ===== AUTOMATION FLOW START =====")
            print(f"DEBUG: Job URL: {current_job.get('link', '')}")
            print(f"DEBUG: Job Title: {current_job.get('title', '')}")
            print(f"DEBUG: LangChain Available: {LANGCHAIN_AVAILABLE}")
            print(f"DEBUG: Session ID: {session_id}")
            
            if LANGCHAIN_AVAILABLE:
                try:
                    print(f"🚀 DEBUG AUTOMATION: ===== AUTOMATION SERVICE START =====")
                    print(f"🚀 DEBUG AUTOMATION: VERSION: NO BROWSER AUTOMATION - SEMANTIC JAVASCRIPT ONLY")
                    print(f"🚀 DEBUG AUTOMATION: ✅ Attempting SEMANTIC FORM FILLING for {current_job.get('title', '')}")
                    print(f"🚀 DEBUG AUTOMATION: Profile keys: {list(user_profile.keys()) if user_profile else 'None'}")
                    print(f"🚀 DEBUG AUTOMATION: Resume path: {resume_path}")
                    print(f"🚀 DEBUG AUTOMATION: About to call intelligent_automation_service.start_intelligent_automation()")
                    
                    automation_result = await intelligent_automation_service.start_intelligent_automation(
                        job_url=current_job.get("link", ""),
                        user_profile=user_profile,
                        resume_file_path=resume_path,
                        session_id=session_id
                    )
                    
                    print(f"🚀 DEBUG AUTOMATION: ===== AUTOMATION RESULT RECEIVED =====")
                    print(f"🚀 DEBUG AUTOMATION: Result keys: {list(automation_result.keys()) if automation_result else 'None'}")
                    print(f"🚀 DEBUG AUTOMATION: Success: {automation_result.get('success', False)}")
                    print(f"🚀 DEBUG AUTOMATION: Automation type: {automation_result.get('automation_type', 'unknown')}")
                    print(f"🚀 DEBUG AUTOMATION: Status: {automation_result.get('status', 'unknown')}")
                    print(f"🚀 DEBUG AUTOMATION: Has JS injection: {'js_injection' in automation_result}")
                    print(f"🚀 DEBUG AUTOMATION: Full result: {automation_result}")
                    
                    # Check for STOP conditions - no more jobs if anything fails
                    if automation_result.get("stop_process", False) or not automation_result.get("success", False):
                        print(f"DEBUG: 🛑 STOPPING ENTIRE PROCESS - Chrome tab automation failed")
                        print(f"DEBUG: Error: {automation_result.get('error', 'Unknown error')}")
                        
                        # Mark session as failed and stop processing
                        session["status"] = "failed"
                        session["error"] = automation_result.get("error", "Chrome tab automation failed")
                        
                        return {
                            "success": False,
                            "status": "process_stopped",
                            "message": automation_result.get("message", "Chrome tab automation failed - process stopped"),
                            "error": automation_result.get("error", "Automation failed"),
                            "automation_type": "chrome_tab_only",
                            "stop_all_jobs": True,
                            "session_id": session_id
                        }
                    
                    # Only continue if success
                    if automation_result.get("success", False):
                        print(f"DEBUG: ✅ Chrome tab automation succeeded")
                        print(f"DEBUG: Automation type: {automation_result.get('automation_type', 'unknown')}")
                        print(f"DEBUG: Result status: {automation_result.get('status', 'unknown')}")
                        
                except Exception as e:
                    print(f"DEBUG: 💥 Chrome tab automation exception: {str(e)}")
                    import traceback
                    print(f"DEBUG: Exception traceback: {traceback.format_exc()}")
                    
                    # STOP EVERYTHING on exception
                    session["status"] = "failed"
                    session["error"] = str(e)
                    
                    return {
                        "success": False,
                        "status": "process_stopped",
                        "message": f"Chrome tab automation exception: {str(e)} - process stopped",
                        "error": str(e),
                        "automation_type": "chrome_tab_only",
                        "stop_all_jobs": True,
                        "session_id": session_id
                    }
            else:
                print(f"DEBUG: 🛑 Chrome tab automation not available - STOPPING")
                
                # STOP if Chrome tab automation not available
                session["status"] = "failed"
                session["error"] = "Chrome tab automation not available"
                
                return {
                    "success": False,
                    "status": "process_stopped", 
                    "message": "Chrome tab automation not available - process stopped",
                    "error": "Chrome tab automation not available",
                    "automation_type": "none",
                    "stop_all_jobs": True,
                    "session_id": session_id
                }
            
            # NO FALLBACKS - Chrome tab automation result is final
            print(f"DEBUG: ===== NO FALLBACKS - CHROME TAB ONLY =====")
            print(f"DEBUG: Using Chrome tab automation result as final result")
            
            # Update session status based on automation result
            session["status"] = automation_result.get("status", "unknown")
            session["current_job"] = current_job
            session["automation_result"] = automation_result
            
            # Store browser session reference
            self.active_browser_sessions[session_id] = {
                "job_index": current_index,
                "job": current_job,
                "automation_start_time": datetime.now().isoformat()
            }
            
            if automation_result["success"]:
                # Apply URL transformations for application_url too
                original_url = current_job.get("link", "")
                print(f"DEBUG: Success path - Original URL: {original_url}")
                if "jobs.lever.co" in original_url and not original_url.endswith("/apply"):
                    application_url = original_url.rstrip("/") + "/apply"
                    print(f"DEBUG: Success path - Transformed to: {application_url}")
                else:
                    application_url = original_url
                    print(f"DEBUG: Success path - No transformation: {application_url}")
                
                # Check if this requires manual submission
                if automation_result.get("require_manual_submit", False) or automation_result.get("status") == "awaiting_user_confirmation" or automation_result.get("status") == "tab_ready":
                    print(f"DEBUG: Automation requires manual submission - NOT advancing to next job")
                    print(f"DEBUG: automation_result keys: {list(automation_result.keys())}")
                    print(f"DEBUG: automation_result automation_type: {automation_result.get('automation_type')}")
                    print(f"DEBUG: automation_result status: {automation_result.get('status')}")
                    
                    # Store the current state for submit monitoring
                    print(f"🚀 DEBUG AUTOMATION: 🔒 SETTING submission flag - next job will be blocked")
                    session["current_job_needs_submission"] = True
                    session["current_job_session_id"] = session_id
                    print(f"🚀 DEBUG AUTOMATION: Session state: current_job_needs_submission = {session['current_job_needs_submission']}")
                    
                    final_response = {
                        "success": True,
                        "status": automation_result.get("status", "awaiting_user_confirmation"),
                        "automation_type": automation_result.get("automation_type", "tab_automation"),
                        "current_job": current_job,
                        "job_index": current_index + 1,  # For display purposes only
                        "total_jobs": len(jobs),
                        "message": automation_result.get("message", "Please review the filled form and submit manually"),
                        "fields_filled": automation_result.get("fields_filled", []),
                        "application_url": application_url,
                        "form_data": automation_result.get("form_data", {}),
                        "session_id": session_id,
                        "automation_status": automation_result.get("status", "awaiting_user_confirmation"),
                        "require_manual_submit": True,
                        "next_action": "user_must_submit_before_proceeding",
                        "tab_url": automation_result.get("tab_url"),
                        # PASS THROUGH SEMANTIC FORM FILLER DATA
                        "js_injection": automation_result.get("js_injection", ""),
                        "semantic_matches": automation_result.get("semantic_matches", 0),
                        "total_fields_filled": automation_result.get("total_fields_filled", 0)
                    }
                    
                    print(f"DEBUG: Final response automation_type: {final_response.get('automation_type')}")
                    print(f"DEBUG: Final response status: {final_response.get('status')}")
                    return final_response
                else:
                    # Auto-advance only if submission was automated
                    return {
                        "success": True,
                        "status": automation_result.get("status", "visual_automation_active"),
                        "current_job": current_job,
                        "job_index": current_index + 1,
                        "total_jobs": len(jobs),
                        "message": automation_result.get("message", "Browser automation started"),
                        "fields_filled": automation_result.get("fields_filled", []),
                        "application_url": application_url,
                        "fallback_url": automation_result.get("fallback_url"),
                        "session_id": session_id,
                        "automation_status": automation_result.get("status", "unknown")
                    }
            else:
                # Automation failed, record error and move to next
                session["status"] = "automation_failed"
                return {
                    "success": False,
                    "status": "automation_failed",
                    "current_job": current_job,
                    "error": automation_result.get("error", "Visual automation failed"),
                    "session_id": session_id
                }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def mark_job_complete(self, session_id: str, status: str, notes: str = "") -> Dict[str, Any]:
        """
        Mark current job as complete and move to next
        """
        try:
            session = self.active_sessions.get(session_id)
            if not session:
                raise HTTPException(status_code=404, detail="Automation session not found")
            
            current_index = session["current_job_index"]
            current_job = session["jobs"][current_index]
            
            # Record result
            result = {
                "job": current_job,
                "status": status,  # 'completed', 'failed', 'skipped'
                "notes": notes,
                "timestamp": datetime.now().isoformat(),
                "job_index": current_index + 1
            }
            
            session["results"].append(result)
            
            # Clear the submission requirement for this job
            session["current_job_needs_submission"] = False
            session.pop("current_job_session_id", None)
            
            # Move to next job
            session["current_job_index"] += 1
            
            # Clean up browser session for current job
            await self._cleanup_browser_session(session_id)
            
            # Check if all jobs are done
            if session["current_job_index"] >= len(session["jobs"]):
                session["status"] = "completed"
                # Clean up resume file and session
                await self._cleanup_session(session_id)
                
                return {
                    "success": True,
                    "status": "completed",
                    "results": session["results"],
                    "message": "All applications processed"
                }
            else:
                session["status"] = "ready_for_next"
                return {
                    "success": True,
                    "status": "ready_for_next",
                    "next_job_index": session["current_job_index"] + 1,
                    "total_jobs": len(session["jobs"])
                }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def mark_job_submitted(self, session_id: str) -> Dict[str, Any]:
        """
        Mark current job as submitted by user - allows next job to proceed
        """
        try:
            session = self.active_sessions.get(session_id)
            if not session:
                raise HTTPException(status_code=404, detail="Automation session not found")
            
            # Clear the submission requirement
            session["current_job_needs_submission"] = False
            session.pop("current_job_session_id", None)
            
            print(f"DEBUG: ✅ Job marked as submitted - next job can now proceed")
            
            return {
                "success": True,
                "message": "Job marked as submitted - next job can now proceed",
                "can_proceed": True
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_session_status(self, session_id: str) -> Dict[str, Any]:
        """
        Get current status of automation session
        """
        session = self.active_sessions.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Automation session not found")
        
        return {
            "session_id": session_id,
            "status": session["status"],
            "current_job_index": session["current_job_index"],
            "total_jobs": len(session["jobs"]),
            "results": session["results"],
            "created_at": session["created_at"]
        }
    
    async def _generate_application_instructions(self, job: Dict, user_profile: Dict) -> List[str]:
        """
        Generate step-by-step application instructions using the apply_to_jobs agent
        """
        try:
            # Import the existing agent orchestrator
            from agent_orchestrator import AgentOrchestrator
            
            orchestrator = AgentOrchestrator()
            
            # Prepare job details for the agent
            job_details = {
                "title": job.get("title", ""),
                "company": job.get("company", ""),
                "description": job.get("description", ""),
                "link": job.get("link", ""),
                "location": job.get("location", "")
            }
            
            # Generate instructions
            instructions_response = await orchestrator.generate_application_instructions(user_profile, job_details)
            
            if isinstance(instructions_response, dict) and "instructions" in instructions_response:
                return instructions_response["instructions"]
            else:
                # Fallback to basic instructions
                return self._generate_basic_instructions(job, user_profile)
                
        except Exception as e:
            print(f"Error generating instructions: {e}")
            # Fallback to basic instructions
            return self._generate_basic_instructions(job, user_profile)
    
    def _generate_basic_instructions(self, job: Dict, user_profile: Dict) -> List[str]:
        """
        Generate basic application instructions as fallback
        """
        name = ""
        email = ""
        phone = ""
        
        if user_profile.get("personal_information"):
            basic_info = user_profile["personal_information"].get("basic_information", {})
            contact_info = user_profile["personal_information"].get("contact_information", {})
            
            name = f"{basic_info.get('first_name', '')} {basic_info.get('last_name', '')}"
            email = contact_info.get("email", "")
            phone = contact_info.get("telephone", "")
        
        instructions = [
            f"Open the application page at {job.get('link', '')}",
            f"Find the 'Full Name' field and enter: {name}",
            f"Find the 'Email' field and enter: {email}",
            f"Find the 'Phone' field and enter: {phone}",
            "Upload your resume file if prompted",
            "Fill in any additional required fields",
            "Review all information carefully",
            "Click Submit to complete the application"
        ]
        
        return instructions
    
    async def _store_resume_file(self, resume_file: UploadFile) -> str:
        """
        Store resume file temporarily for automation session
        """
        try:
            # Validate file
            if not resume_file.filename:
                raise ValueError("No filename provided")
            
            # Create unique filename
            file_extension = os.path.splitext(resume_file.filename)[1]
            unique_filename = f"resume_{uuid.uuid4()}{file_extension}"
            file_path = os.path.join(self.temp_resume_dir, unique_filename)
            
            # Save file
            content = await resume_file.read()
            with open(file_path, "wb") as f:
                f.write(content)
            
            return file_path
            
        except Exception as e:
            raise ValueError(f"Failed to store resume file: {str(e)}")
    
    def _validate_user_profile(self, user_profile: Dict) -> bool:
        """
        Validate that user profile has minimum required information
        """
        try:
            personal_info = user_profile.get("personal_information", {})
            basic_info = personal_info.get("basic_information", {})
            contact_info = personal_info.get("contact_information", {})
            
            # Check minimum required fields
            required_fields = [
                basic_info.get("first_name"),
                basic_info.get("last_name"),
                contact_info.get("email")
            ]
            
            return all(field and field.strip() for field in required_fields)
            
        except Exception:
            return False
    
    async def _cleanup_browser_session(self, session_id: str):
        """
        Clean up browser session for specific session - NO BROWSER AUTOMATION
        """
        try:
            if session_id in self.active_browser_sessions:
                # NO BROWSER CLEANUP - just remove session tracking
                del self.active_browser_sessions[session_id]
                print(f"Browser session cleaned up for {session_id}")
        except Exception as e:
            print(f"Error cleaning up browser session {session_id}: {e}")
    
    async def _cleanup_session(self, session_id: str):
        """
        Clean up session data and temporary files
        """
        try:
            # Clean up browser first
            await self._cleanup_browser_session(session_id)
            
            session = self.active_sessions.get(session_id)
            if session and "resume_path" in session:
                resume_path = session["resume_path"]
                if os.path.exists(resume_path):
                    os.remove(resume_path)
            
            # Remove session from active sessions
            if session_id in self.active_sessions:
                del self.active_sessions[session_id]
                
        except Exception as e:
            print(f"Error cleaning up session {session_id}: {e}")
    
    async def get_browser_status(self, session_id: str) -> Dict[str, Any]:
        """
        Get current browser automation status
        """
        try:
            if session_id not in self.active_browser_sessions:
                return {
                    "browser_active": False,
                    "status": "no_browser_session"
                }
            
            browser_session = self.active_browser_sessions[session_id]
            
            # NO BROWSER - always return inactive
            try:
                return {
                    "browser_active": False,
                    "status": "no_browser_automation"
                }
            except:
                return {
                    "browser_active": False,
                    "status": "browser_error"
                }
                
        except Exception as e:
            return {
                "browser_active": False,
                "status": "error",
                "error": str(e)
            }

# Global automator instance
automator = JobApplicationAutomator()