// Smart Form Filling Intelligence Module
// Handles automatic form detection, field mapping, and filling

class SmartFormFiller {
    constructor() {
        this.currentProfile = null;
        this.detectedFields = [];
        this.filledFields = 0;
        this.totalFields = 0;
        this.automationSession = null;
        this.progressCallback = null;
        
        console.log('🧠 Smart Form Filler initialized');
    }

    async init(profile, sessionId = null, progressCallback = null) {
        this.currentProfile = profile;
        this.automationSession = sessionId;
        this.progressCallback = progressCallback;
        
        // Detect and analyze form fields
        await this.detectFormFields();
        
        console.log(`📝 Detected ${this.totalFields} form fields`);
        return this.detectedFields;
    }

    async detectFormFields() {
        const formElements = document.querySelectorAll('input, textarea, select');
        this.detectedFields = [];
        this.totalFields = 0;

        for (const element of formElements) {
            const fieldInfo = this.analyzeField(element);
            if (fieldInfo.fillable) {
                this.detectedFields.push(fieldInfo);
                this.totalFields++;
            }
        }

        // Sort fields by importance/confidence
        this.detectedFields.sort((a, b) => b.confidence - a.confidence);
        
        return this.detectedFields;
    }

    analyzeField(element) {
        const fieldInfo = {
            element: element,
            id: element.id || '',
            name: element.name || '',
            type: element.type || element.tagName.toLowerCase(),
            label: this.extractFieldLabel(element),
            placeholder: element.placeholder || '',
            required: element.required || false,
            value: element.value || '',
            confidence: 0,
            mappedField: null,
            fillable: false,
            visible: this.isFieldVisible(element)
        };

        // Skip if not visible or disabled
        if (!fieldInfo.visible || element.disabled || element.readOnly) {
            return fieldInfo;
        }

        // Skip hidden and system fields
        if (element.type === 'hidden' || element.type === 'submit' || element.type === 'button') {
            return fieldInfo;
        }

        // Map field to profile data
        const mapping = this.mapFieldToProfile(fieldInfo);
        if (mapping) {
            fieldInfo.mappedField = mapping.field;
            fieldInfo.mappedValue = mapping.value;
            fieldInfo.confidence = mapping.confidence;
            fieldInfo.fillable = true;
        }

        return fieldInfo;
    }

    extractFieldLabel(element) {
        // Try multiple methods to extract field label
        let label = '';

        // Method 1: Associated label element
        if (element.id) {
            const labelElement = document.querySelector(`label[for="${element.id}"]`);
            if (labelElement) {
                label = labelElement.textContent.trim();
            }
        }

        // Method 2: Parent label
        if (!label) {
            const parentLabel = element.closest('label');
            if (parentLabel) {
                label = parentLabel.textContent.replace(element.textContent || '', '').trim();
            }
        }

        // Method 3: Previous sibling text
        if (!label) {
            let sibling = element.previousElementSibling;
            while (sibling && !label) {
                if (sibling.tagName === 'LABEL' || sibling.textContent.trim()) {
                    label = sibling.textContent.trim();
                    break;
                }
                sibling = sibling.previousElementSibling;
            }
        }

        // Method 4: Parent container text
        if (!label) {
            const parent = element.parentElement;
            if (parent) {
                const parentText = parent.textContent.replace(element.textContent || '', '').trim();
                if (parentText && parentText.length < 100) {
                    label = parentText;
                }
            }
        }

        // Method 5: aria-label or data attributes
        if (!label) {
            label = element.getAttribute('aria-label') || 
                   element.getAttribute('data-label') || 
                   element.getAttribute('title') || '';
        }

        return label;
    }

    isFieldVisible(element) {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0' &&
               rect.width > 0 && 
               rect.height > 0;
    }

    mapFieldToProfile(fieldInfo) {
        if (!this.currentProfile || !this.currentProfile.personal_information) {
            return null;
        }

        const personalInfo = this.currentProfile.personal_information;
        const jobPrefs = this.currentProfile.job_preferences || {};
        
        // Create searchable text from all field identifiers
        const searchText = [
            fieldInfo.label,
            fieldInfo.name,
            fieldInfo.id,
            fieldInfo.placeholder
        ].join(' ').toLowerCase();

        // Field mapping rules with confidence scores
        const mappingRules = [
            // Contact Information
            {
                patterns: ['first name', 'fname', 'firstname', 'given name'],
                field: 'first_name',
                value: personalInfo.basic_information?.first_name || personalInfo.contact_information?.first_name || '',
                confidence: 0.9
            },
            {
                patterns: ['last name', 'lname', 'lastname', 'surname', 'family name'],
                field: 'last_name',
                value: personalInfo.basic_information?.last_name || personalInfo.contact_information?.last_name || '',
                confidence: 0.9
            },
            {
                patterns: ['full name', 'name', 'applicant name', 'your name'],
                field: 'full_name',
                value: `${personalInfo.basic_information?.first_name || ''} ${personalInfo.basic_information?.last_name || ''}`.trim(),
                confidence: 0.8
            },
            {
                patterns: ['email', 'e-mail', 'email address', 'e-mail address'],
                field: 'email',
                value: personalInfo.contact_information?.email || '',
                confidence: 0.95
            },
            {
                patterns: ['phone', 'telephone', 'mobile', 'cell', 'phone number', 'tel'],
                field: 'phone',
                value: personalInfo.contact_information?.telephone || '',
                confidence: 0.9
            },
            
            // Address Information
            {
                patterns: ['address', 'street', 'address line', 'home address'],
                field: 'address',
                value: personalInfo.address?.address || '',
                confidence: 0.85
            },
            {
                patterns: ['city', 'town'],
                field: 'city',
                value: personalInfo.address?.city || '',
                confidence: 0.85
            },
            {
                patterns: ['state', 'province', 'region'],
                field: 'state',
                value: personalInfo.address?.state || '',
                confidence: 0.85
            },
            {
                patterns: ['zip', 'postal', 'postcode', 'zip code', 'postal code'],
                field: 'zip_code',
                value: personalInfo.address?.zip_code || '',
                confidence: 0.85
            },
            {
                patterns: ['country'],
                field: 'country',
                value: personalInfo.address?.country || '',
                confidence: 0.85
            },

            // Professional Information
            {
                patterns: ['linkedin', 'linkedin profile', 'linkedin url'],
                field: 'linkedin',
                value: jobPrefs.linkedin_link || '',
                confidence: 0.9
            },
            {
                patterns: ['github', 'github profile', 'github url'],
                field: 'github',
                value: jobPrefs.github_link || '',
                confidence: 0.9
            },
            {
                patterns: ['portfolio', 'website', 'personal website', 'portfolio url'],
                field: 'portfolio',
                value: jobPrefs.portfolio_link || '',
                confidence: 0.8
            },
            {
                patterns: ['cover letter', 'coverletter', 'letter'],
                field: 'cover_letter',
                value: '', // This would be generated dynamically
                confidence: 0.7
            },

            // Job Preferences
            {
                patterns: ['experience', 'years experience', 'work experience', 'total experience'],
                field: 'experience',
                value: jobPrefs.total_work_experience || '',
                confidence: 0.8
            },
            {
                patterns: ['salary', 'expected salary', 'salary expectation', 'compensation'],
                field: 'expected_salary',
                value: jobPrefs.expected_salary || '',
                confidence: 0.8
            },
            {
                patterns: ['notice period', 'availability', 'start date'],
                field: 'notice_period',
                value: jobPrefs.notice_period || '',
                confidence: 0.8
            },
            {
                patterns: ['visa', 'work authorization', 'visa status', 'work permit'],
                field: 'visa_requirement',
                value: jobPrefs.visa_requirement || '',
                confidence: 0.8
            },
            {
                patterns: ['relocate', 'relocation', 'willing to relocate'],
                field: 'willing_to_relocate',
                value: jobPrefs.willing_to_relocate || '',
                confidence: 0.8
            },
            // Resume/File Upload - TEST_ID: RESUME_MODERN_v16
            {
                patterns: ['resume', 'cv', 'curriculum vitae', 'attach resume', 'upload resume', 'resume file'],
                field: 'resume',
                value: 'RESUME_FILE', // Special value to trigger file upload
                confidence: 0.95
            }
        ];

        // Find best matching rule
        let bestMatch = null;
        let highestConfidence = 0;

        for (const rule of mappingRules) {
            for (const pattern of rule.patterns) {
                if (searchText.includes(pattern)) {
                    if (rule.confidence > highestConfidence && rule.value) {
                        highestConfidence = rule.confidence;
                        bestMatch = rule;
                    }
                    break;
                }
            }
        }

        return bestMatch;
    }

    async fillForm() {
        if (!this.currentProfile) {
            throw new Error('No profile available for form filling');
        }

        console.log(`🚀 Starting form filling for ${this.totalFields} fields`);
        this.filledFields = 0;

        const fillResults = {
            total: this.totalFields,
            filled: 0,
            skipped: 0,
            errors: [],
            fields: []
        };

        // Sort fields by position (top to bottom) - TEST_ID: SEQUENTIAL_FILL_v16
        const sortedFields = this.detectedFields.slice().sort((a, b) => {
            const rectA = a.element.getBoundingClientRect();
            const rectB = b.element.getBoundingClientRect();
            
            // If fields are on roughly the same row (within 10px), sort left to right
            if (Math.abs(rectA.top - rectB.top) < 10) {
                return rectA.left - rectB.left;
            }
            return rectA.top - rectB.top; // Top to bottom
        });
        
        console.log(`🔄 TEST_ID: SEQUENTIAL_FILL_v16 - Processing ${sortedFields.length} fields sequentially`);

        for (const fieldInfo of sortedFields) {
            try {
                console.log(`🔄 TEST_ID: SEQUENTIAL_FILL_v16 - Processing field: ${fieldInfo.label || fieldInfo.name}`);
                
                const result = await this.fillField(fieldInfo);
                fillResults.fields.push(result);
                
                if (result.success) {
                    fillResults.filled++;
                    this.filledFields++;
                    console.log(`✅ TEST_ID: SEQUENTIAL_FILL_v16 - Successfully filled: ${fieldInfo.label || fieldInfo.name}`);
                } else {
                    fillResults.skipped++;
                    console.log(`⚠️ TEST_ID: SEQUENTIAL_FILL_v16 - Skipped: ${fieldInfo.label || fieldInfo.name}`);
                }

                // Update progress
                if (this.progressCallback) {
                    this.progressCallback({
                        current: this.filledFields,
                        total: this.totalFields,
                        field: fieldInfo.label || fieldInfo.name,
                        success: result.success
                    });
                }

                // Sequential delay between fields (1.5x slower) - TEST_ID: SEQUENTIAL_FILL_v16
                console.log(`⏱️ TEST_ID: SEQUENTIAL_FILL_v16 - Waiting 500ms before next field...`);
                await this.delay(500);

            } catch (error) {
                console.error('Error filling field:', fieldInfo.label, error);
                fillResults.errors.push({
                    field: fieldInfo.label || fieldInfo.name,
                    error: error.message
                });
            }
        }

        console.log(`✅ Form filling complete: ${fillResults.filled}/${fillResults.total} fields filled`);
        
        // Mark form as filled in automation session
        if (this.automationSession) {
            await this.markFormFilled(fillResults);
        }

        return fillResults;
    }

    async fillField(fieldInfo) {
        if (!fieldInfo.fillable || !fieldInfo.mappedValue) {
            return {
                field: fieldInfo.label || fieldInfo.name,
                success: false,
                reason: 'No mapped value'
            };
        }

        const element = fieldInfo.element;
        const value = fieldInfo.mappedValue;

        try {
            // Focus the element
            element.focus();

            // Clear existing value
            element.value = '';

            // Fill based on element type
            if (element.tagName === 'SELECT') {
                return await this.fillSelectField(element, value, fieldInfo);
            } else if (element.type === 'checkbox' || element.type === 'radio') {
                return await this.fillBooleanField(element, value, fieldInfo);
            } else if (element.type === 'file') {
                return await this.fillFileField(element, value, fieldInfo);
            } else {
                return await this.fillTextField(element, value, fieldInfo);
            }

        } catch (error) {
            return {
                field: fieldInfo.label || fieldInfo.name,
                success: false,
                reason: error.message
            };
        }
    }

    async fillTextField(element, value, fieldInfo) {
        // Simulate typing for better compatibility
        for (let i = 0; i < value.length; i++) {
            element.value += value[i];
            
            // Trigger input events
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('keyup', { bubbles: true }));
            
            await this.delay(10); // Small delay between characters
        }

        // Trigger change event
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));

        return {
            field: fieldInfo.label || fieldInfo.name,
            success: true,
            value: value
        };
    }

    async fillSelectField(element, value, fieldInfo) {
        // Try to find matching option
        const options = Array.from(element.options);
        let matchingOption = null;

        // Try exact match first
        matchingOption = options.find(option => 
            option.value.toLowerCase() === value.toLowerCase() ||
            option.textContent.toLowerCase() === value.toLowerCase()
        );

        // Try partial match if exact match fails
        if (!matchingOption) {
            matchingOption = options.find(option => 
                option.textContent.toLowerCase().includes(value.toLowerCase()) ||
                value.toLowerCase().includes(option.textContent.toLowerCase())
            );
        }

        if (matchingOption) {
            element.value = matchingOption.value;
            element.dispatchEvent(new Event('change', { bubbles: true }));
            
            return {
                field: fieldInfo.label || fieldInfo.name,
                success: true,
                value: matchingOption.textContent
            };
        }

        return {
            field: fieldInfo.label || fieldInfo.name,
            success: false,
            reason: 'No matching option found'
        };
    }

    async fillBooleanField(element, value, fieldInfo) {
        const shouldCheck = value.toLowerCase() === 'yes' || 
                           value.toLowerCase() === 'true' || 
                           value === '1';

        if (element.checked !== shouldCheck) {
            element.checked = shouldCheck;
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }

        return {
            field: fieldInfo.label || fieldInfo.name,
            success: true,
            value: shouldCheck ? 'checked' : 'unchecked'
        };
    }

    async markFormFilled(fillResults) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'markFormFilled',
                sessionId: this.automationSession,
                formData: {
                    url: window.location.href,
                    totalFields: fillResults.total,
                    filledFields: fillResults.filled,
                    skippedFields: fillResults.skipped,
                    errors: fillResults.errors,
                    timestamp: new Date().toISOString()
                }
            });

            if (response.success) {
                console.log('✅ Form marked as filled in automation session');
            } else {
                console.error('❌ Failed to mark form as filled:', response.error);
            }
        } catch (error) {
            if (error.message && error.message.includes('Extension context invalidated')) {
                console.log('⚠️ Extension context invalidated, skipping form marking');
                return;
            }
            console.error('❌ Error marking form as filled:', error);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Public methods for external use
    getDetectedFields() {
        return this.detectedFields;
    }

    getFillingProgress() {
        return {
            filled: this.filledFields,
            total: this.totalFields,
            percentage: this.totalFields > 0 ? (this.filledFields / this.totalFields) * 100 : 0
        };
    }

    async fillFileField(element, value, fieldInfo) {
        // Handle resume upload - TEST_ID: RESUME_MODERN_v16
        try {
            console.log(`📎 TEST_ID: RESUME_MODERN_v16 - File field detected in modern system: ${fieldInfo.name || fieldInfo.id}`);
            
            // Method 1: Try accessing the legacy function
            if (window.jobApplicationAssistant && window.jobApplicationAssistant.handleResumeUpload) {
                console.log(`📎 TEST_ID: RESUME_MODERN_v16 - Using legacy resume upload function`);
                const success = await window.jobApplicationAssistant.handleResumeUpload(element, {
                    name: fieldInfo.name,
                    id: fieldInfo.id,
                    type: 'file'
                });
                
                return {
                    field: fieldInfo.label || fieldInfo.name,
                    success: success,
                    value: success ? 'Resume uploaded' : 'Upload failed',
                    error: success ? null : 'Resume upload failed'
                };
            }
            
            // Method 2: Fallback - try to call the resume upload directly
            console.log(`📎 TEST_ID: RESUME_MODERN_v16 - Fallback: trying direct resume upload`);
            const success = await this.uploadResumeFile(element);
            
            return {
                field: fieldInfo.label || fieldInfo.name,
                success: success,
                value: success ? 'Resume uploaded' : 'Upload failed',
                error: success ? null : 'Resume upload failed'
            };
        } catch (error) {
            console.error('📎 TEST_ID: RESUME_MODERN_v16 - Error in file field handling:', error);
            return {
                field: fieldInfo.label || fieldInfo.name,
                success: false,
                value: '',
                error: error.message
            };
        }
    }

    async uploadResumeFile(element) {
        // Fallback resume upload method - TEST_ID: RESUME_MODERN_v16
        try {
            console.log(`📎 TEST_ID: RESUME_MODERN_v16 - Fallback resume upload starting`);
            
            // Get profile from current profile data
            if (!this.currentProfile || !this.currentProfile.id) {
                console.log(`📎 TEST_ID: RESUME_MODERN_v16 - No profile available for resume upload`);
                return false;
            }
            
            // Try to download resume from backend
            const resumeUrl = `http://localhost:8000/user/profile/${this.currentProfile.id}/resume`;
            console.log(`📎 TEST_ID: RESUME_MODERN_v16 - Downloading from: ${resumeUrl}`);
            
            const response = await fetch(resumeUrl, { method: 'GET' });
            
            if (!response.ok) {
                console.log(`📎 TEST_ID: RESUME_MODERN_v16 - Download failed: ${response.status}`);
                return false;
            }
            
            const blob = await response.blob();
            console.log(`📎 TEST_ID: RESUME_MODERN_v16 - Downloaded: ${blob.size} bytes`);
            
            // Create file object
            const fileName = `resume_${this.currentProfile.full_name || 'user'}.pdf`;
            const file = new File([blob], fileName, { 
                type: blob.type || 'application/pdf',
                lastModified: new Date().getTime()
            });
            
            // Upload to form
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            element.files = dataTransfer.files;
            
            // Trigger events
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new Event('input', { bubbles: true }));
            
            console.log(`📎 TEST_ID: RESUME_MODERN_v16 - Fallback upload successful: ${fileName}`);
            return true;
            
        } catch (error) {
            console.error('📎 TEST_ID: RESUME_MODERN_v16 - Fallback upload failed:', error);
            return false;
        }
    }

    async generateCoverLetter(jobDescription) {
        // This would integrate with the backend to generate a cover letter
        // For now, return a placeholder
        return "Dear Hiring Manager,\n\nI am excited to apply for this position...\n\nBest regards,\n" + 
               (this.currentProfile?.personal_information?.basic_information?.first_name || 'Applicant');
    }
}

// Export for use in content scripts
window.SmartFormFiller = SmartFormFiller;