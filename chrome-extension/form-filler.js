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
        this.detectedPlatform = this.detectPlatform();
        
        console.log('🧠 Smart Form Filler initialized');
        console.log(`🌐 Detected platform: ${this.detectedPlatform}`);
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
        // Platform-specific selectors for better coverage
        let formSelector = 'input, textarea, select';
        if (this.detectedPlatform === 'lever') {
            // Lever often has complex nested structures
            formSelector = 'input, textarea, select, [data-qa*="input"], [class*="input"]';
        } else if (this.detectedPlatform === 'greenhouse') {
            formSelector = 'input, textarea, select, [data-greenhouse*="input"]';
        } else if (this.detectedPlatform === 'workday') {
            formSelector = 'input, textarea, select, [data-automation-id]';
        }
        
        const formElements = document.querySelectorAll(formSelector);
        this.detectedFields = [];
        this.totalFields = 0;
        
        // Track processed radio groups to avoid duplicates
        const processedRadioGroups = new Set();
        
        console.log(`🔍 DEBUG: Platform: ${this.detectedPlatform}, Total DOM elements found: ${formElements.length}`);

        for (const element of formElements) {
            console.log(`🔍 DEBUG: Element - Type: ${element.type || element.tagName}, ID: ${element.id}, Name: ${element.name}, Visible: ${this.isFieldVisible(element)}`);
            
            // Skip radio buttons if we've already processed this group
            if (element.type === 'radio') {
                if (processedRadioGroups.has(element.name)) {
                    console.log(`🔍 DEBUG: Skipping duplicate radio button in group "${element.name}"`);
                    continue;
                }
                processedRadioGroups.add(element.name);
            }
            
            const fieldInfo = this.analyzeField(element);
            console.log(`🔍 DEBUG: Field analysis - Fillable: ${fieldInfo.fillable}, Type: ${fieldInfo.type}, Label: ${fieldInfo.label}`);
            
            // Special debug for dropdowns that might not be detected
            if (element.tagName === 'SELECT') {
                console.log(`🔍 DROPDOWN_DETECTION: Found SELECT element`);
                console.log(`🔍 DROPDOWN_DETECTION: - ID: ${element.id}, Name: ${element.name}`);
                console.log(`🔍 DROPDOWN_DETECTION: - Parent class: ${element.parentElement?.className}`);
                console.log(`🔍 DROPDOWN_DETECTION: - Visible: ${this.isFieldVisible(element)}, Disabled: ${element.disabled}`);
                console.log(`🔍 DROPDOWN_DETECTION: - Label found: "${fieldInfo.label}"`);
                console.log(`🔍 DROPDOWN_DETECTION: - Options count: ${element.options.length}`);
                console.log(`🔍 DROPDOWN_DETECTION: - Fillable: ${fieldInfo.fillable}`);
                
                // Force include all visible SELECT elements for Ollama analysis
                if (this.isFieldVisible(element) && !element.disabled && element.options.length > 1) {
                    console.log(`🔍 DROPDOWN_DETECTION: ✅ FORCING inclusion of dropdown (even if not traditionally fillable)`);
                    fieldInfo.fillable = true;
                    fieldInfo.confidence = 0.7; // Medium confidence for forced dropdowns
                }
            }
            
            if (fieldInfo.fillable) {
                this.detectedFields.push(fieldInfo);
                this.totalFields++;
            } else if (element.type === 'file') {
                console.log(`📎 🔍 DEBUG: FILE INPUT FOUND BUT NOT FILLABLE - ID: ${element.id}, Name: ${element.name}, Visible: ${this.isFieldVisible(element)}, Disabled: ${element.disabled}`);
            } else if (element.tagName === 'SELECT') {
                console.log(`🔍 DROPDOWN_DETECTION: ❌ SELECT element NOT marked as fillable - investigating why...`);
            }
        }

        // Sort fields by importance/confidence
        this.detectedFields.sort((a, b) => b.confidence - a.confidence);
        
        return this.detectedFields;
    }

    async extractFormStructureForOllama() {
        console.log('🧠 Extracting comprehensive form structure for Ollama analysis...');
        
        // Get all form elements (same selector as detectFormFields)
        let formSelector = 'input, textarea, select';
        if (this.detectedPlatform === 'lever') {
            formSelector = 'input, textarea, select, [data-qa*="input"], [class*="input"]';
        } else if (this.detectedPlatform === 'greenhouse') {
            formSelector = 'input, textarea, select, [data-greenhouse*="input"]';
        } else if (this.detectedPlatform === 'workday') {
            formSelector = 'input, textarea, select, [data-automation-id]';
        }
        
        const formElements = document.querySelectorAll(formSelector);
        const formStructure = {
            platform: this.detectedPlatform,
            fields: []
        };
        
        // Track processed radio groups to avoid duplicates
        const processedRadioGroups = new Set();
        
        for (const element of formElements) {
            // Skip hidden system fields
            if (element.type === 'hidden' || element.type === 'submit' || element.type === 'button') {
                continue;
            }
            
            // Skip if not visible or disabled
            if (!this.isFieldVisible(element) || element.disabled || element.readOnly) {
                console.log(`🎯 OLLAMA_FORM_DEBUG: Skipping element - Visible: ${this.isFieldVisible(element)}, Disabled: ${element.disabled}, ReadOnly: ${element.readOnly}`);
                continue;
            }
            
            // Skip radio buttons if we've already processed this group
            if (element.type === 'radio') {
                if (processedRadioGroups.has(element.name)) {
                    console.log(`🎯 Skipping duplicate radio button in group "${element.name}"`);
                    continue;
                }
                processedRadioGroups.add(element.name);
            }
            
            const fieldData = {
                id: element.id || '',
                name: element.name || '',
                type: element.type || element.tagName.toLowerCase(),
                label: this.extractFieldLabel(element)
            };
            
            // Debug logging for dropdowns
            if (element.tagName === 'SELECT') {
                console.log(`🎯 OLLAMA_FORM_DEBUG: Processing SELECT element`);
                console.log(`🎯 OLLAMA_FORM_DEBUG: - ID: ${fieldData.id}, Name: ${fieldData.name}`);
                console.log(`🎯 OLLAMA_FORM_DEBUG: - Label: "${fieldData.label}"`);
                console.log(`🎯 OLLAMA_FORM_DEBUG: - Options count: ${element.options.length}`);
            }
            
            // Extract options for select/radio fields
            if (element.type === 'select-one' || element.tagName === 'SELECT') {
                fieldData.options = Array.from(element.options).map(opt => ({
                    value: opt.value,
                    text: opt.textContent.trim()
                })).filter(opt => opt.text); // Filter out empty options
            } else if (element.type === 'radio') {
                // Find all radio buttons with the same name
                const radioGroup = document.querySelectorAll(`input[type="radio"][name="${element.name}"]`);
                
                // Extract the VALUES from radio buttons - these are the actual answer options
                fieldData.options = Array.from(radioGroup)
                    .map(radio => radio.value.trim())
                    .filter((value, index, arr) => 
                        // Remove duplicates and empty values
                        value && arr.indexOf(value) === index
                    );
                
                // For radio buttons, the main label should be the question text
                fieldData.question = fieldData.label;
                
                console.log(`🎯 Radio Group "${element.name}": Question="${fieldData.question}", Options=[${fieldData.options.join(', ')}]`);
            }
            
            formStructure.fields.push(fieldData);
        }
        
        // Fields will be processed in DOM order
        
        console.log('🧠 Form structure extracted:', formStructure);
        return formStructure;
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

        // Method 1: Lever-specific structure - .application-label sibling
        if (!label && this.detectedPlatform === 'lever') {
            console.log(`🎯 LEVER_LABEL_DEBUG: Starting Lever label extraction for element:`, element);
            
            // Strategy A: Look for .application-question ancestor containing .application-label
            const questionContainer = element.closest('.application-question');
            if (questionContainer) {
                const labelDiv = questionContainer.querySelector('.application-label');
                if (labelDiv) {
                    label = labelDiv.textContent.trim();
                    console.log(`🎯 LEVER_LABEL_DEBUG: Strategy A - Found label in .application-question: "${label}"`);
                }
            }
            
            // Strategy B: Check if element is in .application-field and look for sibling .application-label
            if (!label) {
                const fieldContainer = element.closest('.application-field');
                if (fieldContainer) {
                    console.log(`🎯 LEVER_LABEL_DEBUG: Element is in .application-field, checking for sibling .application-label`);
                    
                    // Look for preceding sibling with .application-label
                    let sibling = fieldContainer.previousElementSibling;
                    while (sibling) {
                        console.log(`🎯 LEVER_LABEL_DEBUG: Checking sibling with class: ${sibling.className}`);
                        if (sibling.classList.contains('application-label')) {
                            label = sibling.textContent.trim();
                            console.log(`🎯 LEVER_LABEL_DEBUG: Strategy B - Found label in sibling .application-label: "${label}"`);
                            break;
                        }
                        sibling = sibling.previousElementSibling;
                    }
                }
            }
            
            // Strategy C: Look for any .application-label in the general vicinity
            if (!label) {
                const allLabels = document.querySelectorAll('.application-label');
                console.log(`🎯 LEVER_LABEL_DEBUG: Strategy C - Found ${allLabels.length} .application-label elements, checking proximity`);
                
                for (const labelElement of allLabels) {
                    // Check if this label is followed by our field container
                    let nextSibling = labelElement.nextElementSibling;
                    while (nextSibling) {
                        if (nextSibling.contains(element)) {
                            label = labelElement.textContent.trim();
                            console.log(`🎯 LEVER_LABEL_DEBUG: Strategy C - Found label: "${label}" that precedes our field`);
                            break;
                        }
                        nextSibling = nextSibling.nextElementSibling;
                    }
                    if (label) break;
                }
            }
        }

        // Method 2: Associated label element
        if (!label && element.id) {
            const labelElement = document.querySelector(`label[for="${element.id}"]`);
            if (labelElement) {
                label = labelElement.textContent.trim();
            }
        }

        // Method 3: Parent label
        if (!label) {
            const parentLabel = element.closest('label');
            if (parentLabel) {
                label = parentLabel.textContent.replace(element.textContent || '', '').trim();
            }
        }

        // Method 4: Previous sibling text (common in many ATS)
        if (!label) {
            let sibling = element.previousElementSibling;
            while (sibling && !label) {
                if (sibling.tagName === 'LABEL' || sibling.textContent.trim()) {
                    const siblingText = sibling.textContent.trim();
                    if (siblingText && siblingText.length < 200) {
                        label = siblingText;
                        break;
                    }
                }
                sibling = sibling.previousElementSibling;
            }
        }

        // Method 5: Parent container with question-like class names
        if (!label) {
            const questionParent = element.closest('[class*="question"], [class*="field"], [class*="form-group"]');
            if (questionParent) {
                // Look for label-like elements within the question container
                const labelElement = questionParent.querySelector('[class*="label"], [class*="question"], .field-label');
                if (labelElement && labelElement !== element.parentElement) {
                    label = labelElement.textContent.trim();
                }
            }
        }

        // Method 6: Parent container text (fallback)
        if (!label) {
            const parent = element.parentElement;
            if (parent) {
                const parentText = parent.textContent.replace(element.textContent || '', '').trim();
                if (parentText && parentText.length < 100 && parentText.length > 3) {
                    label = parentText;
                }
            }
        }

        // Method 7: aria-label or data attributes
        if (!label) {
            label = element.getAttribute('aria-label') || 
                   element.getAttribute('data-label') || 
                   element.getAttribute('title') || 
                   element.getAttribute('placeholder') || '';
        }

        // Clean up the label text
        if (label) {
            // Remove common suffixes and clean up
            label = label.replace(/\s*\*\s*$/, '') // Remove required asterisks
                        .replace(/\s*:\s*$/, '') // Remove trailing colons
                        .replace(/\s+/g, ' ')    // Normalize whitespace
                        .trim();
        }

        return label;
    }


    isFieldVisible(element) {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        
        // Special case: File inputs are often intentionally hidden but still functional
        if (element.type === 'file') {
            console.log(`📎 🔍 DEBUG: File input visibility check - ID: ${element.id}, Display: ${style.display}, Visibility: ${style.visibility}, Opacity: ${style.opacity}`);
            // For file inputs, only check if they're not display:none (they can be visually hidden)
            return style.display !== 'none';
        }
        
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
            fieldInfo.placeholder,
            fieldInfo.element.getAttribute('data-qa') || '',
            fieldInfo.element.getAttribute('data-testid') || ''
        ].join(' ').toLowerCase();
        
        // Debug file input mapping and location fields
        if (fieldInfo.type === 'file') {
            console.log(`📎 🔍 DEBUG: FILE INPUT MAPPING - Type: ${fieldInfo.type}, SearchText: "${searchText}", ID: ${fieldInfo.id}, Name: ${fieldInfo.name}`);
        }
        if (searchText.includes('location')) {
            console.log(`📍 🔍 DEBUG: LOCATION FIELD DETECTED - Type: ${fieldInfo.type}, SearchText: "${searchText}", ID: ${fieldInfo.id}, Name: ${fieldInfo.name}`);
        }

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
            // Location field (city, state combination)
            {
                patterns: ['location-input', 'current location', 'location', 'structured-contact-location'],
                field: 'current_location',
                value: personalInfo.address ? `${personalInfo.address.city || ''}, ${personalInfo.address.state || ''}`.trim().replace(/^,\s*|,\s*$/g, '') : '',
                confidence: 0.9
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
                patterns: ['current company', 'company', 'employer', 'organization', 'current employer'],
                field: 'current_company',
                value: this.currentProfile?.work_experience?.[0]?.company || '',
                confidence: 0.8
            },
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

        console.log(`🚀 TEST_ID: OLLAMA_SYSTEM_v3 - Starting intelligent form filling with Ollama...`);
        
        // Step 1: Extract comprehensive form structure for Ollama
        console.log(`🧠 TEST_ID: OLLAMA_SYSTEM_v3 - Step 1: Extracting form structure`);
        const formStructure = await this.extractFormStructureForOllama();
        
        // Step 2: Get intelligent answers from Ollama
        console.log(`🧠 TEST_ID: OLLAMA_SYSTEM_v3 - Step 2: Sending to Ollama for analysis`);
        
        // Update UI to show LLM is thinking
        if (this.progressCallback) {
            this.progressCallback({
                current: 0,
                total: this.totalFields,
                field: "🧠 AI is analyzing form and generating answers...",
                success: true
            });
        }
        
        const ollamaAnswers = await this.getOllamaFormAnswers(formStructure, this.currentProfile);
        
        // Step 3: Apply answers using existing field detection (preserves resume upload)
        if (ollamaAnswers) {
            console.log(`🧠 TEST_ID: OLLAMA_SYSTEM_v3 - Step 3: SUCCESS! Applying Ollama answers`);
            return await this.fillFormWithOllamaAnswers(ollamaAnswers);
        } else {
            // Fallback to traditional method if Ollama fails
            console.log('🧠 TEST_ID: OLLAMA_SYSTEM_v3 - FAILED: Ollama failed, using traditional field mapping...');
            return await this.fillFormTraditional();
        }
    }

    async fillFormWithOllamaAnswers(ollamaAnswers) {
        console.log(`🧠 Applying Ollama answers to form fields...`);
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
        
        console.log(`🔄 TEST_ID: OLLAMA_FILL_v1 - Processing ${sortedFields.length} fields with Ollama answers`);

        for (const fieldInfo of sortedFields) {
            try {
                console.log(`🔄 TEST_ID: OLLAMA_FILL_v1 - Processing field: ${fieldInfo.label || fieldInfo.name}`);
                
                // Get answer from Ollama responses (try both id and name)
                const ollamaValue = ollamaAnswers[fieldInfo.id] || 
                                 ollamaAnswers[fieldInfo.name] || 
                                 ollamaAnswers[fieldInfo.element.id] || 
                                 ollamaAnswers[fieldInfo.element.name];
                
                console.log(`🔄 FIELD_DEBUG: Field "${fieldInfo.label || fieldInfo.name}" - ID: ${fieldInfo.id}, Name: ${fieldInfo.name}, Type: ${fieldInfo.type}`);
                console.log(`🔄 FIELD_DEBUG: Ollama answer: "${ollamaValue}"`);
                console.log(`🔄 FIELD_DEBUG: Element DOM path: ${this.getElementPath(fieldInfo.element)}`);
                
                let result;
                
                // PRESERVE RESUME UPLOAD: Use existing file upload logic
                if (fieldInfo.type === 'file') {
                    console.log(`📎 PRESERVE: Using existing resume upload logic for file field`);
                    result = await this.fillField(fieldInfo); // Use existing method
                } else if (ollamaValue && ollamaValue !== "SKIP_FILE_UPLOAD") {
                    // Use Ollama answer for non-file fields
                    console.log(`🔄 FIELD_DEBUG: Using Ollama answer for field "${fieldInfo.label || fieldInfo.name}"`);
                    result = await this.fillFieldWithOllamaAnswer(fieldInfo, ollamaValue);
                } else {
                    // Skip if no Ollama answer
                    console.log(`🔄 FIELD_DEBUG: Skipping field "${fieldInfo.label || fieldInfo.name}" - no Ollama answer`);
                    result = {
                        field: fieldInfo.label || fieldInfo.name,
                        success: false,
                        reason: 'No Ollama answer provided'
                    };
                }
                
                fillResults.fields.push(result);
                
                if (result.success) {
                    fillResults.filled++;
                    this.filledFields++;
                    console.log(`✅ TEST_ID: OLLAMA_FILL_v1 - Successfully filled: ${fieldInfo.label || fieldInfo.name}`);
                } else {
                    fillResults.skipped++;
                    console.log(`⚠️ TEST_ID: OLLAMA_FILL_v1 - Skipped: ${fieldInfo.label || fieldInfo.name}`);
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

                // Sequential delay between fields - TEST_ID: OLLAMA_FILL_v1
                console.log(`⏱️ TEST_ID: OLLAMA_FILL_v1 - Waiting 500ms before next field...`);
                await this.delay(500);

            } catch (error) {
                console.error('Error filling field:', fieldInfo.label, error);
                fillResults.errors.push({
                    field: fieldInfo.label || fieldInfo.name,
                    error: error.message
                });
            }
        }

        console.log(`✅ Ollama form filling complete: ${fillResults.filled}/${fillResults.total} fields filled`);
        
        // Mark form as filled in automation session
        if (this.automationSession) {
            await this.markFormFilled(fillResults);
        }

        return fillResults;
    }

    async fillFormTraditional() {
        // Original form filling method (fallback)
        console.log(`🚀 Starting traditional form filling for ${this.totalFields} fields`);
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
        // Location field should be treated exactly like any other text field
        
        // Standard text field filling
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

    async fillFieldWithOllamaAnswer(fieldInfo, ollamaValue) {
        const element = fieldInfo.element;
        
        console.log(`🔍 DROPDOWN_DEBUG: Starting fillFieldWithOllamaAnswer for field "${fieldInfo.label || fieldInfo.name}"`);
        console.log(`🔍 DROPDOWN_DEBUG: Element tag: ${element.tagName}, type: ${element.type}`);
        console.log(`🔍 DROPDOWN_DEBUG: Ollama value: "${ollamaValue}"`);
        console.log(`🔍 DROPDOWN_DEBUG: Field ID: ${fieldInfo.id}, Name: ${fieldInfo.name}`);
        
        try {
            // Focus the element
            element.focus();

            // Fill based on element type
            if (element.tagName === 'SELECT') {
                console.log(`🔍 DROPDOWN_DEBUG: Detected SELECT dropdown, calling fillSelectFieldWithOllama`);
                return await this.fillSelectFieldWithOllama(element, ollamaValue, fieldInfo);
            } else if (element.type === 'checkbox' || element.type === 'radio') {
                console.log(`🔍 DROPDOWN_DEBUG: Detected ${element.type}, calling fillBooleanFieldWithOllama`);
                return await this.fillBooleanFieldWithOllama(element, ollamaValue, fieldInfo);
            } else {
                console.log(`🔍 DROPDOWN_DEBUG: Detected text field (tag: ${element.tagName}, type: ${element.type}), calling fillTextFieldWithOllama`);
                return await this.fillTextFieldWithOllama(element, ollamaValue, fieldInfo);
            }

        } catch (error) {
            console.log(`🔍 DROPDOWN_DEBUG: Error in fillFieldWithOllamaAnswer: ${error.message}`);
            return {
                field: fieldInfo.label || fieldInfo.name,
                success: false,
                reason: error.message
            };
        }
    }

    async fillTextFieldWithOllama(element, value, fieldInfo) {
        console.log(`🔍 FILL_DEBUG: Starting fillTextFieldWithOllama for field "${fieldInfo.label || fieldInfo.name}"`);
        console.log(`🔍 FILL_DEBUG: Target value: "${value}"`);
        console.log(`🔍 FILL_DEBUG: Element initial value: "${element.value}"`);
        console.log(`🔍 FILL_DEBUG: Element type: ${element.type}, tag: ${element.tagName}`);
        console.log(`🔍 FILL_DEBUG: Element id: ${element.id}, name: ${element.name}`);
        
        // Detect if this is a location field that might be problematic
        const isLocationField = (fieldInfo.label?.toLowerCase().includes('location') || 
                               fieldInfo.name?.toLowerCase().includes('location') ||
                               fieldInfo.id?.toLowerCase().includes('location'));
        
        if (isLocationField) {
            console.log(`📍 LOCATION_FIX: Detected location field, using enhanced filling strategy`);
            return await this.fillLocationFieldSafe(element, value, fieldInfo);
        }
        
        // Clear existing value
        element.value = '';
        console.log(`🔍 FILL_DEBUG: Cleared field, current value: "${element.value}"`);
        
        // Type the Ollama answer character by character
        for (let i = 0; i < value.length; i++) {
            const previousValue = element.value;
            element.value += value[i];
            const newValue = element.value;
            
            console.log(`🔍 FILL_DEBUG: Character ${i+1}/${value.length}: "${value[i]}" | Before: "${previousValue}" | After: "${newValue}"`);
            
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('keyup', { bubbles: true }));
            
            // Check if value was unexpectedly cleared
            if (element.value !== newValue) {
                console.log(`🔍 FILL_DEBUG: ⚠️ VALUE CHANGED UNEXPECTEDLY! Expected: "${newValue}", Actual: "${element.value}"`);
                console.log(`🔍 FILL_DEBUG: This suggests an event listener is clearing the field`);
            }
            
            await this.delay(10); // Same speed as traditional method
        }

        console.log(`🔍 FILL_DEBUG: After typing complete, field value: "${element.value}"`);
        
        // Trigger change event
        element.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`🔍 FILL_DEBUG: After change event, field value: "${element.value}"`);
        
        element.dispatchEvent(new Event('blur', { bubbles: true }));
        console.log(`🔍 FILL_DEBUG: After blur event, field value: "${element.value}"`);

        // Final value check
        const finalValue = element.value;
        const success = finalValue === value;
        
        console.log(`🔍 FILL_DEBUG: Final result - Expected: "${value}", Actual: "${finalValue}", Success: ${success}`);
        
        if (!success) {
            console.log(`🔍 FILL_DEBUG: ❌ Field filling failed - value was cleared or changed by form validation/events`);
        }

        return {
            field: fieldInfo.label || fieldInfo.name,
            success: success,
            value: finalValue,
            expectedValue: value
        };
    }

    async fillLocationFieldSafe(element, value, fieldInfo) {
        console.log(`📍 LOCATION_FIX: Starting safe location field filling`);
        console.log(`📍 LOCATION_FIX: Target value: "${value}"`);
        console.log(`📍 LOCATION_FIX: Element details:`, {
            id: element.id,
            name: element.name,
            className: element.className,
            type: element.type,
            tagName: element.tagName
        });
        
        // Strategy 1: Monitor value changes in real-time
        let valueChangeCount = 0;
        const originalValue = element.value;
        
        // Set up a mutation observer to catch value changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                    valueChangeCount++;
                    console.log(`📍 LOCATION_FIX: 🚨 VALUE ATTRIBUTE CHANGED #${valueChangeCount}: "${element.value}"`);
                }
            });
        });
        
        observer.observe(element, { attributes: true, attributeFilter: ['value'] });
        
        // Monitor property changes
        let propertyChangeCount = 0;
        const checkValueChange = () => {
            if (element.value !== value && element.value !== originalValue) {
                propertyChangeCount++;
                console.log(`📍 LOCATION_FIX: 🚨 VALUE PROPERTY CHANGED #${propertyChangeCount}: "${element.value}"`);
            }
        };
        
        try {
            console.log(`📍 LOCATION_FIX: Step 1 - Setting value directly`);
            element.value = value;
            console.log(`📍 LOCATION_FIX: After direct set: "${element.value}"`);
            checkValueChange();
            
            await this.delay(50);
            console.log(`📍 LOCATION_FIX: After 50ms: "${element.value}"`);
            checkValueChange();
            
            console.log(`📍 LOCATION_FIX: Step 2 - Triggering input event`);
            element.dispatchEvent(new Event('input', { bubbles: true }));
            console.log(`📍 LOCATION_FIX: After input event: "${element.value}"`);
            checkValueChange();
            
            await this.delay(50);
            console.log(`📍 LOCATION_FIX: After 50ms: "${element.value}"`);
            checkValueChange();
            
            console.log(`📍 LOCATION_FIX: Step 3 - Triggering change event`);
            element.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`📍 LOCATION_FIX: After change event: "${element.value}"`);
            checkValueChange();
            
            await this.delay(100);
            console.log(`📍 LOCATION_FIX: After 100ms: "${element.value}"`);
            checkValueChange();
            
            // Try to prevent clearing by setting readonly temporarily
            if (element.value !== value) {
                console.log(`📍 LOCATION_FIX: Step 4 - Value was cleared, trying readonly protection`);
                element.readOnly = true;
                element.value = value;
                console.log(`📍 LOCATION_FIX: After readonly + set: "${element.value}"`);
                
                await this.delay(200);
                element.readOnly = false;
                console.log(`📍 LOCATION_FIX: After removing readonly: "${element.value}"`);
            }
            
            // Final aggressive attempt - keep setting the value until it sticks
            if (element.value !== value) {
                console.log(`📍 LOCATION_FIX: Step 5 - Aggressive persistence attempt`);
                for (let attempt = 0; attempt < 5; attempt++) {
                    element.value = value;
                    console.log(`📍 LOCATION_FIX: Persistence attempt ${attempt + 1}: "${element.value}"`);
                    await this.delay(100);
                    if (element.value === value) {
                        console.log(`📍 LOCATION_FIX: ✅ Persistence worked on attempt ${attempt + 1}`);
                        break;
                    }
                }
            }
            
            observer.disconnect();
            
            const finalValue = element.value;
            const success = finalValue === value;
            
            console.log(`📍 LOCATION_FIX: FINAL RESULT:`);
            console.log(`📍 LOCATION_FIX: - Expected: "${value}"`);
            console.log(`📍 LOCATION_FIX: - Actual: "${finalValue}"`);
            console.log(`📍 LOCATION_FIX: - Success: ${success}`);
            console.log(`📍 LOCATION_FIX: - Value attribute changes: ${valueChangeCount}`);
            console.log(`📍 LOCATION_FIX: - Value property changes: ${propertyChangeCount}`);
            
            return {
                field: fieldInfo.label || fieldInfo.name,
                success: success,
                value: finalValue,
                strategy: 'monitored-aggressive'
            };
            
        } catch (error) {
            observer.disconnect();
            console.log(`📍 LOCATION_FIX: Error during filling: ${error.message}`);
            return {
                field: fieldInfo.label || fieldInfo.name,
                success: false,
                value: element.value,
                strategy: 'error',
                error: error.message
            };
        }
    }

    async fillSelectFieldWithOllama(element, value, fieldInfo) {
        console.log(`🔍 SELECT_DEBUG: Starting fillSelectFieldWithOllama for "${fieldInfo.label || fieldInfo.name}"`);
        console.log(`🔍 SELECT_DEBUG: Target value: "${value}"`);
        
        // Find matching option (exact match or contains)
        const options = Array.from(element.options);
        console.log(`🔍 SELECT_DEBUG: Found ${options.length} options in dropdown:`);
        
        options.forEach((option, index) => {
            console.log(`🔍 SELECT_DEBUG: Option ${index}: value="${option.value}", text="${option.textContent.trim()}"`);
        });
        
        let matchingOption = null;

        // Try exact match first
        matchingOption = options.find(option => 
            option.textContent.trim() === value ||
            option.value === value
        );
        
        if (matchingOption) {
            console.log(`🔍 SELECT_DEBUG: ✅ EXACT MATCH found: "${matchingOption.textContent.trim()}" (value: "${matchingOption.value}")`);
        }

        // Try partial match if exact match fails
        if (!matchingOption) {
            matchingOption = options.find(option => 
                option.textContent.toLowerCase().includes(value.toLowerCase()) ||
                value.toLowerCase().includes(option.textContent.toLowerCase())
            );
            
            if (matchingOption) {
                console.log(`🔍 SELECT_DEBUG: ✅ PARTIAL MATCH found: "${matchingOption.textContent.trim()}" (value: "${matchingOption.value}")`);
            }
        }

        if (matchingOption) {
            const oldValue = element.value;
            element.value = matchingOption.value;
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new Event('input', { bubbles: true }));
            
            console.log(`🔍 SELECT_DEBUG: ✅ Successfully set dropdown value from "${oldValue}" to "${element.value}"`);
            
            return {
                field: fieldInfo.label || fieldInfo.name,
                success: true,
                value: matchingOption.textContent.trim()
            };
        }

        console.log(`🔍 SELECT_DEBUG: ❌ NO MATCH found for "${value}" in dropdown options`);
        return {
            field: fieldInfo.label || fieldInfo.name,
            success: false,
            reason: `No matching option found for "${value}"`
        };
    }

    async fillBooleanFieldWithOllama(element, value, fieldInfo) {
        console.log(`🔍 RADIO_DEBUG: Starting fillBooleanFieldWithOllama for "${fieldInfo.label || fieldInfo.name}"`);
        console.log(`🔍 RADIO_DEBUG: Target value: "${value}"`);
        console.log(`🔍 RADIO_DEBUG: Element type: ${element.type}`);
        
        // For radio buttons, find the radio with matching label text or value
        if (element.type === 'radio') {
            const radioGroup = document.querySelectorAll(`input[type="radio"][name="${element.name}"]`);
            console.log(`🔍 RADIO_DEBUG: Found ${radioGroup.length} radio buttons in group "${element.name}"`);
            
            for (const radio of radioGroup) {
                const radioLabel = this.extractFieldLabel(radio);
                const radioValue = radio.value;
                
                console.log(`🔍 RADIO_DEBUG: Checking radio - Value: "${radioValue}", Label: "${radioLabel}"`);
                
                // Try multiple matching strategies
                const matches = [
                    radioValue === value,                              // Exact value match
                    radioLabel === value,                              // Exact label match  
                    radioValue.toLowerCase() === value.toLowerCase(),   // Case-insensitive value
                    radioLabel && radioLabel.toLowerCase() === value.toLowerCase(), // Case-insensitive label
                    radioLabel && radioLabel.includes(value),          // Label contains value
                    value.includes(radioLabel),                        // Value contains label
                    radioValue.includes(value),                        // Value contains radio value
                    value.includes(radioValue)                         // Value contains radio value
                ];
                
                if (matches.some(match => match)) {
                    console.log(`🔍 RADIO_DEBUG: ✅ MATCH FOUND! Selecting radio with value "${radioValue}" and label "${radioLabel}"`);
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change', { bubbles: true }));
                    radio.dispatchEvent(new Event('click', { bubbles: true }));
                    
                    return {
                        field: fieldInfo.label || fieldInfo.name,
                        success: true,
                        value: radioLabel || radioValue
                    };
                }
            }
            
            return {
                field: fieldInfo.label || fieldInfo.name,
                success: false,
                reason: `No matching radio option for "${value}"`
            };
        }

        // For checkboxes
        const shouldCheck = value.toLowerCase().includes('yes') || 
                           value.toLowerCase().includes('true') || 
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

    getElementPath(element) {
        // Helper function to get DOM path for debugging
        const path = [];
        let current = element;
        
        while (current && current !== document.body) {
            let selector = current.tagName.toLowerCase();
            if (current.id) {
                selector += `#${current.id}`;
            } else if (current.className) {
                selector += `.${current.className.split(' ').join('.')}`;
            }
            path.unshift(selector);
            current = current.parentElement;
        }
        
        return path.join(' > ');
    }

    detectPlatform() {
        const url = window.location.href.toLowerCase();
        const domain = window.location.hostname.toLowerCase();
        
        // Platform detection based on URL patterns and DOM characteristics
        if (url.includes('jobs.lever.co') || domain.includes('lever.co')) {
            return 'lever';
        }
        if (url.includes('greenhouse') || domain.includes('greenhouse') || document.querySelector('[data-greenhouse]')) {
            return 'greenhouse';
        }
        if (url.includes('workday') || domain.includes('workday') || document.querySelector('[data-automation-id]')) {
            return 'workday';
        }
        if (url.includes('bamboohr') || domain.includes('bamboohr')) {
            return 'bamboohr';
        }
        if (url.includes('smartrecruiters') || domain.includes('smartrecruiters')) {
            return 'smartrecruiters';
        }
        if (url.includes('jobvite') || domain.includes('jobvite')) {
            return 'jobvite';
        }
        if (url.includes('taleo') || domain.includes('taleo')) {
            return 'taleo';
        }
        if (url.includes('icims') || domain.includes('icims')) {
            return 'icims';
        }
        
        return 'generic';
    }

    async getOllamaFormAnswers(formStructure, userProfile) {
        console.log('🧠 TEST_ID: OLLAMA_SYSTEM_v4 - Sending to BACKEND for Ollama analysis (bypass Chrome restrictions)...');
        console.log('🧠 DEBUG: User Profile being sent to Ollama:', JSON.stringify(userProfile, null, 2));
        console.log('🧠 DEBUG: Form Structure being sent to Ollama:', JSON.stringify(formStructure, null, 2));
        console.log('⏳ AI is thinking... Please wait while the language model analyzes the form and generates intelligent answers.');
        
        // Show AI thinking indicator in popup
        await chrome.storage.local.set({
            aiThinking: true,
            aiThinkingStatus: 'Analyzing form fields with AI...'
        });
        
        try {
            // Call backend endpoint instead of Ollama directly
            const response = await fetch('http://localhost:8000/ai/analyze-form', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    formStructure: formStructure,
                    userProfile: userProfile,
                    jobUrl: window.location.href  // Include current page URL to lookup job description
                })
            });

            if (!response.ok) {
                throw new Error(`Backend API error: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ AI analysis complete! Generated intelligent answers for form fields.');
            console.log('🧠 TEST_ID: OLLAMA_SYSTEM_v4 - SUCCESS: Received answers from backend:', data.answers);
            
            // Hide AI thinking indicator
            await chrome.storage.local.set({
                aiThinking: false,
                aiThinkingStatus: 'Processing complete'
            });
            
            return data.answers;
            
        } catch (error) {
            console.error('🧠 ❌ Content: Error calling backend for Ollama analysis:', error);
            
            // Hide AI thinking indicator on error
            await chrome.storage.local.set({
                aiThinking: false,
                aiThinkingStatus: 'AI processing failed'
            });
            
            // Fallback to old mapping system if backend fails
            console.log('🧠 Falling back to traditional field mapping...');
            return null;
        }
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
            console.log(`📎 🔍 DEBUG: File field detected - name: ${fieldInfo.name}, id: ${fieldInfo.id}, element:`, element);
            console.log(`📎 🔍 DEBUG: Current profile available:`, !!this.currentProfile);
            console.log(`📎 🔍 DEBUG: Profile ID:`, this.currentProfile?.id);
            console.log(`📎 🔍 DEBUG: Window jobApplicationAssistant available:`, !!window.jobApplicationAssistant);
            console.log(`📎 🔍 DEBUG: handleResumeUpload function available:`, !!window.jobApplicationAssistant?.handleResumeUpload);
            
            // Method 1: Try accessing the legacy function
            if (window.jobApplicationAssistant && window.jobApplicationAssistant.handleResumeUpload) {
                console.log(`📎 🔍 DEBUG: TRYING METHOD 1 - Legacy resume upload function`);
                const success = await window.jobApplicationAssistant.handleResumeUpload(element, {
                    name: fieldInfo.name,
                    id: fieldInfo.id,
                    type: 'file'
                });
                console.log(`📎 🔍 DEBUG: Method 1 result: ${success}`);
                
                return {
                    field: fieldInfo.label || fieldInfo.name,
                    success: success,
                    value: success ? 'Resume uploaded' : 'Upload failed',
                    error: success ? null : 'Resume upload failed'
                };
            }
            
            // Method 2: Fallback - try to call the resume upload directly
            console.log(`📎 🔍 DEBUG: TRYING METHOD 2 - Fallback direct resume upload`);
            const success = await this.uploadResumeFile(element);
            console.log(`📎 🔍 DEBUG: Method 2 result: ${success}`);
            
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