import os
import sys
import tempfile
import json
import asyncio
from typing import Dict, Any, List
from fastapi import UploadFile, HTTPException

# Add the agents directory to the Python path
AGENTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "agents")
sys.path.append(AGENTS_DIR)

class AgentOrchestrator:
    """
    Orchestrates calls to various agents (parse_resume, apply_to_jobs, write_cover_letter)
    Acts as a bridge between FastAPI endpoints and agent processing
    """
    
    def __init__(self):
        self.agents_dir = AGENTS_DIR
        
    async def process_resume_upload(self, file: UploadFile, title: str = "Resume Profile") -> Dict[str, Any]:
        """
        Process resume upload using the parse_resume agent
        """
        try:
            # Validate file type
            allowed_extensions = {'.pdf', '.doc', '.docx', '.txt'}
            if not file.filename:
                raise HTTPException(status_code=400, detail="No filename provided")
            
            file_extension = os.path.splitext(file.filename)[1].lower()
            if file_extension not in allowed_extensions:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
                )
            
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as tmp_file:
                content = await file.read()
                tmp_file.write(content)
                tmp_file.flush()
                tmp_path = tmp_file.name
            
            try:
                # Call the parse_resume agent
                profile_data = await self._call_parse_resume_agent(tmp_path, title)
                return profile_data
                
            finally:
                # Clean up temporary file
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass
                    
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Resume processing failed: {str(e)}")
    
    async def generate_cover_letter(self, user_profile: Dict[str, Any], job_details: Dict[str, Any]) -> str:
        """
        Generate cover letter using the write_cover_letter agent
        """
        try:
            cover_letter = await self._call_cover_letter_agent(user_profile, job_details)
            return cover_letter
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Cover letter generation failed: {str(e)}")
    
    async def generate_application_instructions(self, user_profile: Dict[str, Any], job_details: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate job application instructions using the apply_to_jobs agent
        """
        try:
            instructions = await self._call_apply_jobs_agent(user_profile, job_details)
            return instructions
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Application instruction generation failed: {str(e)}")
    
    async def _call_parse_resume_agent(self, file_path: str, title: str) -> Dict[str, Any]:
        """
        Call the parse_resume agent with the uploaded file
        """
        try:
            # Read the prompt from the agent
            prompt_path = os.path.join(self.agents_dir, "parse_resume", "prp.md")
            if not os.path.exists(prompt_path):
                raise Exception("parse_resume agent prompt not found")
            
            with open(prompt_path, 'r', encoding='utf-8') as f:
                agent_prompt = f.read()
            
            # Extract text from file
            resume_text = self._extract_text_from_file(file_path)
            
            if not resume_text or len(resume_text.strip()) < 50:
                raise Exception("Could not extract meaningful text from the uploaded file")
            
            # Use the DEMO's proven approach with Ollama
            profile_data = await self._call_ollama_for_resume_parsing(resume_text)
            
            return profile_data
            
        except Exception as e:
            print(f"[Agent] parse_resume error: {e}")
            raise
    
    async def _call_cover_letter_agent(self, user_profile: Dict[str, Any], job_details: Dict[str, Any]) -> str:
        """
        Call the write_cover_letter agent
        """
        try:
            # Read the prompt from the agent
            prompt_path = os.path.join(self.agents_dir, "write_cover_letter", "prp.md")
            if not os.path.exists(prompt_path):
                raise Exception("write_cover_letter agent prompt not found")
            
            with open(prompt_path, 'r', encoding='utf-8') as f:
                agent_prompt = f.read()
            
            # Prepare input for the agent
            job_description = job_details.get("description", "")
            company_name = job_details.get("company", "")
            
            # Create the prompt
            prompt = f"""
{agent_prompt}

User Profile: {json.dumps(user_profile, indent=2)}
Job Description: {job_description}
Company: {company_name}

Generate a professional cover letter based on the above information.
"""
            
            # Call Ollama
            cover_letter = await self._call_ollama(prompt)
            return cover_letter.strip()
            
        except Exception as e:
            print(f"[Agent] write_cover_letter error: {e}")
            raise
    
    async def _call_apply_jobs_agent(self, user_profile: Dict[str, Any], job_details: Dict[str, Any]) -> Dict[str, Any]:
        """
        Call the apply_to_jobs agent
        """
        try:
            # Read the prompt from the agent
            prompt_path = os.path.join(self.agents_dir, "apply_to_jobs", "prp.md")
            if not os.path.exists(prompt_path):
                raise Exception("apply_to_jobs agent prompt not found")
            
            with open(prompt_path, 'r', encoding='utf-8') as f:
                agent_prompt = f.read()
            
            # Create the prompt with structured input
            prompt = f"""
{agent_prompt}

User Profile: {json.dumps(user_profile, indent=2)}
Job Details: {json.dumps(job_details, indent=2)}

Generate application instructions in the specified JSON format.
"""
            
            # Call Ollama and parse JSON response
            response = await self._call_ollama(prompt)
            
            try:
                instructions = json.loads(response.strip())
                return instructions
            except json.JSONDecodeError:
                # Fallback if JSON parsing fails
                return {
                    "instructions": [],
                    "estimated_time": "Unable to estimate",
                    "success_probability": 0.5,
                    "error": "Failed to parse agent response as JSON"
                }
            
        except Exception as e:
            print(f"[Agent] apply_to_jobs error: {e}")
            raise
    
    def _extract_text_from_file(self, file_path: str) -> str:
        """
        Extract text from various file formats
        """
        try:
            ext = file_path.split('.')[-1].lower()
            
            if ext == 'pdf':
                from pdfminer.high_level import extract_text as extract_pdf_text
                return extract_pdf_text(file_path)
            elif ext in ('doc', 'docx'):
                import docx
                doc = docx.Document(file_path)
                return '\\n'.join([p.text for p in doc.paragraphs])
            elif ext == 'txt':
                # Try different encodings
                encodings = ['utf-8', 'latin-1', 'cp1252', 'utf-16']
                for encoding in encodings:
                    try:
                        with open(file_path, 'r', encoding=encoding) as f:
                            return f.read()
                    except UnicodeDecodeError:
                        continue
                raise Exception("Could not decode text file with any encoding")
            else:
                raise Exception(f"Unsupported file format: {ext}")
                
        except Exception as e:
            print(f"[Text Extraction] Error: {e}")
            raise Exception(f"Failed to extract text from file: {str(e)}")
    
    async def _call_ollama_for_resume_parsing(self, resume_text: str) -> Dict[str, Any]:
        """
        Call Ollama for resume parsing using the comprehensive prompt from DEMO
        """
        prompt = f"""
You are an expert data extraction agent. Your task is to extract structured information from the provided resume and return a **strictly valid JSON** object matching the schema defined below. All keys must always be present, even if values are missing.

IMPORTANT: You must be completely consistent and deterministic in your extraction. The same resume should always produce the same output. Focus on factual information extraction only.

## Output Format (MUST MATCH EXACTLY):

{{
  "personal_information": {{
    "basic_information": {{
      "first_name": "string",
      "last_name": "string",
      "gender": "string or null"
    }},
    "contact_information": {{
      "email": "string",
      "country_code": "string or null",
      "telephone": "string"
    }},
    "address": {{
      "address": "string or null",
      "city": "string or null",
      "state": "string or null",
      "zip_code": "string or null",
      "country": "string or null",
      "citizenship": "string or null"
    }}
  }},
  "work_experience": [
    {{
      "title": "string",
      "company": "string",
      "location": "string",
      "start_date": "string (YYYY-MM or similar)",
      "end_date": "string or null (use null if current)",
      "description": "string"
    }}
  ],
  "education": [
    {{
      "degree": "string",
      "school": "string (institution name)",
      "start_date": "string (YYYY-MM or similar)",
      "end_date": "string (YYYY-MM or similar) or null if current",
      "gpa": "string or null"
    }}
  ],
  "skills": [
    {{
      "name": "string",
      "years": "integer or null"
    }}
  ],
  "languages": ["string", "string", "..."],
  "job_preferences": {{
    "linkedin_link": "string or null",
    "github_link": "string or null",
    "portfolio_link": "string or null",
    "other_url": "string or null",
    "current_salary": "string or null",
    "expected_salary": "string or null",
    "notice_period": "string or null",
    "total_work_experience": "string or null",
    "highest_education": "string or null",
    "willing_to_relocate": "string or null",
    "driving_license": "string or null",
    "visa_requirement": "string or null",
    "veteran_status": "string or null",
    "disability": "string or null",
    "race_ethnicity": "string or null",
    "security_clearance": "string or null"
  }},
  "achievements": [
    {{
      "title": "string",
      "issuer": "string or null",
      "date": "string or null",
      "description": "string or null"
    }}
  ],
  "certificates": [
    {{
      "name": "string",
      "organization": "string or null",
      "issue_date": "string or null",
      "expiry_date": "string or null",
      "credential_id": "string or null",
      "credential_url": "string or null"
    }}
  ]
}}

## IMPORTANT RULES:
- Return **only valid JSON**, no additional explanation or text.
- All fields in `job_preferences` must be **strings or null**. If a value is numeric, boolean, or a list, convert it to a string. If missing, return null.
- Dates should be in a consistent format (e.g., `YYYY-MM`). If not available, return `null`.
- If a field is not mentioned in the resume, fill it with `null`, `""`, or an empty list `[]`, depending on the data type.
- `skills`, `achievements`, and `certificates` must be returned as structured objects — **not strings**.
- If the job description is in bullet points, concatenate all bullet points into a single string, separated by newlines.

## EXTRACTION GUIDELINES:
- **Personal Information**: Split full name into first_name and last_name. Extract country code from phone if available.
- **Job Preferences**: Look for LinkedIn, GitHub, portfolio URLs. Parse salary information if mentioned. Extract experience years from work history.
- **Social Media Links**: Extract and validate URLs for LinkedIn, GitHub, portfolio sites.
- **Experience Calculation**: Calculate total work experience from employment history.
- **Education Level**: Determine highest education from education section (e.g., "Bachelor's", "Master's", "PhD").
- **Location Preferences**: Look for relocation willingness, visa status, citizenship information.
- **Professional Details**: Extract security clearance, certifications, veteran status if mentioned.

Resume Text:
{resume_text}

Return only the JSON:
"""
        
        response = await self._call_ollama(prompt)
        
        try:
            # Clean up the response
            start = response.find('{')
            end = response.rfind('}')
            if start != -1 and end != -1 and end > start:
                json_str = response[start:end+1]
            else:
                json_str = response
            
            # Remove markdown code blocks
            import re
            json_str = re.sub(r'```json\\s*', '', json_str, flags=re.IGNORECASE)
            json_str = re.sub(r'```\\s*', '', json_str)
            json_str = re.sub(r',\\s*([}\\]])', r'\\1', json_str)
            
            profile_data = json.loads(json_str)
            
            # Keep the nested structure for the new schema
            # No flattening needed - maintain the structured format
            
            # Ensure required fields exist
            required_top_level_fields = [
                "personal_information", "work_experience", "education", 
                "skills", "languages", "job_preferences", "achievements", "certificates"
            ]
            
            for field in required_top_level_fields:
                if field not in profile_data:
                    if field in ["work_experience", "education", "skills", "languages", "achievements", "certificates"]:
                        profile_data[field] = []
                    elif field == "job_preferences":
                        profile_data[field] = {
                            "linkedin_link": None,
                            "github_link": None,
                            "portfolio_link": None,
                            "other_url": None,
                            "current_salary": None,
                            "expected_salary": None,
                            "notice_period": None,
                            "total_work_experience": None,
                            "highest_education": None,
                            "willing_to_relocate": None,
                            "driving_license": None,
                            "visa_requirement": None,
                            "veteran_status": None,
                            "disability": None,
                            "race_ethnicity": None,
                            "security_clearance": None
                        }
                    elif field == "personal_information":
                        profile_data[field] = {
                            "basic_information": {
                                "first_name": "",
                                "last_name": "",
                                "gender": None
                            },
                            "contact_information": {
                                "email": "",
                                "country_code": None,
                                "telephone": ""
                            },
                            "address": {
                                "address": None,
                                "city": None,
                                "state": None,
                                "zip_code": None,
                                "country": None,
                                "citizenship": None
                            }
                        }
            
            return profile_data
            
        except json.JSONDecodeError as e:
            print(f"[Ollama] JSON parsing failed: {e}")
            # Return minimal valid structure with new schema
            return {
                "personal_information": {
                    "basic_information": {
                        "first_name": "",
                        "last_name": "",
                        "gender": None
                    },
                    "contact_information": {
                        "email": "",
                        "country_code": None,
                        "telephone": ""
                    },
                    "address": {
                        "address": None,
                        "city": None,
                        "state": None,
                        "zip_code": None,
                        "country": None,
                        "citizenship": None
                    }
                },
                "work_experience": [],
                "education": [],
                "skills": [],
                "languages": [],
                "job_preferences": {
                    "linkedin_link": None,
                    "github_link": None,
                    "portfolio_link": None,
                    "other_url": None,
                    "current_salary": None,
                    "expected_salary": None,
                    "notice_period": None,
                    "total_work_experience": None,
                    "highest_education": None,
                    "willing_to_relocate": None,
                    "driving_license": None,
                    "visa_requirement": None,
                    "veteran_status": None,
                    "disability": None,
                    "race_ethnicity": None,
                    "security_clearance": None
                },
                "achievements": [],
                "certificates": []
            }
    
    async def _call_ollama(self, prompt: str, model: str = "llama3:latest") -> str:
        """
        Call Ollama API
        """
        import aiohttp
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "http://127.0.0.1:11434/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "temperature": 0,
                    "top_k": 1,
                    "top_p": 0.1,
                    "repeat_penalty": 1.1,
                    "seed": 12345
                }
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Ollama API error: {response.status} - {error_text}")
                
                data = await response.json()
                return data.get("response", "")