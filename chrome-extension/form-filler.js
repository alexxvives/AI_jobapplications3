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

    // Progress Tracker Helper Methods - Use Content Script UI
    async showProgressTracker() {
        if (window.jobApplicationAssistant) {
            window.jobApplicationAssistant.showProgressTracker();
        }
    }

    async addProgressStep(stepId, icon, text, subtext = '', status = 'active') {
        if (window.jobApplicationAssistant) {
            window.jobApplicationAssistant.addProgressStep(stepId, icon, text, subtext, status);
        }
    }

    async updateProgressStep(stepId, status, timing = '') {
        if (window.jobApplicationAssistant) {
            window.jobApplicationAssistant.updateProgressStep(stepId, status, timing);
        }
    }

    async updateProgressSummary(text) {
        if (window.jobApplicationAssistant) {
            window.jobApplicationAssistant.updateProgressSummary(text);
        }
    }

    async hideProgressTracker() {
        if (window.jobApplicationAssistant) {
            window.jobApplicationAssistant.hideProgressTracker();
        }
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
        
        console.log(`📋 Analyzing ${formElements.length} form elements`);

        for (const element of formElements) {
            // Process each form element
            
            // Skip radio buttons if we've already processed this group
            if (element.type === 'radio') {
                if (processedRadioGroups.has(element.name)) {
                    // Skip duplicate radio button
                    continue;
                }
                processedRadioGroups.add(element.name);
            }
            
            const fieldInfo = this.analyzeField(element);
            // Analyze field properties
            
            // Special handling for dropdown elements
            if (element.tagName === 'SELECT') {
                // Force include all visible SELECT elements for AI analysis
                if (this.isFieldVisible(element) && !element.disabled && element.options.length > 1) {
                    fieldInfo.fillable = true;
                    fieldInfo.confidence = 0.7; // Medium confidence for forced dropdowns
                }
            }
            
            if (fieldInfo.fillable) {
                this.detectedFields.push(fieldInfo);
                this.totalFields++;
            } else if (element.type === 'file') {
                // File input found but not immediately fillable
            } else if (element.tagName === 'SELECT') {
                // Dropdown not marked as fillable
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
                // Skip non-fillable element
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

        // NOTE: Traditional field mapping removed - using AI-only approach
        // All field mapping is now handled by Ollama AI in the fillForm() method
        // Mark field as fillable for AI processing
        fieldInfo.fillable = true;
        fieldInfo.confidence = 0.5; // Default confidence for AI processing

        return fieldInfo;
    }

    extractFieldLabel(element) {
        // Try multiple methods to extract field label
        let label = '';

        // Method 1: Lever-specific structure - .application-label sibling
        if (!label && this.detectedPlatform === 'lever') {
            // Extract label for Lever platform
            
            // Strategy A: Look for .application-question ancestor containing .application-label
            const questionContainer = element.closest('.application-question');
            if (questionContainer) {
                const labelDiv = questionContainer.querySelector('.application-label');
                if (labelDiv) {
                    label = labelDiv.textContent.trim();
                    // Found label in application-question
                }
            }
            
            // Strategy B: Check if element is in .application-field and look for sibling .application-label
            if (!label) {
                const fieldContainer = element.closest('.application-field');
                if (fieldContainer) {
                    // Check for sibling .application-label
                    
                    // Look for preceding sibling with .application-label
                    let sibling = fieldContainer.previousElementSibling;
                    while (sibling) {
                        // Check sibling element
                        if (sibling.classList.contains('application-label')) {
                            label = sibling.textContent.trim();
                            // Found label in sibling
                            break;
                        }
                        sibling = sibling.previousElementSibling;
                    }
                }
            }
            
            // Strategy C: Look for any .application-label in the general vicinity
            if (!label) {
                const allLabels = document.querySelectorAll('.application-label');
                // Check all labels for proximity to field
                
                for (const labelElement of allLabels) {
                    // Check if this label is followed by our field container
                    let nextSibling = labelElement.nextElementSibling;
                    while (nextSibling) {
                        if (nextSibling.contains(element)) {
                            label = labelElement.textContent.trim();
                            // Found preceding label
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

    // REMOVED: Traditional mapFieldToProfile method
    // This functionality has been moved to legacy-code/traditional-field-mapping.js
    // All field mapping is now handled by Ollama AI

    async fillForm() {
        if (!this.currentProfile) {
            throw new Error('No profile available for form filling');
        }

        console.log(`🚀 Starting AI-powered form filling...`);
        
        // Initialize progress tracker
        await this.showProgressTracker();
        await this.updateProgressSummary(`Automating application for ${this.totalFields} fields`);
        
        // Step 1: Extract comprehensive form structure for Ollama
        console.log(`📋 Extracting form structure`);
        await this.addProgressStep('compile', '📋', 'Compiling application info', `Analyzing ${this.totalFields} form fields`);
        
        const formStructure = await this.extractFormStructureForOllama();
        
        await this.updateProgressStep('compile', 'completed');
        
        // Step 2: Get intelligent answers from Ollama
        console.log(`🧠 Processing fields with AI`);
        await this.addProgressStep('ai-processing', '🧠', 'AI Processing', 'Generating intelligent field mappings with Ollama');
        
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
        
        if (ollamaAnswers) {
            await this.updateProgressStep('ai-processing', 'completed');
        } else {
            await this.updateProgressStep('ai-processing', 'error');
        }
        
        // Step 3: Apply answers using existing field detection (preserves resume upload)
        if (ollamaAnswers) {
            console.log(`✅ AI processing complete - applying answers`);
            return await this.fillFormWithOllamaAnswers(ollamaAnswers);
        } else {
            // NO FALLBACK: If Ollama fails, don't fill form
            console.error('❌ AI processing failed - stopping form filling');
            
            const fillResults = {
                total: this.totalFields,
                filled: 0,
                skipped: this.totalFields,
                errors: [{
                    field: 'AI Analysis',
                    error: 'Ollama AI service failed - form filling stopped'
                }],
                fields: []
            };
            
            // Mark form as failed in automation session
            if (this.automationSession) {
                await this.markFormFilled(fillResults);
            }
            
            return fillResults;
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
        
        console.log(`🔄 Filling ${sortedFields.length} fields with AI answers`);

        for (const fieldInfo of sortedFields) {
            try {
                const fieldName = fieldInfo.label || fieldInfo.name || fieldInfo.type || 'Unknown field';
                // Processing field
                
                // Check if any previously filled fields have been cleared
                let clearedFieldsCount = 0;
                for (let i = 0; i < this.filledFields; i++) {
                    const prevField = fillResults.fields[i];
                    if (prevField && prevField.success && prevField.element) {
                        const currentValue = prevField.element.value;
                        const expectedValue = prevField.value;
                        if (currentValue !== expectedValue) {
                            clearedFieldsCount++;
                            console.log(`⚠️ Field "${prevField.field}" was cleared by form validation`);
                        }
                    }
                }
                
                // Add progress step for this field
                const stepId = `field-${this.filledFields + 1}`;
                const fieldIcon = fieldInfo.type === 'file' ? '📎' : 
                                fieldInfo.type === 'select' ? '📋' : 
                                fieldInfo.type === 'email' ? '📧' : '✍️';
                
                await this.addProgressStep(stepId, fieldIcon, `Filling ${fieldName}`, 
                    `Field type: ${fieldInfo.type}`, 'active');
                
                // Get answer from Ollama responses (try both id and name)
                const ollamaValue = ollamaAnswers[fieldInfo.id] || 
                                 ollamaAnswers[fieldInfo.name] || 
                                 ollamaAnswers[fieldInfo.element.id] || 
                                 ollamaAnswers[fieldInfo.element.name];
                
                
                let result;
                
                // RESUME UPLOAD: Use file upload logic for file fields
                if (fieldInfo.type === 'file') {
                    console.log(`📎 RESUME_UPLOAD: Processing file field with resume upload`);
                    result = await this.fillFileFieldAIOnly(fieldInfo); // AI-only file upload
                } else if (ollamaValue && ollamaValue !== "SKIP_FILE_UPLOAD") {
                    // Use Ollama answer for non-file fields
                    result = await this.fillFieldWithOllamaAnswer(fieldInfo, ollamaValue);
                } else {
                    result = {
                        field: fieldInfo.label || fieldInfo.name,
                        success: false,
                        reason: 'No Ollama answer provided'
                    };
                }
                
                // Add element reference for cross-field monitoring
                if (result && fieldInfo.element) {
                    result.element = fieldInfo.element;
                }
                
                fillResults.fields.push(result);
                
                if (result.success) {
                    fillResults.filled++;
                    this.filledFields++;
                    console.log(`✅ Filled: ${fieldName}`);
                    await this.updateProgressStep(stepId, 'completed');
                } else {
                    fillResults.skipped++;
                    console.log(`⚠️ Skipped: ${fieldName}`);
                    await this.updateProgressStep(stepId, 'error');
                }

                // Update progress summary
                await this.updateProgressSummary(`Filled ${fillResults.filled}/${this.totalFields} fields`);

                // Update progress
                if (this.progressCallback) {
                    this.progressCallback({
                        current: this.filledFields,
                        total: this.totalFields,
                        field: fieldName,
                        success: result.success
                    });
                }

                // Sequential delay between fields - TEST_ID: OLLAMA_FILL_v1
                // Brief pause between fields
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
        
        // Add completion step
        const completionIcon = fillResults.filled === fillResults.total ? '🎉' : 
                             fillResults.filled > 0 ? '✅' : '❌';
        const completionText = fillResults.filled === fillResults.total ? 'DONE! All fields completed' :
                             fillResults.filled > 0 ? `DONE! Completed ${fillResults.filled}/${fillResults.total} fields` :
                             'FAILED! No fields were filled';
        
        await this.addProgressStep('completion', completionIcon, completionText, 
            `Successfully filled ${fillResults.filled} out of ${fillResults.total} fields`, 'completed');
        
        // Update final summary
        await this.updateProgressSummary(`Automation complete: ${fillResults.filled}/${fillResults.total} fields filled`);
        
        // Keep progress tracker visible after completion (user requested)
        // Progress tracker will remain visible until user manually closes it or starts new automation
        
        // Mark form as filled in automation session
        if (this.automationSession) {
            await this.markFormFilled(fillResults);
        }

        return fillResults;
    }

    // REMOVED: fillFormTraditional method
    // This functionality has been moved to legacy-code/traditional-field-mapping.js
    // All form filling is now handled by AI-only approach

    async fillFileFieldAIOnly(fieldInfo) {
        // AI-only resume upload (no traditional mapping required)
        try {
            console.log(`📎 🧠 AI-ONLY: File field detected - name: ${fieldInfo.name}, id: ${fieldInfo.id}`);
            console.log(`📎 🧠 AI-ONLY: Current profile available:`, !!this.currentProfile);
            
            const element = fieldInfo.element;
            
            // Method 1: Try accessing the legacy function
            if (window.jobApplicationAssistant && window.jobApplicationAssistant.handleResumeUpload) {
                console.log(`📎 🧠 AI-ONLY: Using legacy resume upload function`);
                const success = await window.jobApplicationAssistant.handleResumeUpload(element, {
                    name: fieldInfo.name,
                    id: fieldInfo.id,
                    type: 'file'
                });
                console.log(`📎 🧠 AI-ONLY: Resume upload result: ${success}`);
                
                return {
                    field: fieldInfo.label || fieldInfo.name,
                    success: success,
                    value: success ? 'Resume uploaded' : 'Upload failed',
                    reason: success ? 'Resume successfully uploaded' : 'Resume upload failed'
                };
            }
            
            // Method 2: Fallback - direct upload
            console.log(`📎 🧠 AI-ONLY: Using direct resume upload`);
            const success = await this.uploadResumeFile(element);
            console.log(`📎 🧠 AI-ONLY: Direct upload result: ${success}`);
            
            return {
                field: fieldInfo.label || fieldInfo.name,
                success: success,
                value: success ? 'Resume uploaded' : 'Upload failed',
                reason: success ? 'Resume successfully uploaded' : 'Resume upload failed'
            };
        } catch (error) {
            console.error('📎 🧠 AI-ONLY: Error in file field handling:', error);
            return {
                field: fieldInfo.label || fieldInfo.name,
                success: false,
                value: '',
                reason: error.message
            };
        }
    }

    // REMOVED: fillField method (traditional mapping-based)
    // This functionality has been moved to legacy-code/traditional-field-mapping.js
    // File upload functionality preserved in fillFileFieldAIOnly method

    // REMOVED: fillTextField method (traditional mapping-based)
    // This functionality moved to legacy-code/traditional-field-mapping.js
    // Text filling now handled by fillTextFieldWithOllama method

    // REMOVED: fillSelectField method (traditional mapping-based)
    // This functionality moved to legacy-code/traditional-field-mapping.js
    // Select filling now handled by fillSelectFieldWithOllama method

    // REMOVED: fillBooleanField method (traditional mapping-based)
    // This functionality moved to legacy-code/traditional-field-mapping.js
    // Boolean filling now handled by fillBooleanFieldWithOllama method

    async fillFieldWithOllamaAnswer(fieldInfo, ollamaValue) {
        const element = fieldInfo.element;
        
        try {
            // Focus the element
            element.focus();

            // Fill based on element type
            if (element.tagName === 'SELECT') {
                return await this.fillSelectFieldWithOllama(element, ollamaValue, fieldInfo);
            } else if (element.type === 'checkbox' || element.type === 'radio') {
                return await this.fillBooleanFieldWithOllama(element, ollamaValue, fieldInfo);
            } else {
                return await this.fillTextFieldWithOllama(element, ollamaValue, fieldInfo);
            }

        } catch (error) {
            console.error(`❌ Error filling field "${fieldInfo.label || fieldInfo.name}": ${error.message}`);
            return {
                field: fieldInfo.label || fieldInfo.name,
                success: false,
                reason: error.message
            };
        }
    }

    async fillTextFieldWithOllama(element, value, fieldInfo) {
        
        // Detect if this is a location field that might be problematic
        const isLocationField = (fieldInfo.label?.toLowerCase().includes('location') || 
                               fieldInfo.name?.toLowerCase().includes('location') ||
                               fieldInfo.id?.toLowerCase().includes('location'));
        
        if (isLocationField) {
            console.log(`📍 LOCATION_FIX: Detected location field, using enhanced filling strategy`);
            return await this.fillLocationFieldSafe(element, value, fieldInfo);
        }
        
        // Detect if this is a phone field that might be problematic
        const isPhoneField = (fieldInfo.label?.toLowerCase().includes('phone') || 
                             fieldInfo.label?.toLowerCase().includes('telephone') || 
                             fieldInfo.label?.toLowerCase().includes('mobile') ||
                             fieldInfo.name?.toLowerCase().includes('phone') ||
                             fieldInfo.name?.toLowerCase().includes('telephone') ||
                             fieldInfo.name?.toLowerCase().includes('mobile') ||
                             fieldInfo.id?.toLowerCase().includes('phone') ||
                             fieldInfo.id?.toLowerCase().includes('telephone') ||
                             fieldInfo.id?.toLowerCase().includes('mobile') ||
                             element.type === 'tel');
        
        if (isPhoneField) {
            console.log(`📞 PHONE_FIX: Detected phone field, using enhanced filling strategy`);
            return await this.fillPhoneFieldSafe(element, value, fieldInfo);
        }
        
        // Simple and fast filling for most fields
        // Simple value setting for reliable fields
        element.value = value;
        
        // Trigger essential events
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));

        // Final value check
        const finalValue = element.value;
        const success = finalValue === value;
        
        // Check if simple fill was successful
        
        if (!success) {
            console.log(`⚠️ Simple fill failed - field value changed after setting`);
        }

        return {
            field: fieldInfo.label || fieldInfo.name,
            success: success,
            value: finalValue,
            expectedValue: value
        };
    }

    async fillLocationFieldSafe(element, value, fieldInfo) {
        console.log(`📍 Filling location field with protective monitoring`);
        
        const observer = new MutationObserver(() => {});
        observer.observe(element, { attributes: true, attributeFilter: ['value'] });
        
        try {
            // Set value and trigger events
            element.value = value;
            await this.delay(50);
            
            element.dispatchEvent(new Event('input', { bubbles: true }));
            await this.delay(50);
            
            element.dispatchEvent(new Event('change', { bubbles: true }));
            await this.delay(100);
            
            // Try readonly protection if value was cleared
            if (element.value !== value) {
                element.readOnly = true;
                element.value = value;
                await this.delay(200);
                element.readOnly = false;
            }
            
            // Add protective monitoring to counter form validation clearing
            let monitoringCount = 0;
            const protectiveMonitor = setInterval(() => {
                monitoringCount++;
                if (element.value !== value && monitoringCount < 50) {
                    // Restore value without extensive logging
                    element.value = value;
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                } else if (monitoringCount >= 50) {
                    clearInterval(protectiveMonitor);
                }
            }, 100);
            
            // Stop monitoring after 10 seconds  
            setTimeout(() => {
                clearInterval(protectiveMonitor);
            }, 10000);
            
            // Final persistence attempt
            if (element.value !== value) {
                for (let attempt = 0; attempt < 5; attempt++) {
                    element.value = value;
                    await this.delay(100);
                    if (element.value === value) break;
                }
            }
            
            observer.disconnect();
            
            const finalValue = element.value;
            const success = finalValue === value;
            
            if (success) {
                console.log(`📍 Location field filled successfully: "${finalValue}"`);
            } else {
                console.log(`⚠️ Location field fill failed - expected: "${value}", actual: "${finalValue}"`);
            }
            
            return {
                field: fieldInfo.label || fieldInfo.name,
                success: success,
                value: finalValue,
                strategy: 'monitored-aggressive'
            };
            
        } catch (error) {
            observer.disconnect();
            console.error(`📍 Location field error: ${error.message}`);
            return {
                field: fieldInfo.label || fieldInfo.name,
                success: false,
                value: element.value,
                strategy: 'error',
                error: error.message
            };
        }
    }

    async fillPhoneFieldSafe(element, value, fieldInfo) {
        console.log(`📞 Filling phone field with validation-safe strategy`);
        
        const observer = new MutationObserver(() => {});
        observer.observe(element, { attributes: true, attributeFilter: ['value'] });
        
        try {
            // Set value and trigger events
            element.value = value;
            await this.delay(50);
            
            element.dispatchEvent(new Event('input', { bubbles: true }));
            await this.delay(50);
            
            element.dispatchEvent(new Event('change', { bubbles: true }));
            await this.delay(100);
            
            // Skip blur event to prevent phone validation clearing
            
            // Add diagnostic monitoring to observe field changes
            let monitoringCount = 0;
            const diagnosticMonitor = setInterval(() => {
                monitoringCount++;
                if (element.value !== value && monitoringCount < 30) {
                    // Just observe and stop - don't restore to avoid validation conflicts
                    clearInterval(diagnosticMonitor);
                } else if (monitoringCount >= 30) {
                    clearInterval(diagnosticMonitor);
                }
            }, 200);
            
            // Stop monitoring after 6 seconds
            setTimeout(() => {
                clearInterval(diagnosticMonitor);
            }, 6000);
            
            // Try readonly protection if value was cleared
            if (element.value !== value) {
                element.readOnly = true;
                element.value = value;
                await this.delay(200);
                element.readOnly = false;
            }
            
            // Final persistence attempt
            if (element.value !== value) {
                for (let attempt = 0; attempt < 5; attempt++) {
                    element.value = value;
                    await this.delay(100);
                    if (element.value === value) break;
                }
            }
            
            observer.disconnect();
            
            const finalValue = element.value;
            const success = finalValue === value;
            
            if (success) {
                console.log(`📞 Phone field filled successfully: "${finalValue}"`);
            } else {
                console.log(`⚠️ Phone field fill failed - expected: "${value}", actual: "${finalValue}"`);
            }
            
            return {
                field: fieldInfo.label || fieldInfo.name,
                success: success,
                value: finalValue,
                strategy: 'monitored-aggressive-no-blur'
            };
            
        } catch (error) {
            observer.disconnect();
            console.error(`📞 Phone field error: ${error.message}`);
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
        console.log(`📋 Filling dropdown: "${fieldInfo.label || fieldInfo.name}" with "${value}"`);
        
        // Find matching option (exact match or contains)
        const options = Array.from(element.options);
        
        let matchingOption = null;

        // Try exact match first
        matchingOption = options.find(option => 
            option.textContent.trim() === value ||
            option.value === value
        );
        
        // Try exact match first - no logging needed

        // Try partial match if exact match fails
        if (!matchingOption) {
            matchingOption = options.find(option => 
                option.textContent.toLowerCase().includes(value.toLowerCase()) ||
                value.toLowerCase().includes(option.textContent.toLowerCase())
            );
            
            // Found partial match
        }

        if (matchingOption) {
            const oldValue = element.value;
            element.value = matchingOption.value;
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new Event('input', { bubbles: true }));
            
            console.log(`✅ Dropdown filled: "${matchingOption.textContent.trim()}"`);
            
            return {
                field: fieldInfo.label || fieldInfo.name,
                success: true,
                value: matchingOption.textContent.trim()
            };
        }

        console.log(`⚠️ No matching dropdown option found for "${value}"`);
        return {
            field: fieldInfo.label || fieldInfo.name,
            success: false,
            reason: `No matching option found for "${value}"`
        };
    }

    async fillBooleanFieldWithOllama(element, value, fieldInfo) {
        console.log(`🔘 Filling radio button: "${fieldInfo.label || fieldInfo.name}" with "${value}"`);
        
        // For radio buttons, find the radio with matching label text or value
        if (element.type === 'radio') {
            const radioGroup = document.querySelectorAll(`input[type="radio"][name="${element.name}"]`);
            
            for (const radio of radioGroup) {
                const radioLabel = this.extractFieldLabel(radio);
                const radioValue = radio.value;
                
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
                    console.log(`✅ Radio button selected: "${radioLabel || radioValue}"`);
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
        console.log('🧠 Sending profile and form data to AI backend');
        console.log('⏳ AI is thinking... Please wait while the language model analyzes the form and generates intelligent answers.');
        
        // Show AI thinking indicator in popup
        await chrome.storage.local.set({
            aiThinking: true,
            aiThinkingStatus: 'Analyzing form fields with AI...'
        });
        
        try {
            // Call backend endpoint instead of Ollama directly
            const response = await fetch('http://localhost:8000/api/chrome-extension/analyze-form', {
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
            console.log('✅ Received AI answers from backend');
            
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
            
            // NO FALLBACK: AI-only system - return null if backend fails
            console.log('🧠 ❌ AI-ONLY: Backend failed, no traditional fallback available');
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
                    console.log(`📎 Trying legacy resume upload method`);
                const success = await window.jobApplicationAssistant.handleResumeUpload(element, {
                    name: fieldInfo.name,
                    id: fieldInfo.id,
                    type: 'file'
                });
                console.log(`📎 Legacy method result: ${success}`);
                
                return {
                    field: fieldInfo.label || fieldInfo.name,
                    success: success,
                    value: success ? 'Resume uploaded' : 'Upload failed',
                    error: success ? null : 'Resume upload failed'
                };
            }
            
            // Method 2: Fallback - try to call the resume upload directly
            console.log(`📎 Trying direct resume upload method`);
            const success = await this.uploadResumeFile(element);
            console.log(`📎 Direct method result: ${success}`);
            
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
            console.log(`📎 Starting resume upload`);
            
            // Get profile from current profile data
            if (!this.currentProfile || !this.currentProfile.id) {
                console.log(`⚠️ No profile available for resume upload`);
                return false;
            }
            
            // Try to download resume from backend
            const resumeUrl = `http://localhost:8000/user/profile/${this.currentProfile.id}/resume`;
            console.log(`📎 Downloading resume from server`);
            
            const response = await fetch(resumeUrl, { method: 'GET' });
            
            if (!response.ok) {
                console.error(`📎 Resume download failed: ${response.status}`);
                return false;
            }
            
            const blob = await response.blob();
            console.log(`📎 Resume downloaded successfully`);
            
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
            
            console.log(`✅ Resume upload successful: ${fileName}`);
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