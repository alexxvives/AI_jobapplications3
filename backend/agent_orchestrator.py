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
        prompt = f"""
You are an expert data extraction agent. Your task is to extract structured information from the provided resume and return a **strictly valid JSON** object matching the schema defined below. All keys must always be present, even if values are missing.

## Output Format (MUST MATCH EXACTLY):

{{
  "personal_information": {{
    "full_name": "string",
    "email": "string",
    "phone": "string",
    "gender": "string or null",
    "address": "string or null",
    "city": "string or null",
    "state": "string or null",
    "zip_code": "string or null",
    "country": "string or null",
    "citizenship": "string or null"
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
    "linkedin_link": "string",
    "github_link": "string",
    "portfolio_link": "string",
    "other_url": "string",
    "current_salary": "string",
    "expected_salary": "string",
    "notice_period": "string",
    "total_work_experience": "string",
    "highest_education": "string",
    "willing_to_relocate": "string",
    "driving_license": "string",
    "visa_requirement": "string"
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
- All fields in `job_preferences` must be **strings**. If a value is numeric, boolean, or a list, convert it to a string. If missing, return an empty string.
- Dates should be in a consistent format (e.g., `YYYY-MM`). If not available, return `null`.
- If a field is not mentioned in the resume, fill it with `null`, `""`, or an empty list `[]`, depending on the data type.
- Assume any structured info (e.g., LinkedIn URLs, GitHub, portfolio links, salary expectations) might appear anywhere in the resume — including footers, headers, or sidebars.
- For salary fields (current_salary, expected_salary), look for any mention of compensation, salary ranges, or pay expectations.
- For boolean-like fields (willing_to_relocate, driving_license, visa_requirement), convert Yes/No or True/False to strings.
- For GPA field, use a string like "3.8" or "3.87" - never use expressions like "3.87/4.0".
- For numeric fields like years, use actual numbers not strings.
- If the job description is in bullet points, concatenate all bullet points into a single string, separated by \\n. Include all bullet points and narrative text under that job as the description.

## EXAMPLE OUTPUT:
{{
  "personal_information": {{
    "full_name": "John Smith",
    "email": "john.smith@email.com",
    "phone": "(555) 123-4567",
    "gender": null,
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip_code": "10001",
    "country": "USA",
    "citizenship": null
  }},
  "work_experience": [
    {{
      "title": "Senior Software Engineer",
      "company": "Tech Corp",
      "location": "San Francisco, CA",
      "start_date": "2020-01",
      "end_date": null,
      "description": "• Led development of microservices architecture\\n• Managed team of 5 engineers\\n• Improved system performance by 40%"
    }}
  ],
  "education": [
    {{
      "degree": "Bachelor of Science in Computer Science",
      "school": "Stanford University",
      "start_date": "2016-09",
      "end_date": "2020-05",
      "gpa": "3.8"
    }}
  ],
  "skills": [
    {{
      "name": "Python",
      "years": 5
    }},
    {{
      "name": "JavaScript",
      "years": 3
    }}
  ],
  "languages": ["English", "Spanish"],
  "job_preferences": {{
    "linkedin_link": "https://linkedin.com/in/johnsmith",
    "github_link": "https://github.com/johnsmith",
    "portfolio_link": "",
    "other_url": "",
    "current_salary": "120000",
    "expected_salary": "140000",
    "notice_period": "2 weeks",
    "total_work_experience": "5 years",
    "highest_education": "Bachelor's Degree",
    "willing_to_relocate": "Yes",
    "driving_license": "Yes",
    "visa_requirement": "No"
  }},
  "achievements": [
    {{
      "title": "Best Innovation Award",
      "issuer": "Tech Corp",
      "date": "2023",
      "description": "Awarded for developing breakthrough ML algorithm"
    }}
  ],
  "certificates": [
    {{
      "name": "AWS Solutions Architect",
      "organization": "Amazon",
      "issue_date": "2022-01",
      "expiry_date": "2025-01",
      "credential_id": "AWS-123456",
      "credential_url": "https://aws.amazon.com/verification"
    }}
  ]
}}

Now extract the structured data from the following resume:
{resume_text}

Return only the JSON."""

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
                # Handle case where AI returns code blocks or other formats
                if '```json' in ai_response:
                    # Extract from code block
                    start_marker = ai_response.find('```json') + 7
                    end_marker = ai_response.find('```', start_marker)
                    if end_marker > start_marker:
                        ai_response = ai_response[start_marker:end_marker].strip()
                elif '```' in ai_response:
                    # Extract from generic code block
                    start_marker = ai_response.find('```') + 3
                    end_marker = ai_response.find('```', start_marker)
                    if end_marker > start_marker:
                        ai_response = ai_response[start_marker:end_marker].strip()
                
                json_start = ai_response.find('{')
                json_end = ai_response.rfind('}') + 1
                
                if json_start >= 0 and json_end > json_start:
                    json_str = ai_response[json_start:json_end]
                    
                    # Clean invalid control characters that break JSON parsing
                    import re
                    # Replace problematic control characters with escaped versions
                    json_str = re.sub(r'[\x00-\x1f\x7f]', lambda m: '\\n' if m.group() == '\n' else '', json_str)
                    # Also handle unescaped newlines in strings
                    json_str = re.sub(r'(?<!\\)"\s*\n\s*"', '""', json_str)
                    # Remove trailing commas before closing braces/brackets
                    json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
                    
                    print(f"🔧 DEBUG: Cleaned JSON length: {len(json_str)} characters")
                    
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
                print(f"❌ DEBUG: Raw response (first 1000 chars): {ai_response[:1000]}")
                print(f"❌ DEBUG: Cleaned JSON (first 500 chars): {json_str[:500] if 'json_str' in locals() else 'N/A'}")
                
                # Try a more aggressive cleaning approach
                try:
                    print("🔧 DEBUG: Attempting aggressive JSON cleaning...")
                    
                    # Step 1: Clean the response more thoroughly
                    cleaned = ai_response
                    
                    # Universal approach: Clean ALL non-standard characters
                    import re
                    import unicodedata
                    
                    # Method 1: Replace common bullets/symbols with safe equivalents
                    bullet_chars = ['•', '●', '○', '◦', '▪', '▫', '■', '□', '➢', '→', '⇒', '▶', '►']
                    for bullet in bullet_chars:
                        cleaned = cleaned.replace(bullet, '-')
                    
                    # Method 2: Normalize Unicode characters to ASCII equivalents where possible
                    # This handles accented characters, smart quotes, etc.
                    cleaned = unicodedata.normalize('NFKD', cleaned)
                    
                    # Method 3: Convert remaining Unicode to ASCII or remove
                    def unicode_to_ascii(text):
                        """Convert Unicode to ASCII, removing or replacing problematic chars"""
                        result = []
                        for char in text:
                            # Keep basic ASCII printable + whitespace
                            if ord(char) <= 127:
                                result.append(char)
                            else:
                                # Try to get ASCII equivalent
                                try:
                                    ascii_char = unicodedata.normalize('NFKD', char).encode('ascii', 'ignore').decode('ascii')
                                    if ascii_char:
                                        result.append(ascii_char)
                                    else:
                                        # Replace with space for unknown chars
                                        result.append(' ')
                                except:
                                    result.append(' ')
                        return ''.join(result)
                    
                    cleaned = unicode_to_ascii(cleaned)
                    
                    # Method 4: Final cleanup of remaining problematic characters
                    # Keep only safe characters for JSON
                    cleaned = re.sub(r'[^\x20-\x7E\n\r\t]', ' ', cleaned)
                    
                    # Find JSON boundaries
                    json_start = cleaned.find('{')
                    json_end = cleaned.rfind('}') + 1
                    
                    if json_start >= 0 and json_end > json_start:
                        json_str = cleaned[json_start:json_end]
                        
                        # Step 2: Fix the main issue - unescaped newlines in JSON strings
                        # This is a much simpler and more reliable approach
                        
                        # Find all string values that span multiple lines and fix them
                        def fix_multiline_strings(text):
                            """Fix JSON strings that contain unescaped newlines"""
                            import re
                            
                            # Pattern to find string values with newlines: "description": "content with\n more content"
                            def replace_multiline(match):
                                field_name = match.group(1)
                                content = match.group(2)
                                
                                # Escape all newlines and clean up the content
                                escaped_content = content.replace('\n', '\\n').replace('\r', '\\r')
                                escaped_content = re.sub(r'\s+', ' ', escaped_content)  # Normalize whitespace
                                escaped_content = escaped_content.strip()
                                
                                return f'"{field_name}": "{escaped_content}"'
                            
                            # Match field: "multiline content"
                            pattern = r'"([^"]+)":\s*"([^"]*(?:\n[^"]*)*)"'
                            fixed = re.sub(pattern, replace_multiline, text, flags=re.DOTALL)
                            
                            return fixed
                        
                        json_str = fix_multiline_strings(json_str)
                        
                        # Step 3: Additional cleanup
                        json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)  # Remove trailing commas
                        json_str = re.sub(r'\n\s*\n', '\n', json_str)  # Remove empty lines
                        
                        # Step 4: Final escape any remaining literal newlines/control chars in strings
                        json_str = re.sub(r':\s*"([^"]*[\x00-\x1f][^"]*)"', 
                                         lambda m: f': "{m.group(1).encode("unicode_escape").decode("ascii")}"', 
                                         json_str)
                        
                        print(f"🔧 DEBUG: Final cleaned JSON (first 400 chars): {json_str[:400]}...")
                        
                        # Debug the specific error location
                        try:
                            parsed_profile = json.loads(json_str)
                        except json.JSONDecodeError as detailed_error:
                            error_pos = detailed_error.pos
                            print(f"🔍 DEBUG: JSON error at position {error_pos}")
                            print(f"🔍 DEBUG: Context around error:")
                            start = max(0, error_pos - 100)
                            end = min(len(json_str), error_pos + 100)
                            print(f"🔍 DEBUG: ...{json_str[start:end]}...")
                            
                            # Try a more aggressive fix for common JSON issues
                            fixed_json = self._fix_json_structure(json_str)
                            if fixed_json:
                                parsed_profile = json.loads(fixed_json)
                                print("✅ DEBUG: Successfully parsed JSON after structural fix!")
                            else:
                                raise detailed_error
                        print("✅ DEBUG: Successfully parsed JSON after aggressive cleaning!")
                        return parsed_profile
                        
                except Exception as cleanup_error:
                    print(f"❌ DEBUG: Aggressive cleaning also failed: {cleanup_error}")
                    
                    # Last resort: try to build a minimal valid JSON
                    try:
                        print("🔧 DEBUG: Attempting minimal JSON extraction...")
                        lines = ai_response.split('\n')
                        email = phone = name = ""
                        
                        for line in lines:
                            if 'email' in line.lower() and '@' in line:
                                match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', line)
                                if match:
                                    email = match.group()
                            elif 'phone' in line.lower() and ('(' in line or '+' in line):
                                match = re.search(r'[\+\(]?[\d\-\)\(\s]+', line)
                                if match:
                                    phone = match.group().strip()
                            elif 'full_name' in line.lower() and ':' in line:
                                match = re.search(r'"([^"]+)"', line)
                                if match and match.group(1):
                                    name = match.group(1)
                        
                        minimal_profile = {
                            "personal_information": {
                                "full_name": name,
                                "email": email,
                                "phone": phone,
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
                        
                        print("✅ DEBUG: Created minimal profile from extracted data")
                        return minimal_profile
                        
                    except Exception as minimal_error:
                        print(f"❌ DEBUG: Even minimal extraction failed: {minimal_error}")
                
                raise ValueError(f"Invalid JSON response from Ollama: {e}")
                
        except Exception as e:
            print(f"❌ DEBUG: Ollama request failed: {e}")
            print("⚠️ DEBUG: Falling back to basic parsing...")
            
            # Fallback to basic parsing if Ollama fails
            return self._fallback_parse(resume_text)
    
    def _fix_json_structure(self, json_str: str) -> str:
        """Try to fix common JSON structural issues"""
        try:
            print("🔧 DEBUG: Attempting structural JSON fix...")
            
            import re
            
            # Fix 1: Escape unescaped quotes in string values
            def fix_quotes_in_strings(text):
                # Pattern to match string values and escape internal quotes
                def escape_internal_quotes(match):
                    field_name = match.group(1)
                    value = match.group(2)
                    # Escape internal quotes but not the boundary quotes
                    escaped_value = value.replace('"', '\\"')
                    return f'"{field_name}": "{escaped_value}"'
                
                # Match "field": "value with possible unescaped quotes"
                pattern = r'"([^"]+)":\s*"([^"]*(?:[^"\\]"[^"]*)*)"'
                return re.sub(pattern, escape_internal_quotes, text)
            
            fixed = fix_quotes_in_strings(json_str)
            
            # Fix 2: Fix invalid numeric expressions like "gpa": 3.87/4.0
            fixed = re.sub(r'"gpa":\s*(\d+\.\d+)/(\d+\.\d+)', r'"gpa": "\1"', fixed)
            fixed = re.sub(r'"years":\s*(\d+)', r'"years": \1', fixed)  # Keep years as numbers
            
            # Fix 2.5: Fix truncated descriptions that might end abruptly
            # Look for lines that end with text but no closing quote before a newline with structure
            def fix_truncated_descriptions(text):
                lines = text.split('\n')
                fixed_lines = []
                for i, line in enumerate(lines):
                    # Check if this line looks like a truncated description
                    if ('"description":' in line and 
                        line.count('"') == 3 and  # Field name + opening quote, but no closing quote
                        i + 1 < len(lines) and 
                        (lines[i + 1].strip().startswith('}') or lines[i + 1].strip().startswith('],'))):
                        # Add closing quote
                        line = line.rstrip() + '"'
                    fixed_lines.append(line)
                return '\n'.join(fixed_lines)
            
            fixed = fix_truncated_descriptions(fixed)
            
            # Fix 3: Remove trailing commas before closing brackets/braces
            fixed = re.sub(r',(\s*[}\]])', r'\1', fixed)
            
            # Fix 4: Fix missing commas between objects/arrays
            fixed = re.sub(r'}\s*{', '}, {', fixed)
            fixed = re.sub(r']\s*\[', '], [', fixed)
            
            # Fix 4: Fix incomplete strings (strings that don't close)
            lines = fixed.split('\n')
            fixed_lines = []
            for line in lines:
                # Count quotes in the line
                quote_count = line.count('"')
                # If odd number of quotes, the string is incomplete
                if quote_count % 2 == 1 and ':' in line:
                    # Try to close the incomplete string
                    if line.rstrip().endswith(','):
                        line = line.rstrip()[:-1] + '",\n'
                    else:
                        line = line.rstrip() + '"\n'
                fixed_lines.append(line)
            
            fixed = '\n'.join(fixed_lines)
            
            # Fix 5: Ensure proper closing of the main JSON object
            if not fixed.rstrip().endswith('}'):
                fixed = fixed.rstrip() + '\n}'
            
            print(f"🔧 DEBUG: Structural fix applied, new length: {len(fixed)}")
            
            # Test if the fix worked
            json.loads(fixed)
            return fixed
            
        except Exception as e:
            print(f"❌ DEBUG: Structural fix failed: {e}")
            return None
    
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