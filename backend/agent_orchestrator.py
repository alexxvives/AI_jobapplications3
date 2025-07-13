from typing import Dict, Any, List
import json
import os
from fastapi import UploadFile
import PyPDF2
import docx
import io
import ollama

class AgentOrchestrator:
    """Orchestrates AI agents for resume parsing, cover letter generation, etc."""
    
    def __init__(self):
        self.agents = {}
    
    async def process_resume_upload(self, file: UploadFile, title: str = "Resume Profile") -> Dict[str, Any]:
        """Process uploaded resume file and extract text for parsing"""
        try:
            # Read file content
            content = await file.read()
            return await self.process_resume_content(content, file.filename, title)
            
        except Exception as e:
            raise Exception(f"Failed to process resume upload: {str(e)}")
    
    async def process_resume_content(self, content: bytes, filename: str, title: str = "Resume Profile") -> Dict[str, Any]:
        """Process resume content and extract text for parsing"""
        try:
            print(f"🔍 DEBUG: Processing resume file: {filename}")
            print(f"🔍 DEBUG: File size: {len(content)} bytes")
            
            # Extract text based on file type
            if filename.lower().endswith('.pdf'):
                print("🔍 DEBUG: Processing PDF file")
                resume_text = self.extract_text_from_pdf(content)
            elif filename.lower().endswith(('.doc', '.docx')):
                print("🔍 DEBUG: Processing DOCX file")
                resume_text = self.extract_text_from_docx(content)
            elif filename.lower().endswith('.txt'):
                print("🔍 DEBUG: Processing TXT file")
                resume_text = content.decode('utf-8')
            else:
                raise ValueError(f"Unsupported file type: {filename}")
            
            print(f"🔍 DEBUG: Extracted text length: {len(resume_text)} characters")
            print(f"🔍 DEBUG: First 200 chars: {resume_text[:200]}...")
            
            # Parse the extracted text
            print("🔍 DEBUG: Starting resume parsing...")
            result = self.parse_resume(resume_text)
            print(f"🔍 DEBUG: Parsing completed. Result keys: {list(result.keys())}")
            print(f"🔍 DEBUG: Personal info: {result.get('personal_information', {})}")
            
            return result
            
        except Exception as e:
            print(f"❌ DEBUG: Error in process_resume_content: {str(e)}")
            raise Exception(f"Failed to process resume content: {str(e)}")
    
    def extract_text_from_pdf(self, content: bytes) -> str:
        """Extract text from PDF content"""
        try:
            pdf_file = io.BytesIO(content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
        except Exception as e:
            raise Exception(f"Failed to extract text from PDF: {str(e)}")
    
    def extract_text_from_docx(self, content: bytes) -> str:
        """Extract text from DOCX content"""
        try:
            doc_file = io.BytesIO(content)
            doc = docx.Document(doc_file)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text.strip()
        except Exception as e:
            raise Exception(f"Failed to extract text from DOCX: {str(e)}")
    
    def parse_resume(self, resume_text: str) -> Dict[str, Any]:
        """Parse resume text using Ollama AI model"""
        print(f"🤖 DEBUG: Starting AI-powered resume parsing with Ollama")
        print(f"🤖 DEBUG: Resume text length: {len(resume_text)} characters")
        
        # Create the AI prompt for resume parsing
        prompt = f"""You are an expert resume parser. Extract information from this resume text and return ONLY a valid JSON object with the exact structure shown below. Do not include any explanations, just the JSON.

RESUME TEXT:
{resume_text}

Extract information and return JSON in this EXACT format:
{{
  "personal_information": {{
    "full_name": "",
    "email": "",
    "phone": "",
    "gender": "",
    "address": "",
    "city": "",
    "state": "",
    "zip_code": "",
    "country": "",
    "citizenship": ""
  }},
  "work_experience": [
    {{
      "title": "",
      "company": "",
      "location": "",
      "start_date": "",
      "end_date": "",
      "description": ""
    }}
  ],
  "education": [
    {{
      "school": "",
      "degree": "",
      "start_date": "",
      "end_date": "",
      "gpa": ""
    }}
  ],
  "skills": [
    {{
      "name": "",
      "years": null
    }}
  ],
  "languages": [""],
  "job_preferences": {{}},
  "achievements": [
    {{
      "title": "",
      "issuer": "",
      "date": "",
      "description": ""
    }}
  ],
  "certificates": [
    {{
      "name": "",
      "organization": "",
      "issue_date": "",
      "expiry_date": "",
      "credential_id": "",
      "credential_url": ""
    }}
  ]
}}

Rules:
- Extract ALL information found in the resume
- Use empty strings for missing text fields, null for missing numbers
- For dates, use formats like "2023" or "May 2023" or "Present"
- For work experience, include job titles, companies, locations, and date ranges
- For education, include universities, degrees, GPAs, graduation years
- For skills, extract programming languages and technical skills
- For languages, include spoken languages with proficiency if mentioned
- For achievements, include awards, competitions, honors
- For certificates, include certifications, courses, licenses
- Return ONLY the JSON, no other text"""

        try:
            print("🤖 DEBUG: Attempting to connect to Ollama...")
            
            # Check if Ollama is available
            try:
                ollama.list()  # Test connection
                print("✅ DEBUG: Ollama is running, sending parsing request...")
            except Exception as e:
                print(f"❌ DEBUG: Ollama not available: {e}")
                raise Exception("Ollama service not available")
            
            # Use Ollama to parse the resume
            response = ollama.chat(model='llama3.2', messages=[
                {
                    'role': 'user',
                    'content': prompt
                }
            ])
            
            ai_response = response['message']['content']
            print(f"🤖 DEBUG: Ollama response length: {len(ai_response)} characters")
            print(f"🤖 DEBUG: First 200 chars of response: {ai_response[:200]}...")
            
            # Try to parse the JSON response
            try:
                # Clean the response to extract just the JSON
                json_start = ai_response.find('{')
                json_end = ai_response.rfind('}') + 1
                
                if json_start >= 0 and json_end > json_start:
                    json_str = ai_response[json_start:json_end]
                    parsed_profile = json.loads(json_str)
                    
                    print("✅ DEBUG: Successfully parsed JSON from Ollama")
                    print(f"✅ DEBUG: Extracted data summary:")
                    print(f"  - Name: {parsed_profile.get('personal_information', {}).get('full_name', 'N/A')}")
                    print(f"  - Email: {parsed_profile.get('personal_information', {}).get('email', 'N/A')}")
                    print(f"  - Education entries: {len(parsed_profile.get('education', []))}")
                    print(f"  - Work experience entries: {len(parsed_profile.get('work_experience', []))}")
                    print(f"  - Skills: {len(parsed_profile.get('skills', []))}")
                    print(f"  - Languages: {len(parsed_profile.get('languages', []))}")
                    print(f"  - Achievements: {len(parsed_profile.get('achievements', []))}")
                    print(f"  - Certificates: {len(parsed_profile.get('certificates', []))}")
                    
                    return parsed_profile
                else:
                    raise ValueError("No valid JSON found in response")
                    
            except json.JSONDecodeError as e:
                print(f"❌ DEBUG: JSON parsing failed: {e}")
                print(f"❌ DEBUG: Raw response: {ai_response}")
                raise ValueError(f"Invalid JSON response from Ollama: {e}")
                
        except Exception as e:
            print(f"❌ DEBUG: Ollama request failed: {e}")
            print("⚠️ DEBUG: Falling back to basic parsing...")
            
            # Fallback to basic parsing if Ollama fails
            return self._fallback_parse(resume_text)
    
    def _fallback_parse(self, resume_text: str) -> Dict[str, Any]:
        """Fallback parsing when Ollama is not available"""
        print("🔄 DEBUG: Using fallback parsing...")
        
        import re
        
        # Basic fallback extraction
        profile = {
            "personal_information": {
                "full_name": "",
                "email": "",
                "phone": "",
                "gender": "",
                "address": "",
                "city": "",
                "state": "",
                "zip_code": "",
                "country": "",
                "citizenship": ""
            },
            "work_experience": [],
            "education": [],
            "skills": [],
            "languages": [],
            "job_preferences": {},
            "achievements": [],
            "certificates": []
        }
        
        # Extract basic info with regex as fallback
        lines = resume_text.split('\n')
        
        # Name (first line)
        if lines and lines[0].strip():
            name = lines[0].strip()
            if len(name.split()) <= 5:
                profile["personal_information"]["full_name"] = name
                print(f"✅ Fallback: Found name: {name}")
        
        # Email
        email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', resume_text)
        if email_match:
            profile["personal_information"]["email"] = email_match.group()
            print(f"✅ Fallback: Found email: {email_match.group()}")
        
        # Phone
        phone_match = re.search(r'\+1\s*\(\d{3}\)\s*\d{3}-\d{4}', resume_text)
        if phone_match:
            profile["personal_information"]["phone"] = phone_match.group()
            print(f"✅ Fallback: Found phone: {phone_match.group()}")
        
        return profile
    
    def generate_cover_letter(self, profile_data: Dict[str, Any], job_description: str) -> str:
        """Generate cover letter based on profile and job description"""
        # Placeholder implementation
        return "Dear Hiring Manager,\n\nI am writing to express my interest in this position.\n\nBest regards"
    
    def generate_application_instructions(self, profile_data: Dict[str, Any], job_url: str) -> List[Dict[str, Any]]:
        """Generate form-filling instructions for job application"""
        # Placeholder implementation
        return [
            {
                "field_id": "name",
                "value": profile_data.get("personal_information", {}).get("full_name", ""),
                "action": "fill"
            }
        ]