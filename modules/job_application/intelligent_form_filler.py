"""
Intelligent Form Filling using LangChain AI
Analyzes form structure and maps profile data using AI reasoning
"""

import json
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

try:
    from langchain.llms import Ollama
    from langchain.prompts import PromptTemplate
    from langchain.schema import BaseOutputParser
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    # Mock classes for when LangChain is not available
    class Ollama:
        def __init__(self, model="llama3:latest"):
            self.model = model
        def invoke(self, prompt):
            return '{"field_mappings": [], "reasoning": "LangChain not available"}'

class FormFieldMapping:
    """Represents a mapping between a profile field and a form field"""
    def __init__(self, selector: str, profile_path: str, value: str, confidence: float, reasoning: str):
        self.selector = selector
        self.profile_path = profile_path  
        self.value = value
        self.confidence = confidence
        self.reasoning = reasoning

class IntelligentFormFiller:
    """
    AI-powered form filler that understands form structure and maps profile data intelligently
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        if LANGCHAIN_AVAILABLE:
            self.llm = Ollama(model="llama3:latest")
        else:
            self.llm = Ollama()  # Mock
    
    async def analyze_and_fill_form(self, page, user_profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main method: Analyze form structure and fill it intelligently
        """
        try:
            print(f"DEBUG AI: ===== INTELLIGENT FORM FILLER START =====")
            print(f"DEBUG AI: LangChain available: {LANGCHAIN_AVAILABLE}")
            print(f"DEBUG AI: Profile keys: {list(user_profile.keys()) if user_profile else 'None'}")
            
            # Step 1: Extract form structure
            print(f"DEBUG AI: Step 1 - Extracting form structure...")
            form_structure = await self._extract_form_structure(page)
            print(f"DEBUG AI: Found {len(form_structure)} form fields")
            
            # Print form structure for debugging
            for i, field in enumerate(form_structure[:5]):  # Limit to first 5 fields
                print(f"DEBUG AI: Field {i}: {field.get('tag', 'unknown')} name='{field.get('name', '')}' type='{field.get('type', '')}' context='{field.get('context', '')[:50]}...'")
            
            # Step 2: Use AI to analyze and create mappings
            print(f"DEBUG AI: Step 2 - Creating AI mappings...")
            mappings = await self._create_intelligent_mappings(form_structure, user_profile)
            print(f"DEBUG AI: Created {len(mappings)} AI mappings")
            
            # Print mappings for debugging
            for i, mapping in enumerate(mappings):
                print(f"DEBUG AI: Mapping {i}: {mapping.profile_path} -> '{mapping.value}' (confidence: {mapping.confidence})")
            
            # Step 3: Fill the form based on AI mappings
            print(f"DEBUG AI: Step 3 - Filling form with AI mappings...")
            filled_fields = await self._fill_form_with_mappings(page, mappings)
            print(f"DEBUG AI: Successfully filled {len(filled_fields)} fields")
            
            print(f"DEBUG AI: ===== INTELLIGENT FORM FILLER COMPLETE =====")
            
            return {
                "success": True,
                "fields_filled": filled_fields,
                "form_structure": form_structure,
                "ai_mappings": [vars(m) for m in mappings],
                "message": f"AI filled {len(filled_fields)} fields intelligently"
            }
            
        except Exception as e:
            print(f"DEBUG AI: ❌ Intelligent form filling failed: {str(e)}")
            import traceback
            print(f"DEBUG AI: Exception traceback: {traceback.format_exc()}")
            
            self.logger.error(f"Intelligent form filling failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "fields_filled": []
            }
    
    async def _extract_form_structure(self, page) -> List[Dict[str, Any]]:
        """
        Extract all form fields and their context from the page
        """
        form_fields = []
        
        try:
            # Get all form elements
            elements = await page.query_selector_all('input, textarea, select')
            
            for i, element in enumerate(elements):
                try:
                    # Get element attributes
                    tag_name = await element.evaluate('el => el.tagName.toLowerCase()')
                    input_type = await element.evaluate('el => el.type || "text"')
                    name = await element.evaluate('el => el.name || ""')
                    id_attr = await element.evaluate('el => el.id || ""')
                    placeholder = await element.evaluate('el => el.placeholder || ""')
                    required = await element.evaluate('el => el.required')
                    is_visible = await element.is_visible()
                    is_editable = await element.is_editable()
                    
                    # Get surrounding context (labels, nearby text)
                    context = await element.evaluate('''
                        el => {
                            let context = '';
                            
                            // Get associated label
                            const label = el.labels?.[0];
                            if (label) context += label.textContent.trim() + ' ';
                            
                            // Get aria-label
                            if (el.getAttribute('aria-label')) {
                                context += el.getAttribute('aria-label') + ' ';
                            }
                            
                            // Get nearby text (parent, previous sibling, etc.)
                            let parent = el.parentElement;
                            if (parent) {
                                const parentText = parent.textContent.replace(el.textContent, '').trim();
                                if (parentText.length < 100) context += parentText + ' ';
                            }
                            
                            return context.trim();
                        }
                    ''')
                    
                    # Only include visible, editable fields
                    if is_visible and is_editable:
                        field_info = {
                            "index": i,
                            "tag": tag_name,
                            "type": input_type,
                            "name": name,
                            "id": id_attr,
                            "placeholder": placeholder,
                            "required": required,
                            "context": context,
                            "selector": f'input:nth-of-type({i+1})' if tag_name == 'input' else f'{tag_name}:nth-of-type({i+1})'
                        }
                        form_fields.append(field_info)
                        
                except Exception as e:
                    self.logger.warning(f"Could not extract field {i}: {e}")
                    continue
            
            self.logger.info(f"Extracted {len(form_fields)} form fields")
            return form_fields
            
        except Exception as e:
            self.logger.error(f"Failed to extract form structure: {e}")
            return []
    
    async def _create_intelligent_mappings(self, form_structure: List[Dict], user_profile: Dict) -> List[FormFieldMapping]:
        """
        Use AI to intelligently map profile data to form fields
        """
        if not form_structure:
            return []
        
        # Prepare profile data summary for AI
        profile_summary = self._prepare_profile_summary(user_profile)
        print(f"DEBUG AI: Profile summary for AI: {profile_summary}")
        
        # Create AI prompt
        prompt = self._create_mapping_prompt(form_structure, profile_summary)
        print(f"DEBUG AI: Created prompt for AI (length: {len(prompt)} chars)")
        
        try:
            # Get AI response
            print(f"DEBUG AI: Calling AI model...")
            if LANGCHAIN_AVAILABLE:
                response = self.llm.invoke(prompt)
            else:
                response = self.llm.invoke(prompt)  # Mock response
            
            print(f"DEBUG AI: AI response: {response}")
            
            # Parse AI response into mappings
            mappings = self._parse_ai_response(response, user_profile)
            
            print(f"DEBUG AI: Parsed {len(mappings)} mappings from AI response")
            self.logger.info(f"AI created {len(mappings)} field mappings")
            return mappings
            
        except Exception as e:
            self.logger.error(f"AI mapping failed: {e}")
            return []
    
    def _prepare_profile_summary(self, user_profile: Dict) -> str:
        """
        Create a summary of user profile data for AI analysis
        """
        summary_parts = []
        
        # Personal information - handle the correct structure
        personal = user_profile.get("personal_information", {})
        
        # Check for nested structure (basic_information, contact_information)
        basic_info = personal.get("basic_information", {})
        contact_info = personal.get("contact_information", {})
        address_info = personal.get("address", {})
        
        # Extract name
        full_name = basic_info.get("full_name") or personal.get("full_name") or ""
        if not full_name and basic_info.get("first_name"):
            full_name = f"{basic_info.get('first_name', '')} {basic_info.get('last_name', '')}".strip()
        
        # Extract contact details
        email = contact_info.get("email") or personal.get("email") or ""
        phone = contact_info.get("telephone") or contact_info.get("phone") or personal.get("phone") or ""
        
        # Extract address
        city = address_info.get("city") or personal.get("city") or ""
        state = address_info.get("state") or personal.get("state") or ""
        
        if full_name:
            summary_parts.append(f"Full Name: {full_name}")
        if email:
            summary_parts.append(f"Email: {email}")
        if phone:
            summary_parts.append(f"Phone: {phone}")
        if city:
            summary_parts.append(f"City: {city}")
        if state:
            summary_parts.append(f"State: {state}")
        
        # Work experience
        work_exp = user_profile.get("work_experience", [])
        if work_exp:
            latest_job = work_exp[0] if isinstance(work_exp, list) else work_exp
            if isinstance(latest_job, dict):
                summary_parts.append(f"Current/Latest Job: {latest_job.get('title', '')} at {latest_job.get('company', '')}")
        
        # Education  
        education = user_profile.get("education", [])
        if education:
            latest_edu = education[0] if isinstance(education, list) else education
            if isinstance(latest_edu, dict):
                summary_parts.append(f"Education: {latest_edu.get('degree', '')} from {latest_edu.get('school', '')}")
        
        # Skills
        skills = user_profile.get("skills", [])
        if skills:
            skill_names = [s.get("name", str(s)) if isinstance(s, dict) else str(s) for s in skills[:5]]
            summary_parts.append(f"Skills: {', '.join(skill_names)}")
        
        return " | ".join(summary_parts)
    
    def _create_mapping_prompt(self, form_structure: List[Dict], profile_summary: str) -> str:
        """
        Create AI prompt for intelligent field mapping
        """
        form_fields_text = ""
        for field in form_structure:
            form_fields_text += f"Field {field['index']}: {field['tag']} type='{field['type']}' name='{field['name']}' id='{field['id']}' placeholder='{field['placeholder']}' context='{field['context']}' required={field['required']}\n"
        
        prompt = f"""You are an expert at analyzing job application forms and mapping user profile data to form fields.

FORM FIELDS ON THE PAGE:
{form_fields_text}

USER PROFILE DATA:
{profile_summary}

TASK: Analyze each form field and determine which profile data should be filled in each field. Consider:
1. Field names, IDs, placeholders, and surrounding context
2. Field types (email, tel, text, etc.)
3. Whether the field is required
4. Common job application form patterns

For each field that should be filled, provide a mapping in this JSON format:
{{
  "field_mappings": [
    {{
      "field_index": 0,
      "profile_field": "personal_information.full_name",
      "value": "John Doe",
      "confidence": 0.95,
      "reasoning": "Field context indicates full name input"
    }}
  ]
}}

Only map fields you are confident about (confidence > 0.7). Provide clear reasoning for each mapping.
Return valid JSON only, no other text."""

        return prompt
    
    def _parse_ai_response(self, response: str, user_profile: Dict) -> List[FormFieldMapping]:
        """
        Parse AI response into FormFieldMapping objects
        """
        mappings = []
        
        try:
            # Parse JSON response
            data = json.loads(response)
            field_mappings = data.get("field_mappings", [])
            
            for mapping in field_mappings:
                try:
                    field_index = mapping.get("field_index")
                    profile_field = mapping.get("profile_field", "")
                    value = mapping.get("value", "")
                    confidence = mapping.get("confidence", 0.0)
                    reasoning = mapping.get("reasoning", "")
                    
                    # Create selector based on field index
                    selector = f'input:nth-of-type({field_index + 1})'
                    
                    # Validate confidence threshold
                    if confidence >= 0.7:
                        form_mapping = FormFieldMapping(
                            selector=selector,
                            profile_path=profile_field,
                            value=value,
                            confidence=confidence,
                            reasoning=reasoning
                        )
                        mappings.append(form_mapping)
                        
                except Exception as e:
                    self.logger.warning(f"Could not parse mapping: {e}")
                    continue
            
        except Exception as e:
            self.logger.error(f"Could not parse AI response: {e}")
        
        return mappings
    
    async def _fill_form_with_mappings(self, page, mappings: List[FormFieldMapping]) -> List[Dict]:
        """
        Fill form fields based on AI-generated mappings
        """
        filled_fields = []
        
        for mapping in mappings:
            try:
                success = await self._fill_single_field(page, mapping)
                if success:
                    filled_fields.append({
                        "selector": mapping.selector,
                        "value": mapping.value,
                        "confidence": mapping.confidence,
                        "reasoning": mapping.reasoning
                    })
                    self.logger.info(f"✅ Filled field with AI mapping: {mapping.reasoning}")
                else:
                    self.logger.warning(f"❌ Failed to fill field: {mapping.selector}")
                    
            except Exception as e:
                self.logger.error(f"Error filling field {mapping.selector}: {e}")
                continue
        
        return filled_fields
    
    async def _fill_single_field(self, page, mapping: FormFieldMapping) -> bool:
        """
        Fill a single form field based on AI mapping
        """
        try:
            # Find element using multiple selector strategies
            element = None
            
            # Try different selector approaches
            selectors_to_try = [
                mapping.selector,
                f'input:nth-child({mapping.selector.split("(")[1].split(")")[0]})',
                f'input[name*="{mapping.profile_path.split(".")[-1]}"]',
                f'input[id*="{mapping.profile_path.split(".")[-1]}"]'
            ]
            
            for selector in selectors_to_try:
                try:
                    element = await page.query_selector(selector)
                    if element:
                        is_visible = await element.is_visible()
                        is_editable = await element.is_editable()
                        if is_visible and is_editable:
                            break
                        else:
                            element = None
                except:
                    continue
            
            if not element:
                return False
            
            # Highlight field briefly
            await element.evaluate("el => el.style.border = '2px solid #00ff00'")
            
            # Focus and fill
            await element.click()
            await element.fill("")
            await element.fill(mapping.value)
            
            # Verify value was set
            filled_value = await element.input_value()
            success = filled_value == mapping.value
            
            # Remove highlight
            await element.evaluate("el => el.style.border = ''")
            
            return success
            
        except Exception as e:
            self.logger.error(f"Error filling field: {e}")
            return False

# Global instance
intelligent_form_filler = IntelligentFormFiller()