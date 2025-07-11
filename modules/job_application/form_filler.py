import os
import time
import asyncio
from typing import Dict, Any, List, Optional
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from selenium.webdriver.chrome.options import Options
import logging

# Try to import webdriver-manager for auto ChromeDriver management
try:
    from webdriver_manager.chrome import ChromeDriverManager
    from selenium.webdriver.chrome.service import Service
    WEBDRIVER_MANAGER_AVAILABLE = True
except ImportError:
    WEBDRIVER_MANAGER_AVAILABLE = False

class VisualJobApplicationAutomator:
    """
    Handles visual job application automation using Selenium
    User can see the form being filled in real-time
    """
    
    def __init__(self):
        self.driver = None
        self.wait_timeout = 10
        self.setup_logging()
    
    def setup_logging(self):
        """Setup logging for automation tracking"""
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    def get_direct_application_url(self, job_url: str) -> str:
        """
        Convert job detail URLs to direct application URLs where possible
        """
        # Handle Lever URLs - add /apply to go directly to application form
        if "jobs.lever.co" in job_url:
            if not job_url.endswith("/apply"):
                return job_url.rstrip("/") + "/apply"
        
        # Handle other ATS platforms that might need URL modifications
        # Greenhouse URLs are typically direct to application form
        # Workday URLs vary by company implementation
        
        return job_url
    
    def is_application_form_page(self) -> bool:
        """
        Check if current page is an application form page
        """
        try:
            # Look for common application form indicators
            form_indicators = [
                "input[name*='first']",  # First name field
                "input[name*='last']",   # Last name field
                "input[type='email']",   # Email field
                "input[type='file']",    # File upload (resume)
                "form[action*='apply']", # Apply form
                ".application-form",    # Application form class
                "[data-qa*='application']", # Application data attributes
                "input[placeholder*='First']",  # First name placeholder
                "input[placeholder*='Email']",  # Email placeholder
            ]
            
            for indicator in form_indicators:
                elements = self.driver.find_elements(By.CSS_SELECTOR, indicator)
                if elements:
                    self.logger.info(f"Found application form indicator: {indicator}")
                    return True
            
            # Check for Lever-specific application form indicators
            lever_form_indicators = [
                ".application",
                "[data-qa='application']",
                "form.application-form",
                ".lever-application"
            ]
            
            for indicator in lever_form_indicators:
                elements = self.driver.find_elements(By.CSS_SELECTOR, indicator)
                if elements:
                    self.logger.info(f"Found Lever application form indicator: {indicator}")
                    return True
                    
            return False
            
        except Exception as e:
            self.logger.error(f"Error checking for application form: {str(e)}")
            return False
    
    async def try_click_selector(self, selector: str) -> bool:
        """
        Try to click an element using the given selector
        """
        try:
            if ":contains(" in selector:
                # Handle text-based selectors
                text = selector.split(":contains('")[1].split("'")[0]
                elements = self.driver.find_elements(By.XPATH, f"//*[contains(text(), '{text}')]")
            else:
                elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
            
            if elements:
                element = elements[0]
                self.logger.info(f"Found apply button with selector: {selector}")
                
                # Scroll to element and click
                self.driver.execute_script("arguments[0].scrollIntoView(true);", element)
                await asyncio.sleep(1)
                
                # Try regular click first
                try:
                    element.click()
                    self.logger.info("Apply button clicked successfully")
                    return True
                except Exception as click_error:
                    # Try JavaScript click as fallback
                    try:
                        self.driver.execute_script("arguments[0].click();", element)
                        self.logger.info("Apply button clicked successfully with JavaScript")
                        return True
                    except Exception as js_error:
                        self.logger.debug(f"Both click methods failed: {click_error}, {js_error}")
                        return False
                        
        except Exception as e:
            self.logger.debug(f"Selector {selector} failed: {str(e)}")
            return False
    
    async def start_visual_automation(self, job_url: str, user_profile: Dict, resume_path: str = None) -> Dict[str, Any]:
        """
        Start visual automation for a job application
        """
        try:
            # Setup browser
            self.setup_browser()
            
            # Step 1: Check if this is a Lever URL and modify it to go directly to application form
            application_url = self.get_direct_application_url(job_url)
            
            self.logger.info(f"Opening job page: {application_url}")
            self.driver.get(application_url)
            
            # Wait for page to load
            await asyncio.sleep(3)
            
            # Step 2: Check if we're on the application form or need to click Apply button
            if self.is_application_form_page():
                self.logger.info("Already on application form page")
                apply_button_found = True
            else:
                self.logger.info("On job detail page, looking for Apply button")
                apply_button_found = await self.find_and_click_apply_button()
                
                if not apply_button_found:
                    return {
                        "success": False,
                        "error": "Could not find 'Apply' button on job page. The application form might be directly accessible.",
                        "status": "apply_button_not_found"
                    }
                
                # Wait for application form to load after clicking Apply
                await asyncio.sleep(3)
            
            # Step 3: Fill the application form
            fill_result = await self.fill_application_form(user_profile, resume_path)
            
            if not fill_result["success"]:
                return fill_result
            
            # Step 4: Return control to user for final review and submit
            return {
                "success": True,
                "status": "ready_for_submit",
                "message": "Form has been filled. Please review and click Submit when ready.",
                "fields_filled": fill_result.get("fields_filled", []),
                "browser_session_active": True
            }
            
        except Exception as e:
            self.logger.error(f"Automation error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "status": "automation_error"
            }
    
    def setup_browser(self):
        """Setup Chrome browser with visible window"""
        try:
            chrome_options = Options()
            
            # Make browser visible and controllable
            chrome_options.add_argument("--start-maximized")
            chrome_options.add_argument("--disable-blink-features=AutomationControlled")
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option('useAutomationExtension', False)
            
            # Add user agent to avoid detection
            chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
            
            # For WSL/headless environments, add these options
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            
            # Try to initialize the driver with auto-download if available
            if WEBDRIVER_MANAGER_AVAILABLE:
                try:
                    # Auto-download ChromeDriver if needed
                    self.logger.info("Attempting to install ChromeDriver automatically...")
                    service = Service(ChromeDriverManager().install())
                    self.driver = webdriver.Chrome(service=service, options=chrome_options)
                    self.logger.info("Browser setup complete with auto-downloaded ChromeDriver")
                    
                except Exception as auto_error:
                    self.logger.warning(f"Auto ChromeDriver failed: {auto_error}")
                    try:
                        # Try Chromium as fallback
                        self.logger.info("Trying Chromium browser...")
                        chrome_options.binary_location = "/usr/bin/chromium-browser"
                        self.driver = webdriver.Chrome(options=chrome_options)
                        self.logger.info("Browser setup complete with Chromium")
                    except Exception as chromium_error:
                        self.logger.warning(f"Chromium failed: {chromium_error}")
                        try:
                            # Try without service specification
                            self.logger.info("Trying ChromeDriver without service...")
                            chrome_options.binary_location = None  # Reset binary location
                            self.driver = webdriver.Chrome(options=chrome_options)
                            self.logger.info("Browser setup complete with system ChromeDriver")
                        except Exception as system_error:
                            self.logger.error(f"All ChromeDriver methods failed: auto={auto_error}, chromium={chromium_error}, system={system_error}")
                            raise Exception(f"All ChromeDriver methods failed")
            else:
                # Use system ChromeDriver
                try:
                    self.driver = webdriver.Chrome(options=chrome_options)
                    self.logger.info("Browser setup complete with system ChromeDriver")
                except Exception as e:
                    self.logger.error(f"System ChromeDriver failed: {e}")
                    raise Exception(f"System ChromeDriver not available: {e}")
            
            # Test if driver is working
            try:
                self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
                self.logger.info("ChromeDriver test successful")
            except Exception as test_error:
                self.logger.error(f"ChromeDriver test failed: {test_error}")
                self.cleanup()
                raise Exception(f"ChromeDriver setup failed test: {test_error}")
                
        except Exception as e:
            self.logger.error(f"Failed to setup browser: {e}")
            self.logger.info("ChromeDriver not available - will use manual fallback mode")
            # Clean up any partial setup
            self.cleanup()
            # Instead of failing, we'll return an error that can be handled gracefully
            raise Exception(f"ChromeDriver setup failed: {str(e)}. Manual application mode will be used.")
    
    async def find_and_click_apply_button(self) -> bool:
        """
        Find and click the Apply button on job detail page
        Handles different ATS platforms (Lever, Greenhouse, etc.)
        """
        # Check if this is a Lever page and use specific Lever patterns first
        current_url = self.driver.current_url
        
        if "jobs.lever.co" in current_url:
            lever_selectors = [
                "button[data-qa='apply-button']",
                "a[data-qa='apply-button']",
                ".apply-button",
                "button:contains('Apply for this job')",
                "a:contains('Apply for this job')",
                ".posting-btn-submit",
                ".apply-button-desktop",
                "[data-qa*='apply']",
                "a[href*='/apply']",
                "button[class*='apply']"
            ]
            
            # Try Lever-specific selectors first
            for selector in lever_selectors:
                if await self.try_click_selector(selector):
                    return True
        
        # General apply button selectors for all ATS platforms
        apply_button_selectors = [
            # Greenhouse patterns  
            "a#apply_button",
            ".application-button",
            "a:contains('Apply for this position')",
            
            # General patterns
            "button:contains('Apply')",
            "a:contains('Apply')",
            "[href*='apply']",
            "button[class*='apply']",
            "a[class*='apply']",
            
            # Workday patterns
            "button:contains('Apply Now')",
            "a:contains('Apply Now')",
        ]
        
        # Try general selectors for non-Lever platforms
        for selector in apply_button_selectors:
            if await self.try_click_selector(selector):
                return True
        
        self.logger.warning("No apply button found with any selector")
        return False
    
    async def fill_application_form(self, user_profile: Dict, resume_path: str = None) -> Dict[str, Any]:
        """
        Fill the application form with user profile data
        """
        filled_fields = []
        
        try:
            # Extract ALL profile data
            personal_info = user_profile.get("personal_information", {})
            basic_info = personal_info.get("basic_information", {})
            contact_info = personal_info.get("contact_information", {})
            address_info = personal_info.get("address", {})
            job_preferences = user_profile.get("job_preferences", {})
            work_experience = user_profile.get("work_experience", [])
            education = user_profile.get("education", [])
            skills = user_profile.get("skills", [])
            languages = user_profile.get("languages", [])
            
            # Basic Information
            first_name = basic_info.get("first_name", "")
            last_name = basic_info.get("last_name", "")
            gender = basic_info.get("gender", "")
            
            # Contact Information
            email = contact_info.get("email", "")
            phone = contact_info.get("telephone", "")
            country_code = contact_info.get("country_code", "")
            
            # Address Information
            address = address_info.get("address", "")
            city = address_info.get("city", "")
            state = address_info.get("state", "")
            zip_code = address_info.get("zip_code", "")
            country = address_info.get("country", "")
            citizenship = address_info.get("citizenship", "")
            
            # Job Preferences / Links
            linkedin_url = job_preferences.get("linkedin_link", "")
            github_url = job_preferences.get("github_link", "")
            portfolio_url = job_preferences.get("portfolio_link", "")
            other_url = job_preferences.get("other_url", "")
            notice_period = job_preferences.get("notice_period", "")
            total_experience = job_preferences.get("total_work_experience", "")
            highest_education = job_preferences.get("highest_education", "")
            willing_to_relocate = job_preferences.get("willing_to_relocate", "")
            driving_license = job_preferences.get("driving_license", "")
            visa_requirement = job_preferences.get("visa_requirement", "")
            race_ethnicity = job_preferences.get("race_ethnicity", "")
            
            # Work Experience (most recent)
            current_job_title = ""
            current_company = ""
            years_of_experience = ""
            if work_experience:
                current_exp = work_experience[0]  # Most recent
                current_job_title = current_exp.get("title", "")
                current_company = current_exp.get("company", "")
                # Calculate years of experience
                if len(work_experience) > 0:
                    years_of_experience = str(len(work_experience))
            
            # Education (highest degree)
            highest_degree = ""
            university = ""
            graduation_year = ""
            gpa = ""
            if education:
                highest_edu = education[0]  # First/highest education
                highest_degree = highest_edu.get("degree", "")
                university = highest_edu.get("school", "")
                if highest_edu.get("end_date"):
                    graduation_year = highest_edu.get("end_date", "").split("-")[0]  # Extract year
                gpa = highest_edu.get("gpa", "")
            
            # Skills (as comma-separated string)
            skills_text = ""
            if skills:
                skill_names = []
                for skill in skills:
                    if isinstance(skill, dict):
                        skill_names.append(skill.get("name", ""))
                    else:
                        skill_names.append(str(skill))
                skills_text = ", ".join(filter(None, skill_names))
            
            # Languages (as comma-separated string)
            languages_text = ", ".join(languages) if languages else ""
            
            # Debug logging
            self.logger.info(f"Form filling starting with data: first_name='{first_name}', last_name='{last_name}', email='{email}', phone='{phone}'")
            self.logger.info(f"Current URL: {self.driver.current_url}")
            
            # Check if we can find any input fields at all
            all_inputs = self.driver.find_elements(By.TAG_NAME, "input")
            self.logger.info(f"Found {len(all_inputs)} input fields on the page")
            
            # Log some input field details for debugging
            for i, input_field in enumerate(all_inputs[:5]):  # First 5 inputs
                try:
                    name = input_field.get_attribute("name") or "no-name"
                    placeholder = input_field.get_attribute("placeholder") or "no-placeholder"
                    input_type = input_field.get_attribute("type") or "text"
                    self.logger.info(f"Input {i+1}: name='{name}', placeholder='{placeholder}', type='{input_type}'")
                except Exception as e:
                    self.logger.debug(f"Error getting input {i+1} attributes: {e}")
            
            # Check if this is a Lever page for specific field mappings
            current_url = self.driver.current_url
            is_lever = "jobs.lever.co" in current_url
            
            # Field mapping patterns for different form types
            if is_lever:
                # Lever-specific field mappings (they use different patterns)
                field_mappings = {
                    "first_name": [
                        "input[name='name']",  # Lever often uses just 'name' for full name
                        "input[data-qa='applicant-name']",
                        "input[placeholder*='Full name']",
                        "input[placeholder*='Name']",
                        "input[name*='first']", "input[id*='first']", "input[placeholder*='First']"
                    ],
                    "last_name": [
                        # Lever usually has one name field, not separate first/last
                        "input[name*='last']", "input[id*='last']", "input[placeholder*='Last']"
                    ],
                    "full_name": [
                        "input[name='name']",  # Most common in Lever
                        "input[data-qa='applicant-name']",
                        "input[placeholder*='Full name']",
                        "input[placeholder*='Name']",
                        "input[name*='name']", "input[id*='name']"
                    ],
                    "email": [
                        "input[name='email']",  # Standard Lever email field
                        "input[data-qa='applicant-email']",
                        "input[type='email']", "input[name*='email']", "input[id*='email']"
                    ],
                    "phone": [
                        "input[name='phone']",  # Standard Lever phone field
                        "input[data-qa='applicant-phone']",
                        "input[type='tel']", "input[name*='phone']", "input[id*='phone']"
                    ]
                }
            else:
                # General field mappings for other ATS platforms
                field_mappings = {
                    "first_name": [
                        "input[name*='first']", "input[id*='first']", "input[placeholder*='First']",
                        "input[name*='firstName']", "input[id*='firstName']"
                    ],
                    "last_name": [
                        "input[name*='last']", "input[id*='last']", "input[placeholder*='Last']",
                        "input[name*='lastName']", "input[id*='lastName']"
                    ],
                    "full_name": [
                        "input[name*='name']", "input[id*='name']", "input[placeholder*='Name']",
                        "input[name*='fullName']", "input[id*='fullName']"
                    ],
                    "email": [
                        "input[type='email']", "input[name*='email']", "input[id*='email']",
                        "input[placeholder*='email']", "input[placeholder*='Email']"
                    ],
                    "phone": [
                        "input[type='tel']", "input[name*='phone']", "input[id*='phone']",
                        "input[placeholder*='phone']", "input[name*='mobile']"
                    ],
                    "linkedin": [
                        "input[name*='linkedin']", "input[id*='linkedin']", "input[placeholder*='linkedin']",
                        "input[name*='LinkedIn']", "input[id*='LinkedIn']", "input[placeholder*='LinkedIn']"
                    ],
                    "github": [
                        "input[name*='github']", "input[id*='github']", "input[placeholder*='github']",
                        "input[name*='GitHub']", "input[id*='GitHub']", "input[placeholder*='GitHub']"
                    ],
                    "portfolio": [
                        "input[name*='portfolio']", "input[id*='portfolio']", "input[placeholder*='portfolio']",
                        "input[name*='website']", "input[id*='website']", "input[placeholder*='website']",
                        "input[name*='site']", "input[id*='site']", "input[placeholder*='site']"
                    ],
                    # Address fields
                    "address": [
                        "input[name*='address']", "input[id*='address']", "input[placeholder*='address']",
                        "textarea[name*='address']", "textarea[id*='address']"
                    ],
                    "city": [
                        "input[name*='city']", "input[id*='city']", "input[placeholder*='city']"
                    ],
                    "state": [
                        "input[name*='state']", "input[id*='state']", "input[placeholder*='state']",
                        "select[name*='state']", "select[id*='state']"
                    ],
                    "zip_code": [
                        "input[name*='zip']", "input[id*='zip']", "input[placeholder*='zip']",
                        "input[name*='postal']", "input[id*='postal']", "input[placeholder*='postal']"
                    ],
                    "country": [
                        "input[name*='country']", "input[id*='country']", "input[placeholder*='country']",
                        "select[name*='country']", "select[id*='country']"
                    ],
                    # Work experience fields
                    "current_title": [
                        "input[name*='title']", "input[id*='title']", "input[placeholder*='title']",
                        "input[name*='position']", "input[id*='position']", "input[placeholder*='position']",
                        "input[name*='job']", "input[id*='job']", "input[placeholder*='job']"
                    ],
                    "current_company": [
                        "input[name*='company']", "input[id*='company']", "input[placeholder*='company']",
                        "input[name*='employer']", "input[id*='employer']", "input[placeholder*='employer']"
                    ],
                    "experience_years": [
                        "input[name*='experience']", "input[id*='experience']", "input[placeholder*='experience']",
                        "input[name*='years']", "input[id*='years']", "input[placeholder*='years']",
                        "select[name*='experience']", "select[id*='experience']"
                    ],
                    # Education fields
                    "degree": [
                        "input[name*='degree']", "input[id*='degree']", "input[placeholder*='degree']",
                        "input[name*='education']", "input[id*='education']", "input[placeholder*='education']",
                        "select[name*='degree']", "select[id*='degree']"
                    ],
                    "university": [
                        "input[name*='school']", "input[id*='school']", "input[placeholder*='school']",
                        "input[name*='university']", "input[id*='university']", "input[placeholder*='university']",
                        "input[name*='college']", "input[id*='college']", "input[placeholder*='college']"
                    ],
                    "graduation_year": [
                        "input[name*='graduation']", "input[id*='graduation']", "input[placeholder*='graduation']",
                        "input[name*='year']", "input[id*='year']", "input[placeholder*='year']",
                        "select[name*='year']", "select[id*='year']"
                    ],
                    "gpa": [
                        "input[name*='gpa']", "input[id*='gpa']", "input[placeholder*='gpa']",
                        "input[name*='grade']", "input[id*='grade']", "input[placeholder*='grade']"
                    ],
                    # Additional fields
                    "skills": [
                        "input[name*='skill']", "input[id*='skill']", "input[placeholder*='skill']",
                        "textarea[name*='skill']", "textarea[id*='skill']"
                    ],
                    "languages": [
                        "input[name*='language']", "input[id*='language']", "input[placeholder*='language']",
                        "textarea[name*='language']", "textarea[id*='language']"
                    ],
                    "notice_period": [
                        "input[name*='notice']", "input[id*='notice']", "input[placeholder*='notice']",
                        "select[name*='notice']", "select[id*='notice']"
                    ],
                    "visa_status": [
                        "input[name*='visa']", "input[id*='visa']", "input[placeholder*='visa']",
                        "select[name*='visa']", "select[id*='visa']",
                        "input[name*='authorization']", "input[id*='authorization']"
                    ],
                    "gender": [
                        "input[name*='gender']", "input[id*='gender']", "input[placeholder*='gender']",
                        "select[name*='gender']", "select[id*='gender']"
                    ],
                    "ethnicity": [
                        "input[name*='ethnicity']", "input[id*='ethnicity']", "input[placeholder*='ethnicity']",
                        "select[name*='ethnicity']", "select[id*='ethnicity']",
                        "input[name*='race']", "input[id*='race']", "select[name*='race']"
                    ]
                }
            
            # Fill basic fields - only add to filled_fields if actually filled
            if is_lever:
                # Lever typically uses a single name field, so try full name first
                if first_name and last_name:
                    full_name = f"{first_name} {last_name}".strip()
                    if await self.fill_field_with_patterns(field_mappings["full_name"], full_name, "Full Name"):
                        filled_fields.append("Full Name")
                    else:
                        # Fallback to separate fields if full name didn't work
                        if await self.fill_field_with_patterns(field_mappings["first_name"], first_name, "First Name"):
                            filled_fields.append("First Name")
                        if await self.fill_field_with_patterns(field_mappings["last_name"], last_name, "Last Name"):
                            filled_fields.append("Last Name")
            else:
                # Other ATS platforms typically use separate first/last name fields
                if await self.fill_field_with_patterns(field_mappings["first_name"], first_name, "First Name"):
                    filled_fields.append("First Name")
                
                if await self.fill_field_with_patterns(field_mappings["last_name"], last_name, "Last Name"):
                    filled_fields.append("Last Name")
                
                # Try full name if first/last didn't work
                if not filled_fields and first_name and last_name:
                    full_name = f"{first_name} {last_name}".strip()
                    if await self.fill_field_with_patterns(field_mappings["full_name"], full_name, "Full Name"):
                        filled_fields.append("Full Name")
            
            if await self.fill_field_with_patterns(field_mappings["email"], email, "Email"):
                filled_fields.append("Email")
            
            if await self.fill_field_with_patterns(field_mappings["phone"], phone, "Phone"):
                filled_fields.append("Phone")
            
            # Extract additional profile information
            job_preferences = user_profile.get("job_preferences", {})
            linkedin_url = job_preferences.get("linkedin_link", "")
            github_url = job_preferences.get("github_link", "")
            portfolio_url = job_preferences.get("portfolio_link", "")
            
            # Fill additional profile fields from job preferences (URLs)
            if linkedin_url and await self.fill_field_with_patterns(field_mappings.get("linkedin", []), linkedin_url, "LinkedIn"):
                filled_fields.append("LinkedIn")
            
            if github_url and await self.fill_field_with_patterns(field_mappings.get("github", []), github_url, "GitHub"):
                filled_fields.append("GitHub")
            
            if portfolio_url and await self.fill_field_with_patterns(field_mappings.get("portfolio", []), portfolio_url, "Portfolio"):
                filled_fields.append("Portfolio")
            
            # Fill address information
            if address and await self.fill_field_with_patterns(field_mappings.get("address", []), address, "Address"):
                filled_fields.append("Address")
            
            if city and await self.fill_field_with_patterns(field_mappings.get("city", []), city, "City"):
                filled_fields.append("City")
            
            if state and await self.fill_field_with_patterns(field_mappings.get("state", []), state, "State"):
                filled_fields.append("State")
            
            if zip_code and await self.fill_field_with_patterns(field_mappings.get("zip_code", []), zip_code, "Zip Code"):
                filled_fields.append("Zip Code")
            
            if country and await self.fill_field_with_patterns(field_mappings.get("country", []), country, "Country"):
                filled_fields.append("Country")
            
            # Fill work experience information
            if current_job_title and await self.fill_field_with_patterns(field_mappings.get("current_title", []), current_job_title, "Current Job Title"):
                filled_fields.append("Current Job Title")
            
            if current_company and await self.fill_field_with_patterns(field_mappings.get("current_company", []), current_company, "Current Company"):
                filled_fields.append("Current Company")
            
            if years_of_experience and await self.fill_field_with_patterns(field_mappings.get("experience_years", []), years_of_experience, "Years of Experience"):
                filled_fields.append("Years of Experience")
            
            # Fill education information
            if highest_degree and await self.fill_field_with_patterns(field_mappings.get("degree", []), highest_degree, "Degree"):
                filled_fields.append("Degree")
            
            if university and await self.fill_field_with_patterns(field_mappings.get("university", []), university, "University"):
                filled_fields.append("University")
            
            if graduation_year and await self.fill_field_with_patterns(field_mappings.get("graduation_year", []), graduation_year, "Graduation Year"):
                filled_fields.append("Graduation Year")
            
            if gpa and await self.fill_field_with_patterns(field_mappings.get("gpa", []), gpa, "GPA"):
                filled_fields.append("GPA")
            
            # Fill skills and languages
            if skills_text and await self.fill_field_with_patterns(field_mappings.get("skills", []), skills_text, "Skills"):
                filled_fields.append("Skills")
            
            if languages_text and await self.fill_field_with_patterns(field_mappings.get("languages", []), languages_text, "Languages"):
                filled_fields.append("Languages")
            
            # Fill job preferences
            if notice_period and await self.fill_field_with_patterns(field_mappings.get("notice_period", []), notice_period, "Notice Period"):
                filled_fields.append("Notice Period")
            
            if visa_requirement and await self.fill_field_with_patterns(field_mappings.get("visa_status", []), visa_requirement, "Visa Status"):
                filled_fields.append("Visa Status")
            
            if gender and await self.fill_field_with_patterns(field_mappings.get("gender", []), gender, "Gender"):
                filled_fields.append("Gender")
            
            if race_ethnicity and await self.fill_field_with_patterns(field_mappings.get("ethnicity", []), race_ethnicity, "Ethnicity"):
                filled_fields.append("Ethnicity")
            
            # Handle resume upload if file provided
            if resume_path and os.path.exists(resume_path):
                uploaded = await self.upload_resume(resume_path)
                if uploaded:
                    filled_fields.append("Resume")
            
            self.logger.info(f"Form filling complete. Fields filled: {filled_fields}")
            
            return {
                "success": True,
                "fields_filled": filled_fields,
                "message": f"Successfully filled {len(filled_fields)} fields"
            }
            
        except Exception as e:
            self.logger.error(f"Error filling form: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "fields_filled": filled_fields
            }
    
    async def fill_field_with_patterns(self, selectors: List[str], value: str, field_name: str):
        """
        Try multiple selectors to find and fill a field
        """
        if not value:
            self.logger.info(f"Skipping {field_name} - no value provided")
            return False
        
        self.logger.info(f"Trying to fill {field_name} with value: '{value}'")
        
        for i, selector in enumerate(selectors):
            try:
                self.logger.debug(f"Trying selector {i+1}/{len(selectors)} for {field_name}: {selector}")
                elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                
                if elements:
                    element = elements[0]
                    self.logger.info(f"Found element for {field_name} using selector: {selector}")
                    
                    # Scroll to element
                    self.driver.execute_script("arguments[0].scrollIntoView(true);", element)
                    await asyncio.sleep(0.5)
                    
                    # Clear and fill
                    element.clear()
                    element.send_keys(value)
                    
                    # Verify the field was filled
                    filled_value = element.get_attribute("value")
                    self.logger.info(f"Successfully filled {field_name} with value: '{value}' (field now contains: '{filled_value}')")
                    await asyncio.sleep(0.5)  # Small delay for visual effect
                    return True
                else:
                    self.logger.debug(f"No elements found for selector: {selector}")
                    
            except Exception as e:
                self.logger.debug(f"Selector {selector} failed for {field_name}: {str(e)}")
                continue
        
        self.logger.warning(f"Could not find field for {field_name} - tried {len(selectors)} selectors")
        return False
    
    async def upload_resume(self, resume_path: str) -> bool:
        """
        Upload resume file to application form
        """
        resume_selectors = [
            "input[type='file']",
            "input[name*='resume']",
            "input[id*='resume']",
            "input[name*='cv']",
            "input[id*='cv']",
            "input[accept*='pdf']"
        ]
        
        for selector in resume_selectors:
            try:
                elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                if elements:
                    element = elements[0]
                    
                    # Upload file
                    element.send_keys(resume_path)
                    self.logger.info(f"Resume uploaded: {resume_path}")
                    await asyncio.sleep(2)  # Wait for upload
                    return True
                    
            except Exception as e:
                self.logger.debug(f"Resume upload selector {selector} failed: {str(e)}")
                continue
        
        self.logger.warning("Could not find resume upload field")
        return False
    
    async def wait_for_user_submit(self) -> Dict[str, Any]:
        """
        Wait for user to manually submit the form
        Monitor for navigation or form submission
        """
        try:
            current_url = self.driver.current_url
            
            # Show message to user
            self.logger.info("Waiting for user to submit the form...")
            
            # Wait for URL change or success indicators
            start_time = time.time()
            timeout = 300  # 5 minutes max wait
            
            while time.time() - start_time < timeout:
                await asyncio.sleep(2)
                
                new_url = self.driver.current_url
                
                # Check if URL changed (likely submitted)
                if new_url != current_url:
                    self.logger.info(f"URL changed from {current_url} to {new_url}")
                    
                    # Check for success indicators
                    success_indicators = [
                        "thank you", "success", "submitted", "received", 
                        "confirmation", "applied", "application complete"
                    ]
                    
                    page_text = self.driver.page_source.lower()
                    if any(indicator in page_text for indicator in success_indicators):
                        return {
                            "success": True,
                            "status": "submitted",
                            "message": "Application appears to have been submitted successfully"
                        }
                
                # Check if browser was closed
                try:
                    self.driver.current_url  # This will fail if browser is closed
                except:
                    return {
                        "success": False,
                        "status": "browser_closed",
                        "message": "Browser was closed before submission confirmation"
                    }
            
            return {
                "success": False,
                "status": "timeout",
                "message": "Timeout waiting for form submission"
            }
            
        except Exception as e:
            return {
                "success": False,
                "status": "error",
                "error": str(e)
            }
    
    def cleanup(self):
        """Clean up browser session"""
        if self.driver:
            try:
                self.driver.quit()
                self.logger.info("Browser session cleaned up")
            except:
                pass
            finally:
                self.driver = None

# Global instance
visual_automator = VisualJobApplicationAutomator()