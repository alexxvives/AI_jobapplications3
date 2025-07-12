"""
Semantic Job Application Form Filler
Advanced form filling with semantic field matching - JavaScript Generation Only
NO BROWSER AUTOMATION - PURE JAVASCRIPT INJECTION
"""

import json
import asyncio
import re
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import logging
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class FormField:
    """Represents a form field with all its metadata"""
    def __init__(self, element_id: str, tag: str, input_type: str, name: str, 
                 id_attr: str, placeholder: str, label_text: str, nearby_text: str,
                 required: bool, options: List[str] = None):
        self.element_id = element_id
        self.tag = tag
        self.input_type = input_type
        self.name = name
        self.id_attr = id_attr
        self.placeholder = placeholder
        self.label_text = label_text
        self.nearby_text = nearby_text
        self.required = required
        self.options = options or []
        self.descriptor = self._create_descriptor()
    
    def _create_descriptor(self) -> str:
        """Create a semantic descriptor string for this field"""
        parts = []
        
        # Add label text (highest priority)
        if self.label_text:
            parts.append(self.label_text.lower())
        
        # Add placeholder text
        if self.placeholder:
            parts.append(self.placeholder.lower())
        
        # Add name attribute
        if self.name:
            parts.append(self.name.lower().replace('_', ' ').replace('-', ' '))
        
        # Add id attribute
        if self.id_attr:
            parts.append(self.id_attr.lower().replace('_', ' ').replace('-', ' '))
        
        # Add nearby text (lower priority)
        if self.nearby_text:
            parts.append(self.nearby_text.lower())
        
        # Add input type context
        if self.input_type:
            parts.append(f"input type {self.input_type}")
        
        return ' '.join(parts)
    
    def is_resume_field(self) -> bool:
        """Check if this field is for resume upload"""
        resume_keywords = ['resume', 'cv', 'curriculum vitae', 'upload resume', 'upload cv']
        descriptor_lower = self.descriptor.lower()
        return (self.input_type == 'file' and 
                any(keyword in descriptor_lower for keyword in resume_keywords))

class SemanticFormFiller:
    """
    Semantic form filler - JavaScript generation only, NO BROWSER AUTOMATION
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Initialize semantic matching
        self.vectorizer = TfidfVectorizer(stop_words='english', ngram_range=(1, 2))
        
        # Profile field mappings for semantic matching
        self.profile_field_descriptors = {
            'full_name': 'full name complete name full legal name',
            'first_name': 'first name given name forename',
            'last_name': 'last name surname family name lastname',
            'email': 'email address email contact electronic mail',
            'phone': 'phone number telephone mobile cell phone contact number',
            'address': 'address street address home address mailing address',
            'city': 'city town municipality location',
            'state': 'state province region territory',
            'zip_code': 'zip code postal code postcode zipcode',
            'country': 'country nation nationality',
            'current_company': 'current company employer current employer company name organization',
            'current_title': 'current title job title position current position role current job',
            'linkedin': 'linkedin profile linkedin url social profile professional profile',
            'github': 'github profile github url portfolio code repository',
            'portfolio': 'portfolio website personal website portfolio url',
            'experience_years': 'years of experience total experience work experience',
            'education_degree': 'degree education qualification highest degree university degree',
            'education_school': 'school university college institution alma mater',
            'salary_current': 'current salary salary compensation current pay',
            'salary_expected': 'expected salary desired salary salary expectation target salary',
            'availability': 'availability start date notice period when can you start',
            'visa_status': 'visa status work authorization visa sponsorship immigration status',
            'cover_letter': 'cover letter motivation letter personal statement why interested'
        }

    async def fill_form_semantically(self, job_url: str, user_profile: Dict[str, Any], 
                                   resume_path: str = "/user_data/resume.pdf") -> Dict[str, Any]:
        """
        Generate semantic form filling JavaScript for injection - NO BROWSER AUTOMATION
        """
        try:
            print(f"🧠 DEBUG SEMANTIC: ===== STARTING SEMANTIC FORM FILLING (NO BROWSER) =====")
            print(f"🧠 DEBUG SEMANTIC: VERSION: PURE JAVASCRIPT GENERATION - NO CHROMIUM/PLAYWRIGHT")
            print(f"🧠 DEBUG SEMANTIC: Job URL: {job_url}")
            print(f"🧠 DEBUG SEMANTIC: Resume path: {resume_path}")
            print(f"🧠 DEBUG SEMANTIC: User profile keys: {list(user_profile.keys())}")
            
            # Step 1: Prepare user data for matching
            print(f"🧠 DEBUG SEMANTIC: 📝 Step 1: Preparing user data...")
            self.user_data = self._prepare_user_data(user_profile)
            print(f"🧠 DEBUG SEMANTIC: Prepared {len(self.user_data)} user data fields")
            print(f"🧠 DEBUG SEMANTIC: User data fields: {list(self.user_data.keys())}")
            print(f"🧠 DEBUG SEMANTIC: User data values: {self.user_data}")
            
            if not self.user_data:
                print(f"🧠 DEBUG SEMANTIC: ❌ No user data could be extracted!")
                return {
                    "success": False,
                    "error": "No user data available",
                    "fields_filled": 0
                }
            
            # Step 2: Generate semantic mapping JavaScript
            print(f"🧠 DEBUG SEMANTIC: 🎯 Step 2: Generating semantic form filling JavaScript...")
            js_injection = self._generate_semantic_js()
            print(f"🧠 DEBUG SEMANTIC: ✅ JavaScript generated successfully")
            print(f"🧠 DEBUG SEMANTIC: JavaScript length: {len(js_injection)} characters")
            print(f"🧠 DEBUG SEMANTIC: JavaScript preview: {js_injection[:200]}...")
            
            # Step 3: Count potential fields
            estimated_fields = len([v for v in self.user_data.values() if v and str(v).strip()])
            print(f"🧠 DEBUG SEMANTIC: 📊 Step 3: Estimated {estimated_fields} fields will be filled")
            
            print(f"🧠 DEBUG SEMANTIC: ===== SEMANTIC FORM FILLING READY =====")
            print(f"🧠 DEBUG SEMANTIC: ✅ JavaScript generated for injection into regular browser tab")
            print(f"🧠 DEBUG SEMANTIC: ✅ NO Chromium window will be opened")
            print(f"🧠 DEBUG SEMANTIC: ✅ NO browser automation will run")
            
            final_response = {
                "success": True,
                "fields_filled": estimated_fields,
                "semantic_matches": estimated_fields,
                "message": f"Semantic form filling prepared - {estimated_fields} fields ready",
                "browser_ready": False,
                "js_injection": js_injection,
                "job_url": job_url,
                "form_data": self.user_data,
                "automation_type": "semantic_with_ai_fallback",
                "status": "awaiting_user_confirmation",
                "application_url": job_url
            }
            
            print(f"🧠 DEBUG SEMANTIC: ===== FINAL RESPONSE CREATED =====")
            print(f"🧠 DEBUG SEMANTIC: Response success: {final_response['success']}")
            print(f"🧠 DEBUG SEMANTIC: Response automation_type: {final_response['automation_type']}")
            print(f"🧠 DEBUG SEMANTIC: Response status: {final_response['status']}")
            print(f"🧠 DEBUG SEMANTIC: Response fields_filled: {final_response['fields_filled']}")
            print(f"🧠 DEBUG SEMANTIC: Response has js_injection: {bool(final_response['js_injection'])}")
            print(f"🧠 DEBUG SEMANTIC: Returning response to integration service...")
            
            return final_response
            
        except Exception as e:
            print(f"DEBUG SEMANTIC: ❌ Error: {str(e)}")
            import traceback
            print(f"DEBUG SEMANTIC: Traceback: {traceback.format_exc()}")
            
            return {
                "success": False,
                "error": str(e),
                "fields_filled": 0
            }
    
    def _prepare_user_data(self, user_profile: Dict[str, Any]) -> Dict[str, str]:
        """Prepare user profile data for semantic matching"""
        user_data = {}
        
        # Extract personal information
        personal = user_profile.get("personal_information", {})
        
        # Handle nested structure
        basic_info = personal.get("basic_information", {})
        contact_info = personal.get("contact_information", {})
        address_info = personal.get("address", {})
        
        # Name fields
        full_name = basic_info.get("full_name") or personal.get("full_name") or ""
        if not full_name and basic_info.get("first_name"):
            full_name = f"{basic_info.get('first_name', '')} {basic_info.get('last_name', '')}".strip()
        
        if full_name:
            user_data["full_name"] = full_name
            name_parts = full_name.split()
            if name_parts:
                user_data["first_name"] = name_parts[0]
                if len(name_parts) > 1:
                    user_data["last_name"] = " ".join(name_parts[1:])
        
        # Contact information
        if contact_info.get("email") or personal.get("email"):
            user_data["email"] = contact_info.get("email") or personal.get("email")
        
        if contact_info.get("telephone") or contact_info.get("phone") or personal.get("phone"):
            user_data["phone"] = (contact_info.get("telephone") or 
                                contact_info.get("phone") or 
                                personal.get("phone"))
        
        # Address information
        if address_info.get("address") or personal.get("address"):
            user_data["address"] = address_info.get("address") or personal.get("address")
        if address_info.get("city") or personal.get("city"):
            user_data["city"] = address_info.get("city") or personal.get("city")
        if address_info.get("state") or personal.get("state"):
            user_data["state"] = address_info.get("state") or personal.get("state")
        if address_info.get("zip_code") or personal.get("zip_code"):
            user_data["zip_code"] = address_info.get("zip_code") or personal.get("zip_code")
        if address_info.get("country") or personal.get("country"):
            user_data["country"] = address_info.get("country") or personal.get("country")
        
        # Work experience
        work_exp = user_profile.get("work_experience", [])
        if work_exp and isinstance(work_exp, list) and len(work_exp) > 0:
            latest_job = work_exp[0]
            if isinstance(latest_job, dict):
                if latest_job.get("company"):
                    user_data["current_company"] = latest_job.get("company")
                if latest_job.get("title"):
                    user_data["current_title"] = latest_job.get("title")
        
        # Job preferences
        job_prefs = user_profile.get("job_preferences", {})
        if job_prefs.get("linkedin_link"):
            user_data["linkedin"] = job_prefs.get("linkedin_link")
        if job_prefs.get("github_link"):
            user_data["github"] = job_prefs.get("github_link")
        if job_prefs.get("portfolio_link"):
            user_data["portfolio"] = job_prefs.get("portfolio_link")
        
        return user_data
    
    def _generate_semantic_js(self) -> str:
        """Generate JavaScript for semantic form filling injection"""
        # Create comprehensive field selectors based on semantic understanding
        field_mappings = []
        
        for field_key, field_value in self.user_data.items():
            if not field_value or not str(field_value).strip():
                continue
                
            selectors = []
            
            # Generate selectors based on field type
            if field_key == "full_name":
                selectors = [
                    'input[name*="name"]:not([name*="last"]):not([name*="first"])',
                    'input[placeholder*="full name" i]',
                    'input[id*="name"]:not([id*="last"]):not([id*="first"])',
                    'input[name="name"]',
                    'input[id="name"]'
                ]
            elif field_key == "first_name":
                selectors = [
                    'input[name*="first" i]',
                    'input[placeholder*="first name" i]',
                    'input[id*="first" i]',
                    'input[name="firstName"]',
                    'input[name="first_name"]'
                ]
            elif field_key == "last_name":
                selectors = [
                    'input[name*="last" i]',
                    'input[placeholder*="last name" i]',
                    'input[id*="last" i]',
                    'input[name="lastName"]',
                    'input[name="last_name"]'
                ]
            elif field_key == "email":
                selectors = [
                    'input[type="email"]',
                    'input[name*="email" i]',
                    'input[placeholder*="email" i]',
                    'input[id*="email" i]'
                ]
            elif field_key == "phone":
                selectors = [
                    'input[type="tel"]',
                    'input[name*="phone" i]',
                    'input[placeholder*="phone" i]',
                    'input[id*="phone" i]',
                    'input[name*="mobile" i]'
                ]
            elif field_key == "city":
                selectors = [
                    'input[name*="city" i]',
                    'input[placeholder*="city" i]',
                    'input[id*="city" i]'
                ]
            elif field_key == "state":
                selectors = [
                    'input[name*="state" i]',
                    'input[placeholder*="state" i]',
                    'input[id*="state" i]',
                    'select[name*="state" i]'
                ]
            elif field_key == "zip_code":
                selectors = [
                    'input[name*="zip" i]',
                    'input[name*="postal" i]',
                    'input[placeholder*="zip" i]',
                    'input[id*="zip" i]'
                ]
            elif field_key == "country":
                selectors = [
                    'input[name*="country" i]',
                    'input[placeholder*="country" i]',
                    'input[id*="country" i]',
                    'select[name*="country" i]'
                ]
            elif field_key == "current_company":
                selectors = [
                    'input[name*="company" i]',
                    'input[placeholder*="company" i]',
                    'input[id*="company" i]',
                    'input[name*="employer" i]'
                ]
            elif field_key == "current_title":
                selectors = [
                    'input[name*="title" i]',
                    'input[placeholder*="title" i]',
                    'input[id*="title" i]',
                    'input[name*="position" i]'
                ]
            
            if selectors:
                field_mappings.append({
                    "field": field_key,
                    "value": str(field_value),
                    "selectors": selectors
                })
        
        # Generate the JavaScript injection code
        js_code = f"""
(function() {{
    console.log('🤖 Starting Semantic Auto-Fill...');
    
    const fieldMappings = {json.dumps(field_mappings, indent=2)};
    let filledCount = 0;
    
    // Create progress panel
    function createProgressPanel() {{
        const existingPanel = document.getElementById('semantic-autofill-panel');
        if (existingPanel) existingPanel.remove();
        
        const panel = document.createElement('div');
        panel.id = 'semantic-autofill-panel';
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 300px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            font-size: 14px;
            font-weight: 500;
            z-index: 999999;
            border: 2px solid rgba(255,255,255,0.2);
        `;
        
        panel.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <div style="width: 12px; height: 12px; background: #4CAF50; border-radius: 50%; margin-right: 10px;"></div>
                <strong>🧠 Semantic Auto-Fill</strong>
            </div>
            <div id="semantic-status">Analyzing form fields...</div>
            <div style="margin-top: 10px;">
                <div style="background: rgba(255,255,255,0.2); height: 4px; border-radius: 2px;">
                    <div id="semantic-progress-bar" style="width: 0%; height: 100%; background: #4CAF50; transition: width 0.3s ease;"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        return panel;
    }}
    
    function updateProgress(status, percent) {{
        const statusEl = document.getElementById('semantic-status');
        const progressEl = document.getElementById('semantic-progress-bar');
        if (statusEl) statusEl.textContent = status;
        if (progressEl && percent !== undefined) progressEl.style.width = percent + '%';
    }}
    
    // Create panel
    const panel = createProgressPanel();
    updateProgress('Starting semantic field analysis...', 10);
    
    setTimeout(() => {{
        updateProgress('Matching fields with profile data...', 30);
        
        // Process each field mapping
        fieldMappings.forEach((mapping, index) => {{
            updateProgress(`Filling ${{mapping.field}}...`, 40 + (index / fieldMappings.length) * 40);
            
            let fieldFilled = false;
            mapping.selectors.forEach(selector => {{
                if (fieldFilled) return;
                
                try {{
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(element => {{
                        if (fieldFilled) return;
                        if (!element || element.offsetParent === null) return;
                        if (element.value && element.value.trim()) return; // Skip if already filled
                        
                        // Highlight field
                        element.style.border = '2px solid #4CAF50';
                        element.style.boxShadow = '0 0 10px rgba(76, 175, 80, 0.5)';
                        
                        // Focus and fill
                        element.focus();
                        
                        if (element.tagName === 'SELECT') {{
                            // Handle select elements
                            const options = Array.from(element.options);
                            const matchingOption = options.find(opt => 
                                opt.textContent.toLowerCase().includes(mapping.value.toLowerCase()) ||
                                mapping.value.toLowerCase().includes(opt.textContent.toLowerCase())
                            );
                            if (matchingOption) {{
                                element.value = matchingOption.value;
                                element.dispatchEvent(new Event('change', {{ bubbles: true }}));
                                fieldFilled = true;
                                filledCount++;
                            }}
                        }} else {{
                            // Handle input/textarea elements
                            element.value = mapping.value;
                            element.dispatchEvent(new Event('input', {{ bubbles: true }}));
                            element.dispatchEvent(new Event('change', {{ bubbles: true }}));
                            fieldFilled = true;
                            filledCount++;
                        }}
                        
                        // Remove highlight after delay
                        setTimeout(() => {{
                            element.style.border = '';
                            element.style.boxShadow = '';
                        }}, 2000);
                        
                        console.log(`✅ Filled ${{mapping.field}}: ${{mapping.value}}`);
                    }});
                }} catch (e) {{
                    console.log('Error with selector:', selector, e);
                }}
            }});
        }});
        
        setTimeout(() => {{
            updateProgress(`Complete! ${{filledCount}} fields filled successfully`, 100);
            
            // Show completion banner
            setTimeout(() => {{
                const banner = document.createElement('div');
                banner.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    z-index: 999999;
                    background: linear-gradient(90deg, #4CAF50, #45a049);
                    color: white;
                    padding: 15px 20px;
                    text-align: center;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                    font-size: 16px;
                    font-weight: 500;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                `;
                banner.innerHTML = `
                    🧠 <strong>Semantic Auto-Fill Complete!</strong> 
                    ${{filledCount}} fields filled using intelligent field matching. 
                    Please review all information and submit manually.
                `;
                
                document.body.appendChild(banner);
                
                // Remove banner after 10 seconds
                setTimeout(() => {{
                    if (banner.parentNode) banner.remove();
                }}, 10000);
                
                // Remove progress panel after 5 seconds
                setTimeout(() => {{
                    if (panel.parentNode) panel.remove();
                }}, 5000);
            }}, 500);
        }}, 1000);
    }}, 500);
    
    console.log(`🧠 Semantic Auto-Fill: Ready to fill ${{fieldMappings.length}} field types`);
}})();
"""
        return js_code

# Global instance
semantic_form_filler = SemanticFormFiller()