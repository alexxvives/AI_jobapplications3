import os
import tempfile
import json
import uuid
from typing import Dict, Any, List, Optional
from fastapi import HTTPException, UploadFile
from datetime import datetime
import asyncio
from visual_automation import visual_automator

class JobApplicationAutomator:
    """
    Handles automated job application process with user control points
    """
    
    def __init__(self):
        self.max_applications_per_session = 5
        self.resume_storage_dir = os.path.join(os.getcwd(), "temp_resumes")
        self.active_sessions = {}
        self.active_browser_sessions = {}  # Track browser sessions
        
        # Ensure resume storage directory exists
        os.makedirs(self.resume_storage_dir, exist_ok=True)
    
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
            
            # Try visual automation, fallback to manual if it fails
            try:
                automation_result = await visual_automator.start_visual_automation(
                    job_url=current_job.get("link", ""),
                    user_profile=user_profile,
                    resume_path=resume_path
                )
                
                # If visual automation returns success=False, treat it as a fallback case
                if not automation_result.get("success", False):
                    print(f"DEBUG: Visual automation returned success=False: {automation_result}")
                    raise Exception(automation_result.get("error", "Visual automation failed"))
                    
            except Exception as e:
                # Fallback to manual mode - but still apply URL transformations
                print(f"DEBUG: Visual automation failed with error: {str(e)}")
                print(f"DEBUG: Error type: {type(e).__name__}")
                original_url = current_job.get("link", "")
                print(f"DEBUG: Original Lever URL: {original_url}")
                
                # Apply the same URL transformations as visual automation
                if "jobs.lever.co" in original_url and not original_url.endswith("/apply"):
                    fallback_url = original_url.rstrip("/") + "/apply"
                    print(f"DEBUG: Transformed to: {fallback_url}")
                else:
                    fallback_url = original_url
                    print(f"DEBUG: No transformation needed: {fallback_url}")
                
                automation_result = {
                    "success": True,
                    "status": "manual_fallback",
                    "message": f"Visual automation unavailable ({str(e)}). Opening job URL for manual application.",
                    "fields_filled": [],
                    "browser_session_active": False,
                    "fallback_url": fallback_url
                }
            
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
            file_path = os.path.join(self.resume_storage_dir, unique_filename)
            
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
        Clean up browser session for specific session
        """
        try:
            if session_id in self.active_browser_sessions:
                # Clean up browser
                visual_automator.cleanup()
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
            
            # Check if browser is still active
            try:
                if visual_automator.driver:
                    current_url = visual_automator.driver.current_url
                    return {
                        "browser_active": True,
                        "current_url": current_url,
                        "job": browser_session["job"],
                        "status": "active"
                    }
                else:
                    return {
                        "browser_active": False,
                        "status": "browser_closed"
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