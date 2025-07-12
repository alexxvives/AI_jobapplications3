import os
import sys
import tempfile
import json
import asyncio
from typing import Dict, Any, List
from fastapi import UploadFile, HTTPException

# Add the modules directory to the Python path
MODULES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "modules")
sys.path.append(MODULES_DIR)

class AgentOrchestrator:
    """
    Orchestrates calls to various agents (parse_resume, apply_to_jobs, write_cover_letter)
    Acts as a bridge between FastAPI endpoints and agent processing
    """
    
    def __init__(self):
        self.modules_dir = MODULES_DIR
        
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
            # Read the prompt from the module
            prompt_path = os.path.join(self.modules_dir, "profile_parsing", "prompts", "main_prompt.md")
            if not os.path.exists(prompt_path):
                raise Exception("profile_parsing module prompt not found")
            
            with open(prompt_path, 'r', encoding='utf-8') as f:
                agent_prompt = f.read()
            
            # Extract text from file
            resume_text = self._extract_text_from_file(file_path)
            
            if not resume_text or len(resume_text.strip()) < 50:
                raise Exception("Could not extract meaningful text from the uploaded file")
            
            # Use the built-in Ollama approach
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
            # If response is already JSON (from fallback), parse it directly
            if response.startswith('{') and response.endswith('}'):
                profile_data = json.loads(response)
                return profile_data
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
        Call Ollama API with fallback for when Ollama is not available
        """
        try:
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
                    
        except Exception as e:
            print(f"[Ollama] Error calling Ollama API: {e}")
            print(f"[Ollama] Falling back to basic profile extraction")
            return await self._extract_basic_profile_from_text(prompt)
    
    async def _extract_basic_profile_from_text(self, prompt: str) -> str:
        """
        Advanced fallback parser when Ollama is not available
        """
        import re
        from datetime import datetime
        
        # Extract resume text from prompt
        resume_text = prompt.split("Resume Text:")[-1].split("Return only the JSON:")[0].strip()
        print(f"[Advanced Parser] Processing resume ({len(resume_text)} chars)...")
        
        # Advanced regex patterns
        email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', resume_text, re.IGNORECASE)
        phone_patterns = [
            r'(\+\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})',
            r'(\+\d{1,3}[-.\s]?)?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}',
            r'(\+\d{1,3}[-.\s]?)?\d{10}'
        ]
        phone_match = None
        for pattern in phone_patterns:
            phone_match = re.search(pattern, resume_text)
            if phone_match:
                break
        
        # Extract name (much more sophisticated)
        lines = [line.strip() for line in resume_text.split('\n') if line.strip()]
        name_line = ""
        
        # Look for name in first few lines, exclude contact info
        for line in lines[:5]:
            if any(x in line.lower() for x in ['@', 'phone', 'email', 'tel:', 'linkedin', 'github']):
                continue
            if any(x in line.lower() for x in ['resume', 'cv', 'curriculum']):
                continue
            # Name should be 2-4 words, not too long
            words = line.split()
            if 2 <= len(words) <= 4 and len(line) <= 50:
                # Check if it looks like a name (starts with capital letters)
                if all(word[0].isupper() for word in words if word):
                    name_line = line
                    break
        
        name_parts = name_line.split() if name_line else []
        first_name = name_parts[0] if name_parts else ""
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
        
        # Extract work experience (much better)
        work_experience = []
        
        # Find experience section
        exp_patterns = [
            r'(?:PROFESSIONAL\s+)?EXPERIENCE(.*?)(?:EDUCATION|SKILLS|PROJECTS|CERTIFICATIONS|$)',
            r'WORK\s+EXPERIENCE(.*?)(?:EDUCATION|SKILLS|PROJECTS|CERTIFICATIONS|$)',
            r'EMPLOYMENT\s+HISTORY(.*?)(?:EDUCATION|SKILLS|PROJECTS|CERTIFICATIONS|$)',
            r'CAREER\s+HISTORY(.*?)(?:EDUCATION|SKILLS|PROJECTS|CERTIFICATIONS|$)'
        ]
        
        exp_text = ""
        for pattern in exp_patterns:
            match = re.search(pattern, resume_text, re.IGNORECASE | re.DOTALL)
            if match:
                exp_text = match.group(1)
                break
        
        if exp_text:
            # Split by job entries (look for date patterns)
            job_blocks = re.split(r'\n(?=\d{4}|\w+\s+\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))', exp_text)
            
            for block in job_blocks[:4]:  # Max 4 jobs
                if len(block.strip()) < 10:
                    continue
                    
                # Extract job title and company
                lines = [l.strip() for l in block.split('\n') if l.strip()]
                
                title = ""
                company = ""
                location = ""
                start_date = ""
                end_date = None
                description_lines = []
                
                for i, line in enumerate(lines):
                    # Look for dates (improved)
                    date_match = re.search(r'(\w+\s+\d{4}|\d{4})(?:\s*[-–—]\s*(\w+\s+\d{4}|\d{4}|present|current))?', line, re.IGNORECASE)
                    if date_match:
                        start_date = date_match.group(1)
                        if date_match.group(2):
                            if 'present' in date_match.group(2).lower() or 'current' in date_match.group(2).lower():
                                end_date = None
                            else:
                                end_date = date_match.group(2)
                        continue
                    
                    # First non-date line is likely title
                    if not title and not any(x in line.lower() for x in ['•', 'responsible', 'developed', 'managed']):
                        if ' - ' in line or ' at ' in line or ' | ' in line:
                            parts = re.split(r'\s+[-|]\s+|\s+at\s+', line)
                            title = parts[0].strip()
                            if len(parts) > 1:
                                company = parts[1].strip()
                        else:
                            title = line
                    elif not company and title and not any(x in line.lower() for x in ['•', 'responsible', 'developed', 'managed']):
                        company = line
                    elif line.startswith('•') or line.startswith('-') or any(x in line.lower() for x in ['responsible', 'developed', 'managed', 'led', 'created']):
                        description_lines.append(line)
                
                if title:
                    work_experience.append({
                        "title": title,
                        "company": company if company else "Company",
                        "location": location,
                        "start_date": start_date,
                        "end_date": end_date,
                        "description": "\n".join(description_lines) if description_lines else f"Work experience at {company}"
                    })
        
        # Extract education (better)
        education = []
        edu_patterns = [
            r'EDUCATION(.*?)(?:EXPERIENCE|SKILLS|PROJECTS|CERTIFICATIONS|$)',
            r'ACADEMIC\s+BACKGROUND(.*?)(?:EXPERIENCE|SKILLS|PROJECTS|CERTIFICATIONS|$)',
            r'QUALIFICATIONS(.*?)(?:EXPERIENCE|SKILLS|PROJECTS|CERTIFICATIONS|$)'
        ]
        
        edu_text = ""
        for pattern in edu_patterns:
            match = re.search(pattern, resume_text, re.IGNORECASE | re.DOTALL)
            if match:
                edu_text = match.group(1)
                break
        
        if edu_text:
            # Look for degree patterns
            degree_patterns = [
                r'(Bachelor(?:\s+of\s+Science|\s+of\s+Arts|\s+of\s+Engineering)?|BS|BA|BE|B\.S\.|B\.A\.|B\.E\.)[^\n]*',
                r'(Master(?:\s+of\s+Science|\s+of\s+Arts|\s+of\s+Engineering)?|MS|MA|ME|M\.S\.|M\.A\.|M\.E\.)[^\n]*',
                r'(PhD|Ph\.D\.|Doctor\s+of\s+Philosophy|Doctorate)[^\n]*',
                r'(Associate|AA|AS|A\.A\.|A\.S\.)[^\n]*'
            ]
            
            # Parse education entries more carefully
            edu_lines = [line.strip() for line in edu_text.split('\n') if line.strip()]
            current_degree = None
            current_school = None
            
            for line in edu_lines:
                # Check if line contains a degree
                for pattern in degree_patterns:
                    degree_match = re.search(pattern, line, re.IGNORECASE)
                    if degree_match:
                        current_degree = degree_match.group(0).strip()
                        # Look for school in the same line
                        remainder = line.replace(current_degree, '').strip()
                        if remainder and len(remainder) > 3:
                            current_school = remainder
                        break
                
                # Look for university/school names
                if any(x in line.lower() for x in ['university', 'college', 'institute', 'school']) and not current_school:
                    current_school = line.strip()
                
                # If we have both degree and school, add to education
                if current_degree and current_school:
                    # Extract dates from this section
                    date_match = re.search(r'(\d{4})(?:\s*[-–—]\s*(\d{4}))?', edu_text)
                    start_date = date_match.group(1) if date_match else ""
                    end_date = date_match.group(2) if date_match and date_match.group(2) else ""
                    
                    education.append({
                        "degree": current_degree,
                        "school": current_school,
                        "start_date": start_date,
                        "end_date": end_date,
                        "gpa": ""
                    })
                    current_degree = None
                    current_school = None
        
        # Extract skills (much better)
        skills = []
        skills_patterns = [
            r'(?:TECHNICAL\s+)?SKILLS(.*?)(?:EXPERIENCE|EDUCATION|PROJECTS|CERTIFICATIONS|$)',
            r'TECHNOLOGIES(.*?)(?:EXPERIENCE|EDUCATION|PROJECTS|CERTIFICATIONS|$)',
            r'PROGRAMMING\s+LANGUAGES(.*?)(?:EXPERIENCE|EDUCATION|PROJECTS|CERTIFICATIONS|$)'
        ]
        
        skills_text = ""
        for pattern in skills_patterns:
            match = re.search(pattern, resume_text, re.IGNORECASE | re.DOTALL)
            if match:
                skills_text = match.group(1)
                break
        
        if skills_text:
            # Clean and split skills
            skills_text = re.sub(r'[\n\r]+', ' ', skills_text)
            skill_list = re.split(r'[,•\-\|]', skills_text)
            
            for skill in skill_list:
                skill = skill.strip()
                # Filter out noise
                if (skill and 
                    len(skill) > 1 and 
                    len(skill) < 50 and
                    not any(x in skill.lower() for x in ['years', 'experience', 'including', 'such as', 'proficient'])):
                    skills.append({"name": skill, "years": None})
        
        # Extract social links
        linkedin = None
        github = None
        portfolio = None
        
        # LinkedIn
        linkedin_match = re.search(r'linkedin\.com/in/([a-zA-Z0-9\-]+)', resume_text, re.IGNORECASE)
        if linkedin_match:
            linkedin = f"https://linkedin.com/in/{linkedin_match.group(1)}"
        
        # GitHub
        github_match = re.search(r'github\.com/([a-zA-Z0-9\-]+)', resume_text, re.IGNORECASE)
        if github_match:
            github = f"https://github.com/{github_match.group(1)}"
        
        # Portfolio/Website
        portfolio_match = re.search(r'(?:portfolio|website|personal site):\s*(https?://[^\s]+)', resume_text, re.IGNORECASE)
        if portfolio_match:
            portfolio = portfolio_match.group(1)
        
        print(f"[Advanced Parser] Extracted: {first_name} {last_name}, {len(work_experience)} jobs, {len(education)} education, {len(skills)} skills")
        
        # Create comprehensive profile structure with extracted data
        basic_profile = {
            "personal_information": {
                "basic_information": {
                    "first_name": first_name,
                    "last_name": last_name,
                    "gender": None
                },
                "contact_information": {
                    "email": email_match.group() if email_match else "",
                    "country_code": phone_match.group(1) if phone_match and phone_match.group(1) else None,
                    "telephone": phone_match.group() if phone_match else ""
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
            "work_experience": work_experience,
            "education": education,
            "skills": skills,
            "languages": [],
            "job_preferences": {
                "linkedin": linkedin,
                "twitter": None,
                "github": github,
                "portfolio": portfolio,
                "other_url": None,
                "notice_period": None,
                "total_experience": f"{len(work_experience)} years" if work_experience else None,
                "default_experience": None,
                "highest_education": education[0]["degree"] if education else None,
                "companies_to_exclude": None,
                "willing_to_relocate": None,
                "driving_license": None,
                "visa_requirement": None,
                "race_ethnicity": None
            },
            "achievements": [],
            "certificates": []
        }
        
        import json
        return json.dumps(basic_profile)

# Create global agent orchestrator instance
agent_orchestrator = AgentOrchestrator()