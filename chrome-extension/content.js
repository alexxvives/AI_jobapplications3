// AI Job Application Assistant - Content Script
// Injected into job application pages to detect and fill forms

class JobApplicationAssistant {
    constructor() {
        this.isActive = false;
        this.userProfile = null;
        this.detectedFields = [];
        this.floatingUI = null;
        this.progressBar = null;
        this.filledCount = 0;
        this.totalFields = 0;
        
        // Initialize on page load
        this.init();
    }

    async init() {
        console.log('🚀 AI Job Application Assistant initialized');
        
        // Load user profile from storage
        await this.loadUserProfile();
        
        // Detect if this is a job application page
        if (this.isJobApplicationPage()) {
            this.createFloatingUI();
            this.detectFormFields();
        }
    }

    async loadUserProfile() {
        try {
            const result = await chrome.storage.local.get(['userProfile']);
            this.userProfile = result.userProfile;
            console.log('📋 User profile loaded:', this.userProfile ? 'Yes' : 'No');
        } catch (error) {
            console.error('❌ Error loading user profile:', error);
        }
    }

    isJobApplicationPage() {
        const url = window.location.href;
        const title = document.title.toLowerCase();
        const bodyText = document.body.textContent.toLowerCase();
        
        // Check URL patterns
        const jobSitePatterns = [
            'jobs.lever.co',
            'boards.greenhouse.io',
            'workday.com',
            'bamboohr.com',
            'smartrecruiters.com',
            'icims.com',
            'taleo.net',
            'jobvite.com',
            'breezy.hr',
            'applytojob.com',
            'apply.workable.com',
            'recruiting.adp.com',
            'myworkdayjobs.com'
        ];
        
        const hasJobSiteURL = jobSitePatterns.some(pattern => url.includes(pattern));
        
        // Check for application-related keywords
        const applicationKeywords = [
            'apply', 'application', 'job application', 'submit application',
            'career opportunity', 'position', 'role', 'employment'
        ];
        
        const hasApplicationKeywords = applicationKeywords.some(keyword => 
            title.includes(keyword) || bodyText.includes(keyword)
        );
        
        // Check for form elements
        const hasFormElements = document.querySelectorAll('input, textarea, select').length > 3;
        
        return hasJobSiteURL || (hasApplicationKeywords && hasFormElements);
    }

    createFloatingUI() {
        // Create floating assistant UI
        this.floatingUI = document.createElement('div');
        this.floatingUI.id = 'job-assistant-ui';
        this.floatingUI.innerHTML = `
            <div class="assistant-header">
                <div class="assistant-logo">🤖</div>
                <div class="assistant-title">AI Job Assistant</div>
                <div class="assistant-close" id="assistant-close">×</div>
            </div>
            <div class="assistant-content">
                <div class="assistant-status" id="assistant-status">
                    ${this.userProfile ? 'Profile loaded ✅' : 'No profile found ❌'}
                </div>
                <div class="assistant-actions">
                    <button id="fill-form-btn" ${!this.userProfile ? 'disabled' : ''}>
                        Fill Application Form
                    </button>
                    <button id="setup-profile-btn">
                        ${this.userProfile ? 'Update Profile' : 'Setup Profile'}
                    </button>
                </div>
                <div class="assistant-progress" id="assistant-progress" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill"></div>
                    </div>
                    <div class="progress-text" id="progress-text">Filling forms...</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.floatingUI);
        
        // Add event listeners
        document.getElementById('assistant-close').addEventListener('click', () => {
            this.floatingUI.style.display = 'none';
        });
        
        document.getElementById('fill-form-btn').addEventListener('click', () => {
            this.fillFormFields();
        });
        
        document.getElementById('setup-profile-btn').addEventListener('click', () => {
            this.openProfileSetup();
        });
        
        // Make draggable
        this.makeDraggable();
    }

    makeDraggable() {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        const header = this.floatingUI.querySelector('.assistant-header');
        
        header.addEventListener('mousedown', (e) => {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            
            if (e.target === header || header.contains(e.target)) {
                isDragging = true;
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                
                xOffset = currentX;
                yOffset = currentY;
                
                this.floatingUI.style.transform = `translate(${currentX}px, ${currentY}px)`;
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    detectFormFields() {
        this.detectedFields = [];
        
        // Find all input fields
        const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea, select');
        
        inputs.forEach((element, index) => {
            const field = this.analyzeFormField(element, index);
            if (field) {
                this.detectedFields.push(field);
            }
        });
        
        this.totalFields = this.detectedFields.length;
        console.log(`🔍 Detected ${this.totalFields} form fields`);
        
        // Update UI with detected fields count
        if (this.floatingUI) {
            const statusEl = document.getElementById('assistant-status');
            const profileStatus = this.userProfile ? 'Profile loaded ✅' : 'No profile found ❌';
            statusEl.innerHTML = `${profileStatus}<br>Found ${this.totalFields} form fields`;
        }
    }

    analyzeFormField(element, index) {
        try {
            const tagName = element.tagName.toLowerCase();
            const type = element.type || '';
            const name = element.name || '';
            const id = element.id || '';
            const placeholder = element.placeholder || '';
            const value = element.value || '';
            
            // Get label text
            let labelText = '';
            const labels = document.querySelectorAll(`label[for="${id}"]`);
            if (labels.length > 0) {
                labelText = labels[0].textContent.trim();
            } else {
                // Look for nearby label
                const parent = element.parentElement;
                const label = parent ? parent.querySelector('label') : null;
                if (label) {
                    labelText = label.textContent.trim();
                }
            }
            
            // Get nearby text for context
            let nearbyText = '';
            const parent = element.parentElement;
            if (parent) {
                nearbyText = parent.textContent.trim().substring(0, 100);
            }
            
            // Check if required
            const required = element.hasAttribute('required') || 
                           element.getAttribute('aria-required') === 'true' ||
                           labelText.includes('*');
            
            // Get options for select elements
            let options = [];
            if (tagName === 'select') {
                options = Array.from(element.options).map(opt => opt.text);
            }
            
            return {
                element: element,
                uniqueId: `field_${index}`,
                tagName: tagName,
                type: type,
                name: name,
                id: id,
                placeholder: placeholder,
                labelText: labelText,
                nearbyText: nearbyText,
                required: required,
                options: options,
                value: value,
                descriptor: this.createFieldDescriptor(labelText, placeholder, name, id, nearbyText, type)
            };
        } catch (error) {
            console.error('Error analyzing field:', error);
            return null;
        }
    }

    createFieldDescriptor(labelText, placeholder, name, id, nearbyText, type) {
        const parts = [];
        
        if (labelText) parts.push(labelText.toLowerCase());
        if (placeholder) parts.push(placeholder.toLowerCase());
        if (name) parts.push(name.toLowerCase().replace(/[_-]/g, ' '));
        if (id) parts.push(id.toLowerCase().replace(/[_-]/g, ' '));
        if (nearbyText) parts.push(nearbyText.toLowerCase());
        if (type) parts.push(`input type ${type}`);
        
        return parts.join(' ');
    }

    async fillFormFields() {
        if (!this.userProfile) {
            alert('Please setup your profile first!');
            return;
        }
        
        this.showProgress();
        this.filledCount = 0;
        
        // Define field mappings based on semantic similarity
        const fieldMappings = this.createFieldMappings();
        
        for (const field of this.detectedFields) {
            const mapping = this.findBestMapping(field, fieldMappings);
            if (mapping) {
                await this.fillField(field, mapping);
                this.updateProgress();
                
                // Small delay for UX
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        this.hideProgress();
        this.showCompletionMessage();
    }

    createFieldMappings() {
        if (!this.userProfile) return {};
        
        const personal = this.userProfile.personal_information || {};
        const workExp = this.userProfile.work_experience || [];
        const education = this.userProfile.education || [];
        const jobPrefs = this.userProfile.job_preferences || {};
        
        // Extract current work info
        const currentJob = workExp.length > 0 ? workExp[0] : {};
        const currentEducation = education.length > 0 ? education[0] : {};
        
        return {
            // Personal Information
            'full_name': personal.full_name || `${personal.first_name || ''} ${personal.last_name || ''}`.trim(),
            'first_name': personal.first_name || '',
            'last_name': personal.last_name || '',
            'email': personal.email || '',
            'phone': personal.phone || '',
            'address': personal.address || '',
            'city': personal.city || '',
            'state': personal.state || '',
            'zip_code': personal.zip_code || '',
            'country': personal.country || '',
            
            // Work Information
            'current_company': currentJob.company || '',
            'current_title': currentJob.title || '',
            'current_position': currentJob.title || '',
            'job_title': currentJob.title || '',
            'company': currentJob.company || '',
            'employer': currentJob.company || '',
            
            // Education
            'degree': currentEducation.degree || '',
            'school': currentEducation.school || '',
            'university': currentEducation.school || '',
            'education': `${currentEducation.degree || ''} from ${currentEducation.school || ''}`.trim(),
            
            // Social/Professional
            'linkedin': jobPrefs.linkedin || '',
            'github': jobPrefs.github || '',
            'portfolio': jobPrefs.portfolio || '',
            'website': jobPrefs.portfolio || jobPrefs.other_url || '',
            
            // Other
            'experience_years': jobPrefs.total_experience || '',
            'notice_period': jobPrefs.notice_period || '',
            'willing_to_relocate': jobPrefs.willing_to_relocate || '',
            'visa_status': jobPrefs.visa_requirement || '',
            'driving_license': jobPrefs.driving_license || ''
        };
    }

    findBestMapping(field, mappings) {
        const descriptor = field.descriptor.toLowerCase();
        let bestMatch = null;
        let bestScore = 0;
        
        // Define semantic patterns for each mapping type
        const patterns = {
            'full_name': ['full name', 'complete name', 'legal name', 'applicant name'],
            'first_name': ['first name', 'given name', 'forename', 'fname'],
            'last_name': ['last name', 'surname', 'family name', 'lastname', 'lname'],
            'email': ['email', 'e-mail', 'email address', 'electronic mail'],
            'phone': ['phone', 'telephone', 'mobile', 'cell', 'phone number', 'contact number'],
            'address': ['address', 'street', 'home address', 'mailing address'],
            'city': ['city', 'town', 'municipality'],
            'state': ['state', 'province', 'region', 'territory'],
            'zip_code': ['zip', 'postal', 'postcode', 'zip code', 'postal code'],
            'country': ['country', 'nation', 'nationality'],
            'current_company': ['company', 'employer', 'organization', 'current company', 'current employer'],
            'current_title': ['title', 'position', 'role', 'job title', 'current position', 'current title'],
            'linkedin': ['linkedin', 'professional profile'],
            'github': ['github', 'code repository'],
            'portfolio': ['portfolio', 'website', 'personal website'],
            'degree': ['degree', 'education', 'qualification'],
            'school': ['school', 'university', 'college', 'institution'],
            'experience_years': ['experience', 'years of experience', 'work experience']
        };
        
        for (const [key, patternList] of Object.entries(patterns)) {
            if (!mappings[key]) continue;
            
            const score = patternList.reduce((maxScore, pattern) => {
                if (descriptor.includes(pattern)) {
                    // Exact match gets highest score
                    const exactMatch = descriptor.includes(pattern);
                    const score = exactMatch ? pattern.length : pattern.length * 0.7;
                    return Math.max(maxScore, score);
                }
                return maxScore;
            }, 0);
            
            if (score > bestScore) {
                bestScore = score;
                bestMatch = { key, value: mappings[key] };
            }
        }
        
        return bestMatch;
    }

    async fillField(field, mapping) {
        try {
            const element = field.element;
            const value = mapping.value;
            
            if (!value || !element) return;
            
            // Skip if already filled (unless empty or placeholder)
            if (element.value && element.value !== element.placeholder) {
                return;
            }
            
            // Handle different input types
            if (field.tagName === 'select') {
                this.fillSelectField(element, value);
            } else if (field.type === 'checkbox') {
                this.fillCheckboxField(element, value);
            } else if (field.type === 'radio') {
                this.fillRadioField(element, value);
            } else if (field.type === 'file') {
                // Skip file uploads for now
                return;
            } else {
                // Text inputs, textareas, etc.
                this.fillTextField(element, value);
            }
            
            this.filledCount++;
            
            // Trigger change events
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new Event('blur', { bubbles: true }));
            
        } catch (error) {
            console.error('Error filling field:', error);
        }
    }

    fillTextField(element, value) {
        // Use multiple methods to ensure compatibility
        element.value = value;
        element.setAttribute('value', value);
        
        // For React/modern frameworks
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, 'value'
        ).set;
        nativeInputValueSetter.call(element, value);
    }

    fillSelectField(element, value) {
        // Try to find matching option
        const options = Array.from(element.options);
        
        // Exact match first
        let option = options.find(opt => 
            opt.text.toLowerCase() === value.toLowerCase() ||
            opt.value.toLowerCase() === value.toLowerCase()
        );
        
        // Partial match if no exact match
        if (!option) {
            option = options.find(opt => 
                opt.text.toLowerCase().includes(value.toLowerCase()) ||
                value.toLowerCase().includes(opt.text.toLowerCase())
            );
        }
        
        if (option) {
            element.value = option.value;
            element.selectedIndex = option.index;
        }
    }

    fillCheckboxField(element, value) {
        // Convert value to boolean
        const shouldCheck = value && 
            (value.toLowerCase() === 'yes' || 
             value.toLowerCase() === 'true' || 
             value === '1');
        
        element.checked = shouldCheck;
    }

    fillRadioField(element, value) {
        // Find radio group and select appropriate option
        const radioGroup = document.querySelectorAll(`input[name="${element.name}"]`);
        
        for (const radio of radioGroup) {
            const label = document.querySelector(`label[for="${radio.id}"]`);
            const labelText = label ? label.textContent.toLowerCase() : '';
            
            if (labelText.includes(value.toLowerCase()) || 
                radio.value.toLowerCase() === value.toLowerCase()) {
                radio.checked = true;
                break;
            }
        }
    }

    showProgress() {
        const progressEl = document.getElementById('assistant-progress');
        if (progressEl) {
            progressEl.style.display = 'block';
        }
    }

    updateProgress() {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        if (progressFill && progressText) {
            const percentage = (this.filledCount / this.totalFields) * 100;
            progressFill.style.width = `${percentage}%`;
            progressText.textContent = `Filled ${this.filledCount} of ${this.totalFields} fields`;
        }
    }

    hideProgress() {
        const progressEl = document.getElementById('assistant-progress');
        if (progressEl) {
            progressEl.style.display = 'none';
        }
    }

    showCompletionMessage() {
        const statusEl = document.getElementById('assistant-status');
        if (statusEl) {
            statusEl.innerHTML = `✅ Filled ${this.filledCount} fields successfully!<br>Please review and submit.`;
        }
        
        // Show notification
        this.showNotification(`Successfully filled ${this.filledCount} form fields!`);
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'assistant-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    openProfileSetup() {
        // Open popup to configure profile
        chrome.runtime.sendMessage({ action: 'openPopup' });
    }
}

// Initialize the assistant when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new JobApplicationAssistant();
    });
} else {
    new JobApplicationAssistant();
}