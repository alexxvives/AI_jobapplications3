// AI Job Application Assistant - Content Script
// Injected into job application pages to detect and fill forms

// Prevent duplicate initialization
if (window.jobApplicationAssistant) {
    console.log('🔄 JobApplicationAssistant already exists, skipping initialization');
} else {

class JobApplicationAssistant {
    constructor() {
        this.isActive = false;
        this.userProfile = null;
        this.detectedFields = [];
        this.floatingUI = null;
        this.progressBar = null;
        this.filledCount = 0;
        this.totalFields = 0;
        
        // Automation components
        this.formFiller = null;
        this.submissionMonitor = null;
        this.currentSessionId = null;
        this.automationMode = false;
        this.progressActive = false; // Track if progress tracker is active
        
        // Initialize on page load
        this.init();
        
        // Listen for automation data from web page
        this.setupMessageListeners();
    }

    setupMessageListeners() {
        console.log('🎧 Setting up message listeners for automation data');
        
        // Listen for automation data from web page (AutomationModal.jsx)
        window.addEventListener('message', async (event) => {
            console.log('📨 Received window message:', event.data.type, 'from:', event.origin);
            
            // Handle both old format and new format messages
            if (event.data.type === 'STORE_AUTOMATION_DATA' || event.data.type === 'CHROME_EXTENSION_MESSAGE') {
                const messageData = event.data.type === 'CHROME_EXTENSION_MESSAGE' ? event.data : { data: event.data.data };
                
                if (event.data.action === 'STORE_AUTOMATION_DATA' || event.data.type === 'STORE_AUTOMATION_DATA') {
                    console.log('📨 🔥 AUTOMATION DATA MESSAGE RECEIVED!', {
                        type: event.data.type,
                        action: event.data.action,
                        hasData: !!messageData.data,
                        hasProfile: !!messageData.data?.userProfile,
                        profileName: messageData.data?.userProfile?.full_name
                    });
                    
                    try {
                        const automationData = messageData.data;
                        
                        // Store in Chrome storage for cross-origin access
                        const storageData = {
                            userProfile: automationData.userProfile,
                            currentSessionId: automationData.currentSessionId,
                            automationActive: automationData.automationActive || true,
                            currentJob: automationData.currentJob
                        };
                        
                        console.log('📨 Storing automation data:', {
                            hasProfile: !!storageData.userProfile,
                            profileName: storageData.userProfile?.full_name,
                            sessionId: storageData.currentSessionId,
                            active: storageData.automationActive
                        });
                        
                        await chrome.storage.local.set(storageData);
                        console.log('✅ Automation data stored in Chrome storage via window message!');
                        
                        // Verify storage
                        const verification = await chrome.storage.local.get(['userProfile', 'currentSessionId', 'automationActive']);
                        console.log('📨 ✅ Storage verification:', {
                            hasProfile: !!verification.userProfile,
                            profileName: verification.userProfile?.full_name,
                            hasSession: !!verification.currentSessionId,
                            isActive: verification.automationActive
                        });
                        
                        // Update local state
                        this.userProfile = automationData.userProfile;
                        this.currentSessionId = automationData.currentSessionId;
                        this.automationMode = true;
                        
                        // Update UI if it exists (but avoid interrupting active progress)
                        if (this.floatingUI && this.isJobApplicationPage() && !this.progressActive) {
                            this.renderUI();
                            console.log('🔄 UI updated with new profile data');
                        } else if (this.progressActive) {
                            console.log('🔄 Skipping UI render - progress tracker is active');
                        }
                        
                        // Profile data loaded via message
                        
                    } catch (error) {
                        console.error('❌ Error storing automation data from window message:', error);
                    }
                }
            }
        });
        
        // Also listen for Chrome runtime messages (from background script)
        if (chrome.runtime && chrome.runtime.onMessage) {
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                console.log('📨 Chrome runtime message:', request);
                
                if (request.action === 'SET_AUTOMATION_DATA') {
                    console.log('📨 Received automation data via runtime:', request.data);
                    this.userProfile = request.data.userProfile;
                    this.currentSessionId = request.data.currentSessionId;
                    this.automationMode = true;
                    
                    if (this.floatingUI && !this.progressActive) {
                        this.renderUI();
                        console.log('🔄 UI updated with runtime profile data');
                    } else if (this.progressActive) {
                        console.log('🔄 Skipping UI render - progress tracker is active');
                    }
                    
                    sendResponse({ success: true });
                }
                
                // Handle manual form filling request from popup
                if (request.action === 'START_FORM_FILLING') {
                    console.log('🎯 Manual form filling requested from popup');
                    
                    if (this.userProfile) {
                        // Start manual form filling
                        this.startAutomatedFormFilling().then(() => {
                            sendResponse({ success: true, message: 'Form filling started' });
                        }).catch((error) => {
                            console.error('❌ Manual form filling failed:', error);
                            sendResponse({ success: false, error: error.message });
                        });
                    } else {
                        console.error('❌ No user profile found for manual form filling');
                        sendResponse({ success: false, error: 'No user profile found' });
                    }
                    
                    return true; // Keep message channel open for async response
                }
                
                return true; // Keep message channel open
            });
        }
    }

    // Removed profile polling - profile is loaded once on page load in loadUserProfile()
    // This eliminates unnecessary background checking every 2 seconds

    stopPollingAndStartAutomation() {
        // Update UI (but avoid interrupting active progress)
        if (this.floatingUI && !this.progressActive) {
            this.renderUI();
            console.log('🔄 UI updated with profile data');
        } else if (this.progressActive) {
            console.log('🔄 Skipping UI render - progress tracker is active');
        }
        
        // Manual form filling only - automatic filling disabled
        console.log('📋 Form filling ready - waiting for user to click "Fill Form Now" button');
        
        // Data found and automation started
    }

    async init() {
        console.log('🚀 AI Job Application Assistant initialized');
        
        // Load user profile from storage
        await this.loadUserProfile();
        
        // Load automation components
        await this.loadAutomationComponents();
        
        // Detect if this is a job application page
        if (this.isJobApplicationPage()) {
            // Small delay to ensure DOM is fully loaded
            setTimeout(() => {
                this.createFloatingUI();
                this.detectFormFields();
            }, 500);
            
            // Check if we're in automation mode
            await this.checkAutomationMode();
            
            // Profile already loaded once in loadUserProfile() - no need for polling
        }
    }

    async loadUserProfile() {
        try {
            // Loading user profile silently
            
            // First try Chrome storage (should have automation data)
            const result = await chrome.storage.local.get(['userProfile', 'currentSessionId', 'automationActive']);
            // Chrome storage check complete
            
            if (result.userProfile && result.automationActive) {
                console.log('✅ Found automation data in Chrome storage');
                this.userProfile = result.userProfile;
                this.currentSessionId = result.currentSessionId;
                this.automationMode = true;
                
                // 🔍 DEBUG: Show what profile data we received for form filling
                console.log('🔍 Profile loaded:', this.userProfile.full_name || this.userProfile.email);
                
                // 🚀 AUTO-START FORM FILLING
                console.log('🚀 Form filling handled by modern system - legacy disabled - TEST_ID: DISABLE_LEGACY_v16');
                // Legacy fillFormFields() call DISABLED to prevent duplicates
                
                return; // Early return if we found data
            } else {
                // Fallback 1: Check localStorage automation session (original format)
                const sessionData = localStorage.getItem('currentAutomationSession');
                
                if (sessionData) {
                    console.log('🔄 Loading profile from localStorage session');
                    const session = JSON.parse(sessionData);
                    this.userProfile = session.userProfile;
                    this.currentSessionId = session.sessionId;
                    this.automationMode = true;
                    return; // Early return
                }
                
                // Fallback 2: Check for Chrome extension automation data in localStorage
                const extensionData = localStorage.getItem('chromeExtensionAutomationData');
                
                if (extensionData) {
                    const data = JSON.parse(extensionData);
                    this.userProfile = data.userProfile;
                    this.currentSessionId = data.currentSessionId;
                    this.automationMode = data.automationActive;
                    
                    // Also store in Chrome storage for consistency
                    try {
                        await chrome.storage.local.set({
                            userProfile: this.userProfile,
                            currentSessionId: this.currentSessionId,
                            automationActive: this.automationMode,
                            currentJob: data.currentJob
                        });
                        // Synced to Chrome storage
                    } catch (e) {
                        console.error('❌ Error syncing to Chrome storage:', e);
                    }
                    return; // Early return
                }
                
                // No profile data found
            }
            
            // Profile loading complete
            
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
        // Create floating assistant UI (Simplify-style)
        this.floatingUI = document.createElement('div');
        this.floatingUI.id = 'job-assistant-ui';
        this.isMinimized = false;
        
        document.body.appendChild(this.floatingUI);
        
        // Create the UI structure first
        this.renderUI();
    }

    renderUI() {
        // Save progress content before re-rendering if active
        let savedProgressContent = '';
        let savedProgressSummary = '';
        if (this.progressActive) {
            const progressSteps = document.getElementById('progress-steps');
            const progressSummary = document.getElementById('progress-summary');
            if (progressSteps) {
                savedProgressContent = progressSteps.innerHTML;
            }
            if (progressSummary) {
                savedProgressSummary = progressSummary.textContent;
            }
        }

        if (this.isMinimized) {
            this.floatingUI.className = 'minimized';
            this.floatingUI.innerHTML = `
                <div class="assistant-header minimized">
                    <div class="assistant-logo">🤖</div>
                    <div class="assistant-title" style="font-size: 12px;">AI Assistant</div>
                    <div class="assistant-controls">
                        <div class="assistant-maximize" id="assistant-maximize" style="margin-left: 8px;">⬜</div>
                    </div>
                </div>
            `;
        } else {
            this.floatingUI.className = '';
            this.floatingUI.innerHTML = `
                <div class="assistant-header">
                    <div class="assistant-logo">🤖</div>
                    <div class="assistant-title">AI Job Assistant</div>
                    <div class="assistant-controls">
                        <div class="assistant-minimize" id="assistant-minimize">➖</div>
                        <div class="assistant-close" id="assistant-close">×</div>
                    </div>
                </div>
                <div class="assistant-content" id="assistant-content">
                    <div class="assistant-status" id="assistant-status">
                        ${this.userProfile ? 'Profile loaded ✅' : 'No profile found ❌'}
                    </div>
                    <div class="automation-status" id="automation-status" ${this.automationMode ? '' : 'style="display: none;"'}>
                        <div class="status-indicator ${this.automationMode ? 'active' : ''}"></div>
                        <span>Automation ${this.automationMode ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div class="assistant-actions">
                        <button id="fill-form-btn" ${!this.userProfile ? 'disabled' : ''}>
                            🚀 Fill Form Now
                        </button>
                        <button id="setup-profile-btn">
                            ⚙️ ${this.userProfile ? 'Update Profile' : 'Setup Profile'}
                        </button>
                    </div>
                    <div class="assistant-progress" id="assistant-progress" style="display: ${this.progressActive ? 'block' : 'none'};">
                        <div class="progress-header">
                            <div class="progress-title">🚀 Automation Progress</div>
                            <div class="progress-summary" id="progress-summary">Starting automation...</div>
                        </div>
                        <div class="progress-steps" id="progress-steps">
                            <!-- Progress steps will be added here dynamically -->
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Restore progress content if it was active
        if (this.progressActive && savedProgressContent) {
            setTimeout(() => {
                const progressSteps = document.getElementById('progress-steps');
                const progressSummary = document.getElementById('progress-summary');
                if (progressSteps) {
                    progressSteps.innerHTML = savedProgressContent;
                }
                if (progressSummary && savedProgressSummary) {
                    progressSummary.textContent = savedProgressSummary;
                }
            }, 10); // Small delay to ensure DOM is ready
        }
        
        // Re-attach event listeners after rendering
        this.attachEventListeners();
        
        // Setup dragging functionality after elements exist
        this.makeDraggable();
    }

    attachEventListeners() {
        // Close button (acts as minimize when automation is active)
        const closeBtn = document.getElementById('assistant-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (this.automationMode && !this.isMinimized) {
                    // Minimize instead of close when automation is running
                    this.minimizeUI();
                } else {
                    // Actually close/hide the UI
                    this.floatingUI.style.display = 'none';
                }
            });
        }

        // Minimize button
        const minimizeBtn = document.getElementById('assistant-minimize');
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => {
                this.minimizeUI();
            });
        }

        // Maximize button (for minimized state)
        const maximizeBtn = document.getElementById('assistant-maximize');
        if (maximizeBtn) {
            maximizeBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent header click
                this.maximizeUI();
            });
        }

        // Click minimized header to maximize (Simplify-style)
        if (this.isMinimized) {
            const header = document.querySelector('.assistant-header.minimized');
            if (header) {
                header.addEventListener('click', () => {
                    this.maximizeUI();
                });
            }
        }

        // Fill form button
        const fillBtn = document.getElementById('fill-form-btn');
        if (fillBtn) {
            fillBtn.addEventListener('click', () => {
                // Use modern system instead of legacy - TEST_ID: DISABLE_LEGACY_v16
                console.log('🔄 Manual button clicked - using modern system');
                this.startAutomatedFormFilling();
            });
        }
        
        // Setup profile button
        const setupBtn = document.getElementById('setup-profile-btn');
        if (setupBtn) {
            setupBtn.addEventListener('click', () => {
                this.openProfileSetup();
            });
        }
        
        // Automation event listeners
        const startAutomationBtn = document.getElementById('start-automation-btn');
        if (startAutomationBtn) {
            startAutomationBtn.addEventListener('click', () => {
                this.startAutomation();
            });
        }
        
        const confirmSubmissionBtn = document.getElementById('confirm-submission-btn');
        if (confirmSubmissionBtn) {
            confirmSubmissionBtn.addEventListener('click', () => {
                this.confirmSubmission();
            });
        }
    }

    minimizeUI() {
        this.isMinimized = true;
        this.renderUI();
        console.log('🔄 UI minimized - Simplify style');
    }

    maximizeUI() {
        this.isMinimized = false;
        this.renderUI();
        console.log('🔄 UI maximized - Full view restored');
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
        
        // Check if header exists before adding event listener
        if (!header) {
            console.log('⚠️ Header not found for dragging functionality');
            return;
        }
        
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
            
            // Safe pattern attribute extraction (avoid regex errors)
            let pattern = '';
            try {
                pattern = element.getAttribute('pattern') || '';
                // Validate the pattern to avoid regex errors
                if (pattern) {
                    new RegExp(pattern); // Test if it's a valid regex
                }
            } catch (patternError) {
                console.warn('⚠️ Invalid pattern attribute detected, skipping:', pattern, patternError.message);
                pattern = ''; // Reset to empty if invalid
            }
            
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
        
        // Ready to start form filling
        
        console.log('🚀 Starting form filling with profile:', this.userProfile.full_name || this.userProfile.email);
        
        // Show comprehensive debugging information
        // Profile data validated
        this.displayDetectedFields();
        this.displayFieldMappingAnalysis();
        
        this.showProgress();
        this.filledCount = 0;
        
        // Define field mappings based on semantic similarity
        const fieldMappings = this.createFieldMappings();
        
        let fillAttempts = 0;
        let successfulFills = 0;
        
        for (const field of this.detectedFields) {
            const mapping = this.findBestMapping(field, fieldMappings);
            if (mapping) {
                fillAttempts++;
                // Filling field silently
                
                const success = await this.fillField(field, mapping);
                if (success) {
                    successfulFills++;
                    console.log(`✅ Successfully filled: ${field.labelText || field.placeholder || field.name}`);
                } else {
                    console.log(`❌ Failed to fill: ${field.labelText || field.placeholder || field.name}`);
                }
                this.updateProgress();
                
                // Small delay for UX
                await new Promise(resolve => setTimeout(resolve, 200));
            } else {
                console.log(`⚠️ No mapping found for field: "${field.labelText || field.placeholder || field.name}" (${field.type})`);
            }
        }
        
        this.hideProgress();
        
        // Final summary
        console.log('\n🎉 ═══════════════════════════════════════════════════════════════════');
        console.log('🎉                    FORM FILLING SUMMARY');
        console.log('🎉 ═══════════════════════════════════════════════════════════════════');
        console.log(`📊 Total Fields Attempted: ${fillAttempts}`);
        console.log(`✅ Successfully Filled: ${successfulFills}`);
        console.log(`❌ Failed to Fill: ${fillAttempts - successfulFills}`);
        console.log(`📈 Success Rate: ${fillAttempts > 0 ? Math.round((successfulFills / fillAttempts) * 100) : 0}%`);
        console.log('🎉 ═══════════════════════════════════════════════════════════════════\n');
        
        // Mark form filling as complete
        this.isFormFilling = false;
        this.formFilledOnce = true;
        
        this.showCompletionMessage();
    }

    createFieldMappings() {
        if (!this.userProfile) return {};
        
        
        // Use normalized profile data
        const normalized = this.getNormalizedProfile();
        
        // Extract current work info
        const currentJob = normalized.work_experience.length > 0 ? normalized.work_experience[0] : {};
        const currentEducation = normalized.education.length > 0 ? normalized.education[0] : {};
        
        // Split full name for first/last name fields  
        const nameParts = normalized.full_name.split(' ');
        const firstName = normalized.first_name || nameParts[0] || '';
        const lastName = normalized.last_name || nameParts.slice(1).join(' ') || '';
        
        // Pre-calculate summary to avoid context issues
        const profileSummary = this.generateSummary(normalized);
        
        const mappings = {
            // Personal Information
            'full_name': normalized.full_name,
            'first_name': firstName,
            'last_name': lastName,
            'name': normalized.full_name,
            'email': normalized.email,
            'phone': normalized.phone,
            'telephone': normalized.phone,
            'phone_number': normalized.phone,
            'mobile': normalized.phone,
            'gender': normalized.gender,
            'address': normalized.address,
            'street_address': normalized.address,
            'city': normalized.city,
            'state': normalized.state,
            'province': normalized.state,
            'zip_code': normalized.zip_code,
            'postal_code': normalized.zip_code,
            'zipcode': normalized.zip_code,
            'country': normalized.country,
            'nationality': normalized.citizenship,
            'citizenship': normalized.citizenship,
            
            // Work Information
            'current_company': currentJob.company || '',
            'current_employer': currentJob.company || '',
            'current_title': currentJob.title || '',
            'current_position': currentJob.title || '',
            'job_title': currentJob.title || '',
            'position_title': currentJob.title || '',
            'company': currentJob.company || '',
            'employer': currentJob.company || '',
            'position': currentJob.title || '',
            'org': currentJob.company || '',
            'organization': currentJob.company || '',
            'work_location': currentJob.location || '',
            'current_location': currentJob.location || normalized.city || '',
            
            // Education
            'degree': currentEducation.degree || '',
            'education_level': currentEducation.degree || '',
            'school': currentEducation.school || '',
            'university': currentEducation.school || '',
            'college': currentEducation.school || '',
            'institution': currentEducation.school || '',
            'gpa': currentEducation.gpa || '',
            'grade_point_average': currentEducation.gpa || '',
            'education': `${currentEducation.degree || ''} from ${currentEducation.school || ''}`.trim(),
            
            // Social/Professional Links
            'linkedin': normalized.job_preferences.linkedin_link || '',
            'linkedin_url': normalized.job_preferences.linkedin_link || '',
            'github': normalized.job_preferences.github_link || '',
            'github_url': normalized.job_preferences.github_link || '',
            'portfolio': normalized.job_preferences.portfolio_link || '',
            'portfolio_url': normalized.job_preferences.portfolio_link || '',
            'website': normalized.job_preferences.portfolio_link || normalized.job_preferences.other_url || '',
            'other_url': normalized.job_preferences.other_url || '',
            
            // Experience and Preferences  
            'experience_years': normalized.job_preferences.total_work_experience || '',
            'years_experience': normalized.job_preferences.total_work_experience || '',
            'total_experience': normalized.job_preferences.total_work_experience || '',
            'notice_period': normalized.job_preferences.notice_period || '',
            'willing_to_relocate': normalized.job_preferences.willing_to_relocate || '',
            'relocation': normalized.job_preferences.willing_to_relocate || '',
            'visa_status': normalized.job_preferences.visa_requirement || '',
            'visa_sponsorship': normalized.job_preferences.visa_requirement || '',
            'work_authorization': normalized.job_preferences.visa_requirement || '',
            'driving_license': normalized.job_preferences.driving_license || '',
            'drivers_license': normalized.job_preferences.driving_license || '',
            'current_salary': normalized.job_preferences.current_salary || '',
            'expected_salary': normalized.job_preferences.expected_salary || '',
            'salary_expectation': normalized.job_preferences.expected_salary || '',
            
            // Location combinations (proper format)
            'location': `${normalized.city}, ${normalized.state}, ${normalized.country}`.replace(/,\s*,/g, ',').replace(/^,|,$/g, '').trim(),
            'current_location': `${normalized.city}, ${normalized.state}, ${normalized.country}`.replace(/,\s*,/g, ',').replace(/^,|,$/g, '').trim(),
            'where_do_you_currently_live': `${normalized.city}, ${normalized.state}, ${normalized.country}`.replace(/,\s*,/g, ',').replace(/^,|,$/g, '').trim(),
            'current_address': `${normalized.address}, ${normalized.city}, ${normalized.state}`.replace(/,\s*,/g, ',').replace(/^,|,$/g, '').trim(),
            
            // Skills and Languages
            'skills': normalized.skills.join(', '),
            'technical_skills': normalized.skills.join(', '),
            'languages': normalized.languages.join(', '),
            'language_1': this.getLanguage(normalized.languages, 0),
            'language_2': this.getLanguage(normalized.languages, 1), 
            'language_3': this.getLanguage(normalized.languages, 2),
            
            // Additional common variations
            'applicant_name': normalized.full_name,
            'contact_email': normalized.email,
            'email_address': normalized.email,
            'phone_number': normalized.phone,
            'mobile_phone': normalized.phone,
            'home_address': normalized.address,
            'street_address': normalized.address,
            
            // Professional URLs and links (exact field names from form)
            'urls[linkedin account or any other links]': normalized.job_preferences.linkedin_link || normalized.job_preferences.portfolio_link || normalized.job_preferences.other_url || '',
            'urls[linkedin_account_or_any_other_links]': normalized.job_preferences.linkedin_link || normalized.job_preferences.portfolio_link || normalized.job_preferences.other_url || '',
            'linkedin_account': normalized.job_preferences.linkedin_link || '',
            'professional_links': normalized.job_preferences.linkedin_link || normalized.job_preferences.portfolio_link || '',
            'other_links': normalized.job_preferences.portfolio_link || normalized.job_preferences.github_link || '',
            
            // Nationality and Visa fields  
            'nationality': normalized.citizenship || normalized.country || '',
            'what_is_your_nationality': normalized.citizenship || normalized.country || '',
            'citizenship': normalized.citizenship || normalized.country || '',
            'do_you_require_visa_sponsorship': normalized.job_preferences.visa_requirement || 'No',
            'require_visa_sponsorship': normalized.job_preferences.visa_requirement || 'No',
            'visa_requirement': normalized.job_preferences.visa_requirement || 'No',
            
            // Summary/Bio field
            'summary': profileSummary,
            'bio': profileSummary,
            'about': profileSummary,
            
            // Additional language variations
            'first_language': this.getLanguage(normalized.languages, 0),
            'second_language': this.getLanguage(normalized.languages, 1),
            'third_language': this.getLanguage(normalized.languages, 2),
            
            // Additional information field
            'additional_information': profileSummary,
            'additional_info': profileSummary,
            'comments': profileSummary,
            
            // Resume file (handled specially)
            'resume': 'RESUME_FILE',
            
            // Special visa requirement mappings for radio buttons
            'no_visa_required': normalized.job_preferences.visa_requirement === 'No' ? 'No visa required' : '',
            'yes_sponsorship_is_required': normalized.job_preferences.visa_requirement === 'Yes' ? 'Yes, sponsorship is required' : '',
            'visa_sponsorship_required': normalized.job_preferences.visa_requirement || 'No',
            
            // Location/Geography special fields
            'opportunitylocationid': normalized.city || normalized.state || normalized.country || '',
            'location-input': `${normalized.city} ${normalized.state}`.trim() || normalized.country || ''
        };
        
        
        return mappings;
    }

    generateSummary(normalized) {
        const info = [];
        
        // Add work experience summary
        if (normalized.work_experience && normalized.work_experience.length > 0) {
            const currentJob = normalized.work_experience[0];
            if (currentJob.title && currentJob.company) {
                info.push(`Currently working as ${currentJob.title} at ${currentJob.company}`);
            }
            if (currentJob.description) {
                info.push(currentJob.description.substring(0, 200) + '...');
            }
        }
        
        // Add education
        if (normalized.education && normalized.education.length > 0) {
            const currentEd = normalized.education[0];
            if (currentEd.degree && currentEd.school) {
                info.push(`Education: ${currentEd.degree} from ${currentEd.school}`);
            }
        }
        
        // Add skills
        if (normalized.skills && normalized.skills.length > 0) {
            info.push(`Skills: ${normalized.skills.slice(0, 5).join(', ')}`);
        }
        
        return info.join('. ') || 'Experienced professional seeking new opportunities.';
    }

    generateAdditionalInfo(profile, workExp, education) {
        const info = [];
        
        // Add work experience summary
        if (workExp && workExp.length > 0) {
            const currentJob = workExp[0];
            if (currentJob.title && currentJob.company) {
                info.push(`Currently working as ${currentJob.title} at ${currentJob.company}`);
            }
            if (currentJob.description) {
                info.push(currentJob.description);
            }
        }
        
        // Add education
        if (education && education.length > 0) {
            const currentEd = education[0];
            if (currentEd.degree && currentEd.school) {
                info.push(`Education: ${currentEd.degree} from ${currentEd.school}`);
            }
        }
        
        // Add skills
        if (profile.skills && profile.skills.length > 0) {
            const skillsList = Array.isArray(profile.skills) 
                ? profile.skills.join(', ')
                : profile.skills;
            info.push(`Skills: ${skillsList}`);
        }
        
        return info.join('. ') || 'Experienced professional seeking new opportunities.';
    }

    getLanguage(languages, index) {
        if (!languages || !Array.isArray(languages) || languages.length <= index) {
            return '';
        }
        
        const language = languages[index];
        
        // Handle different language data structures
        if (typeof language === 'string') {
            return language;
        } else if (typeof language === 'object' && language.name) {
            return language.name;
        } else if (typeof language === 'object' && language.language) {
            return language.language;
        }
        
        return '';
    }

    // Helper method to extract normalized profile data
    getNormalizedProfile() {
        const profile = this.userProfile;
        
        // Extract basic information from nested or flat structure
        const getBasicInfo = () => {
            if (profile.personal_information?.basic_information || profile.personal_information?.contact_information || profile.personal_information?.address) {
                const basic = profile.personal_information.basic_information || {};
                const contact = profile.personal_information.contact_information || {};
                const address = profile.personal_information.address || {};
                
                return {
                    first_name: basic.first_name || '',
                    last_name: basic.last_name || '',
                    full_name: `${basic.first_name || ''} ${basic.last_name || ''}`.trim() || profile.full_name || '',
                    email: contact.email || profile.email || '',
                    phone: contact.telephone || profile.phone || '',
                    gender: basic.gender || profile.gender || '',
                    address: address.address || profile.address || '',
                    city: address.city || profile.city || '',
                    state: address.state || profile.state || '',
                    zip_code: address.zip_code || profile.zip_code || '',
                    country: address.country || profile.country || '',
                    citizenship: address.citizenship || profile.citizenship || address.country || profile.country || ''
                };
            }
            
            // Fallback to flat structure
            return {
                first_name: profile.first_name || '',
                last_name: profile.last_name || '',
                full_name: profile.full_name || '',
                email: profile.email || '',
                phone: profile.phone || '',
                gender: profile.gender || '',
                address: profile.address || '',
                city: profile.city || '',
                state: profile.state || '',
                zip_code: profile.zip_code || '',
                country: profile.country || '',
                citizenship: profile.citizenship || profile.country || ''
            };
        };
        
        // Normalize skills data
        const getSkills = () => {
            if (!profile.skills || !Array.isArray(profile.skills)) return [];
            
            return profile.skills.map(skill => {
                if (typeof skill === 'string') return skill;
                if (typeof skill === 'object' && skill.name) return skill.name;
                return String(skill);
            }).filter(Boolean);
        };
        
        return {
            ...getBasicInfo(),
            work_experience: profile.work_experience || [],
            education: profile.education || [],
            skills: getSkills(),
            languages: profile.languages || [],
            job_preferences: profile.job_preferences || {}
        };
    }

    displayProfileDataSummary() {
        console.log('\n📊 ═══════════════════════════════════════════════════════════════════');
        console.log('📊                     PROFILE DATA SUMMARY');
        console.log('📊 ═══════════════════════════════════════════════════════════════════');
        
        // Profile structure validated
        
        const normalized = this.getNormalizedProfile();
        
        // Basic Information
        console.log('👤 BASIC INFORMATION:');
        console.log(`   📝 Full Name: "${normalized.full_name || 'NOT SET'}"`);
        console.log(`   📧 Email: "${normalized.email || 'NOT SET'}"`);
        console.log(`   📞 Phone: "${normalized.phone || 'NOT SET'}"`);
        console.log(`   👤 Gender: "${normalized.gender || 'NOT SET'}"`);
        console.log(`   🏠 Address: "${normalized.address || 'NOT SET'}"`);
        console.log(`   🏙️ City: "${normalized.city || 'NOT SET'}"`);
        console.log(`   🗺️ State: "${normalized.state || 'NOT SET'}"`);
        console.log(`   📮 Zip Code: "${normalized.zip_code || 'NOT SET'}"`);
        console.log(`   🌍 Country: "${normalized.country || 'NOT SET'}"`);
        console.log(`   🛂 Citizenship: "${normalized.citizenship || 'NOT SET'}"`);
        
        // Work Experience
        console.log('\n💼 WORK EXPERIENCE:');
        if (normalized.work_experience && normalized.work_experience.length > 0) {
            normalized.work_experience.forEach((job, index) => {
                console.log(`   ${index + 1}. ${job.title || 'No Title'} at ${job.company || 'No Company'}`);
                if (job.start_date) console.log(`      📅 ${job.start_date} - ${job.end_date || 'Present'}`);
                if (job.location) console.log(`      📍 ${job.location}`);
                if (job.description) console.log(`      📝 ${job.description.substring(0, 100)}...`);
            });
        } else {
            console.log('   ❌ No work experience data');
        }
        
        // Education
        console.log('\n🎓 EDUCATION:');
        if (normalized.education && normalized.education.length > 0) {
            normalized.education.forEach((edu, index) => {
                console.log(`   ${index + 1}. ${edu.degree || 'No Degree'} from ${edu.school || 'No School'}`);
                if (edu.start_date || edu.end_date) console.log(`      📅 ${edu.start_date || 'Unknown'} - ${edu.end_date || 'Present'}`);
                if (edu.gpa) console.log(`      🏆 GPA: ${edu.gpa}`);
            });
        } else {
            console.log('   ❌ No education data');
        }
        
        // Skills
        console.log('\n💡 SKILLS:');
        if (normalized.skills && normalized.skills.length > 0) {
            console.log(`   🛠️ ${normalized.skills.join(', ')}`);
        } else {
            console.log('   ❌ No skills data');
        }

        // Languages
        console.log('\n🗣️ LANGUAGES:');
        if (normalized.languages && normalized.languages.length > 0) {
            normalized.languages.forEach((lang, index) => {
                const langName = typeof lang === 'string' ? lang : (lang.name || lang.language || 'Unknown');
                console.log(`   ${index + 1}. ${langName}`);
            });
        } else {
            console.log('   ❌ No languages data');
        }
        
        // Job Preferences
        console.log('\n⚙️ JOB PREFERENCES:');
        if (normalized.job_preferences && Object.keys(normalized.job_preferences).length > 0) {
            Object.entries(normalized.job_preferences).forEach(([key, value]) => {
                console.log(`   🎯 ${key}: "${value}"`);
            });
        } else {
            console.log('   ❌ No job preferences data');
        }
        
        console.log('📊 ═══════════════════════════════════════════════════════════════════\n');
    }

    displayDetectedFields() {
        console.log('\n🔍 ═══════════════════════════════════════════════════════════════════');
        console.log('🔍                     DETECTED FORM FIELDS');
        console.log('🔍 ═══════════════════════════════════════════════════════════════════');
        
        console.log(`📊 Total Fields Found: ${this.detectedFields.length}`);
        
        this.detectedFields.forEach((field, index) => {
            console.log(`\n${index + 1}. FIELD ANALYSIS:`);
            console.log(`   🏷️ Label: "${field.labelText || 'NO LABEL'}"`);
            console.log(`   📝 Placeholder: "${field.placeholder || 'NO PLACEHOLDER'}"`);
            console.log(`   🆔 Name: "${field.name || 'NO NAME'}"`);
            console.log(`   🎯 ID: "${field.id || 'NO ID'}"`);
            console.log(`   📋 Type: "${field.type || 'NO TYPE'}"`);
            console.log(`   🏷️ Tag: "${field.tagName || 'NO TAG'}"`);
            console.log(`   📍 Context: "${field.nearbyText?.substring(0, 50) || 'NO CONTEXT'}..."`);
            console.log(`   🔍 Descriptor: "${field.descriptor?.substring(0, 100) || 'NO DESCRIPTOR'}..."`);
            console.log(`   ⚠️ Required: ${field.required ? 'YES' : 'NO'}`);
            console.log(`   💾 Current Value: "${field.value || 'EMPTY'}"`);
            
            if (field.options && field.options.length > 0) {
                console.log(`   📋 Options: ${field.options.slice(0, 5).join(', ')}${field.options.length > 5 ? '...' : ''}`);
            }
        });
        
        console.log('\n🔍 ═══════════════════════════════════════════════════════════════════\n');
    }

    displayFieldMappingAnalysis() {
        const fieldMappings = this.createFieldMappings();
        
        let mappableFields = 0;
        this.detectedFields.forEach((field) => {
            const mapping = this.findBestMapping(field, fieldMappings);
            if (mapping) mappableFields++;
        });
        
        console.log(`🎯 Field Analysis: ${mappableFields}/${this.detectedFields.length} fields can be filled`);
    }

    findBestMapping(field, mappings) {
        const descriptor = field.descriptor.toLowerCase();
        const fieldName = field.name ? field.name.toLowerCase() : '';
        const fieldId = field.id ? field.id.toLowerCase() : '';
        let bestMatch = null;
        let bestScore = 0;
        
        // Debug logging for location field specifically
        if (fieldName === 'location' || fieldId === 'location-input') {
            console.log(`🔍 LOCATION FIELD DEBUG:`);
            console.log(`🔍 Field name: "${fieldName}"`);
            console.log(`🔍 Field ID: "${fieldId}"`);
            console.log(`🔍 Field type: "${field.type}"`);
            console.log(`🔍 Descriptor: "${descriptor}"`);
        }
        
        // Special handling for file fields (resume upload)
        if (field.type === 'file') {
            console.log(`📎 File field detected for mapping: ${fieldName}`);
            return { key: 'resume', value: 'FILE_UPLOAD' };
        }
        
        // Special handling for exact field name matches
        if (fieldName && mappings[fieldName]) {
            console.log(`🎯 Exact field name match: "${fieldName}" = "${mappings[fieldName]}"`);
            return { key: fieldName, value: mappings[fieldName] };
        }
        
        // Special handling for exact field ID matches
        if (fieldId && mappings[fieldId]) {
            console.log(`🎯 Exact field ID match: "${fieldId}" = "${mappings[fieldId]}"`);
            return { key: fieldId, value: mappings[fieldId] };
        }
        
        // Debug location field specifically
        if (fieldName === 'location' || fieldId === 'location-input') {
            console.log(`🔍 Location field mapping check:`);
            console.log(`🔍 mappings['location']: "${mappings['location']}"`);
            console.log(`🔍 mappings['location-input']: "${mappings['location-input']}"`);
            console.log(`🔍 Should have matched above, investigating...`);
        }
        
        // Special handling for location text input field
        if (fieldName === 'location' || fieldId === 'location-input') {
            console.log(`🎯 Detected location text input field`);
            console.log(`🎯 Field details:`, { name: fieldName, id: fieldId });
            // For text input, use full location format
            const locationMapping = mappings.location || mappings.location_city_state || mappings.city || '';
            console.log(`🎯 Available location data for text input:`, {
                city: mappings.city,
                state: mappings.state,
                country: mappings.country,
                location_full: mappings.location,
                location_city_state: mappings.location_city_state,
                will_use: locationMapping
            });
            return { key: 'location', value: locationMapping };
        }
        
        // Special handling for opportunityLocationId dropdown
        if (fieldName === 'opportunitylocationid' || fieldId === 'opportunitylocationid') {
            console.log(`🎯 Detected opportunityLocationId dropdown`);
            // Try multiple location formats
            const locationMapping = mappings.location_city_only || mappings.city || mappings.location_city_state || mappings.location || '';
            console.log(`🎯 Available location data:`, {
                city: mappings.city,
                state: mappings.state,
                country: mappings.country,
                location_full: mappings.location,
                will_use: locationMapping
            });
            return { key: 'opportunitylocationid', value: locationMapping };
        }
        
        // Special handling for complex field names with UUIDs (country/language dropdowns)
        if (fieldName.includes('cards[') && fieldName.includes('][field')) {
            // Country dropdown detection
            if (descriptor.includes('afghanistan') || descriptor.includes('albania') || descriptor.includes('country')) {
                if (fieldName.includes('[field0]')) {
                    return { key: 'country', value: mappings.country || '' };
                } else if (fieldName.includes('[field1]')) {
                    return { key: 'citizenship', value: mappings.citizenship || mappings.country || '' };
                }
            }
            
            // Language dropdown detection (enhanced for business level language questions)
            if (descriptor.includes('albanian') || descriptor.includes('arabic') || descriptor.includes('language') || 
                descriptor.includes('native') || descriptor.includes('business level')) {
                if (fieldName.includes('[field0]')) {
                    const lang1 = mappings.language_1 || mappings.first_language || '';
                    return { key: 'language_1', value: lang1 };
                } else if (fieldName.includes('[field1]')) {
                    const lang2 = mappings.language_2 || mappings.second_language || '';
                    return { key: 'language_2', value: lang2 };
                } else if (fieldName.includes('[field2]')) {
                    const lang3 = mappings.language_3 || mappings.third_language || '';
                    return { key: 'language_3', value: lang3 };
                }
            }
        }
        
        // Special handling for visa requirement radio buttons
        if (field.type === 'radio') {
            if (descriptor.includes('no visa required') && mappings.visa_requirement === 'No') {
                return { key: 'no_visa_required', value: 'No visa required' };
            } else if (descriptor.includes('yes, sponsorship is required') && mappings.visa_requirement === 'Yes') {
                return { key: 'yes_sponsorship_is_required', value: 'Yes, sponsorship is required' };
            }
        }
        
        // Define semantic patterns for each mapping type
        const patterns = {
            'full_name': ['full name', 'complete name', 'legal name', 'applicant name', 'name'],
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
            'org': ['org', 'organization', 'employer', 'company'],
            'location': ['location', 'current location', 'address', 'residence'],
            'where_do_you_currently_live': ['where do you currently live', 'current location', 'where you live', 'current residence'],
            'opportunitylocationid': ['opportunity location', 'position location', 'job location', 'work location', 'office location'],
            'location-input': ['location input', 'position location', 'job location', 'work location'],
            'nationality': ['nationality', 'what is your nationality', 'citizenship', 'national origin'],
            'citizenship': ['citizenship', 'nationality', 'national origin'],
            'visa_sponsorship': ['visa sponsorship', 'do you require visa sponsorship', 'require visa', 'visa requirement', 'work authorization'],
            'language_1': ['language 1', 'first language', 'primary language', 'language1', 'field0', 'speak at a native', 'business level', 'languages can you speak'],
            'language_2': ['language 2', 'second language', 'language2', 'field1', 'languages can you speak'],
            'language_3': ['language 3', 'third language', 'language3', 'field2', 'languages can you speak'],
            'languages': ['languages', 'speak at a native', 'business level', 'what language', 'can you speak'],
            'linkedin': ['linkedin', 'professional profile'],
            'github': ['github', 'code repository'],
            'portfolio': ['portfolio', 'website', 'personal website'],
            'degree': ['degree', 'education', 'qualification'],
            'school': ['school', 'university', 'college', 'institution'],
            'experience_years': ['experience', 'years of experience', 'work experience'],
            'urls[linkedin account or any other links]': ['linkedin', 'links', 'urls', 'professional links', 'other links', 'linkedin account or any other links'],
            'additional_information': ['additional information', 'additional info', 'comments', 'notes', 'cover letter', 'message'],
            // Resume file upload
            'resume': ['resume', 'cv', 'curriculum vitae', 'attach resume', 'upload resume']
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
            
            // Special handling for file fields - don't skip even if no value
            if (field.type === 'file') {
                console.log(`📎 File field detected: ${field.name || field.id}`);
                const success = this.handleResumeUpload(element, field);
                return success;
            }
            
            if (!value || !element) {
                console.log(`⚠️ Skipping field - missing value or element:`, { hasValue: !!value, hasElement: !!element });
                return false;
            }
            
            // Skip if already filled (unless empty or placeholder)
            if (element.value && element.value !== element.placeholder && element.value.trim() !== '') {
                console.log(`⚠️ Skipping field - already filled:`, element.value);
                return false;
            }
            
            console.log(`🔄 Attempting to fill ${field.type} field with value:`, value);
            
            // Handle different input types
            let success = false;
            if (field.tagName === 'select') {
                success = this.fillSelectField(element, value);
            } else if (field.type === 'checkbox') {
                success = this.fillCheckboxField(element, value);
            } else if (field.type === 'radio') {
                success = this.fillRadioField(element, value);
            } else if (field.type === 'file') {
                // Handle resume upload
                success = this.handleResumeUpload(element, field);
                return success;
            } else {
                // Text inputs, textareas, etc.
                success = this.fillTextField(element, value);
            }
            
            if (success) {
                this.filledCount++;
                
                // Trigger events with better compatibility
                try {
                    // For React and modern frameworks
                    const events = [
                        new Event('input', { bubbles: true, cancelable: true }),
                        new Event('change', { bubbles: true, cancelable: true }),
                        new Event('blur', { bubbles: true, cancelable: true }),
                        // Additional events for some frameworks
                        new Event('keyup', { bubbles: true, cancelable: true }),
                        new Event('focus', { bubbles: true, cancelable: true })
                    ];
                    
                    events.forEach(event => {
                        try {
                            element.dispatchEvent(event);
                        } catch (eventError) {
                            console.warn(`⚠️ Failed to dispatch ${event.type} event:`, eventError.message);
                        }
                    });
                } catch (eventDispatchError) {
                    console.warn('⚠️ Event dispatch failed:', eventDispatchError.message);
                }
                
                console.log(`✅ Successfully filled field with value:`, value);
                return true;
            } else {
                console.log(`❌ Failed to fill field with value:`, value);
                return false;
            }
            
        } catch (error) {
            console.error('❌ Error filling field:', error);
            return false;
        }
    }

    fillTextField(element, value) {
        try {
            // Method 1: Direct assignment
            element.value = value;
            
            // Method 2: Set attribute
            element.setAttribute('value', value);
            
            // Method 3: For React/modern frameworks (with proper error handling)
            try {
                const elementType = element.tagName.toLowerCase();
                if (elementType === 'input') {
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                        window.HTMLInputElement.prototype, 'value'
                    )?.set;
                    if (nativeInputValueSetter) {
                        nativeInputValueSetter.call(element, value);
                    }
                } else if (elementType === 'textarea') {
                    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
                        window.HTMLTextAreaElement.prototype, 'value'
                    )?.set;
                    if (nativeTextAreaValueSetter) {
                        nativeTextAreaValueSetter.call(element, value);
                    }
                }
            } catch (reactError) {
                console.warn('⚠️ React/native setter failed, using fallback:', reactError.message);
                // Fallback: just use direct assignment
                element.value = value;
            }
            
            // Method 4: Alternative React approach
            try {
                // Simulate user typing for React
                const inputEvent = new InputEvent('input', {
                    bubbles: true,
                    cancelable: true,
                    inputType: 'insertText',
                    data: value
                });
                element.dispatchEvent(inputEvent);
            } catch (eventError) {
                console.warn('⚠️ InputEvent dispatch failed:', eventError.message);
            }

            // Method 5: Focus and simulate typing (for stubborn forms)
            try {
                element.focus();
                // Clear existing value first
                element.setSelectionRange(0, element.value.length);
                // Set new value
                element.value = value;
                // Trigger focus out
                element.blur();
            } catch (focusError) {
                console.warn('⚠️ Focus/blur method failed:', focusError.message);
            }
            
            // Verify the field was filled
            const success = element.value === value;
            console.log(`🔍 Field fill verification: expected "${value}", got "${element.value}", success: ${success}`);
            
            return success;
        } catch (error) {
            console.error('❌ Error in fillTextField:', error);
            // Fallback attempt
            try {
                element.value = value;
                return element.value === value;
            } catch (fallbackError) {
                console.error('❌ Fallback fillTextField also failed:', fallbackError);
                return false;
            }
        }
    }

    fillSelectField(element, value) {
        try {
            if (!value || value.toString().trim() === '') {
                console.log('⚠️ Empty value for select field, skipping');
                return false;
            }
            
            const valueStr = value.toString().toLowerCase().trim();
            const options = Array.from(element.options);
            
            console.log(`🔍 Trying to select "${value}" from ${options.length} options:`, 
                options.map(opt => `"${opt.text}" (value: "${opt.value}")`));
            
            // 1. Exact text match
            let option = options.find(opt => 
                opt.text.toLowerCase().trim() === valueStr
            );
            
            // 2. Exact value match
            if (!option) {
                option = options.find(opt => 
                    opt.value.toLowerCase().trim() === valueStr
                );
            }
            
            // 3. Text contains value
            if (!option) {
                option = options.find(opt => 
                    opt.text.toLowerCase().includes(valueStr)
                );
            }
            
            // 4. Value contains text
            if (!option) {
                option = options.find(opt => 
                    valueStr.includes(opt.text.toLowerCase().trim())
                );
            }
            
            // 5. Special mappings for common values
            if (!option) {
                const specialMappings = {
                    'yes': ['yes', 'true', '1'],
                    'no': ['no', 'false', '0', 'none'],
                    'male': ['male', 'm'],
                    'female': ['female', 'f'],
                    'united states': ['usa', 'us', 'america', 'united states'],
                    'united kingdom': ['uk', 'britain', 'england'],
                    // Language mappings
                    'english': ['english', 'en'],
                    'spanish': ['spanish', 'es', 'español'],
                    'french': ['french', 'fr', 'français'],
                    'german': ['german', 'de', 'deutsch'],
                    'chinese': ['chinese', 'zh', 'mandarin'],
                    'japanese': ['japanese', 'ja'],
                    'korean': ['korean', 'ko'],
                    'portuguese': ['portuguese', 'pt'],
                    'italian': ['italian', 'it'],
                    'russian': ['russian', 'ru'],
                    // Location mappings - US Cities
                    'new york': ['new york', 'ny', 'nyc', 'new york city'],
                    'los angeles': ['los angeles', 'la', 'california'],
                    'chicago': ['chicago', 'il', 'illinois'],
                    'san francisco': ['san francisco', 'sf', 'california'],
                    'boston': ['boston', 'ma', 'massachusetts'],
                    'seattle': ['seattle', 'wa', 'washington'],
                    'austin': ['austin', 'tx', 'texas'],
                    'denver': ['denver', 'co', 'colorado'],
                    // International locations
                    'tokyo': ['tokyo', 'japan'],
                    'taipei': ['taipei', 'taiwan'],
                    'dubai': ['dubai', 'uae'],
                    'manama': ['manama', 'bahrain'],
                    'singapore': ['singapore'],
                    'london': ['london', 'uk', 'england'],
                    'paris': ['paris', 'france'],
                    'berlin': ['berlin', 'germany'],
                    'mumbai': ['mumbai', 'india'],
                    'bangalore': ['bangalore', 'india'],
                    'sydney': ['sydney', 'australia'],
                    'toronto': ['toronto', 'canada']
                };
                
                for (const [key, values] of Object.entries(specialMappings)) {
                    if (values.includes(valueStr)) {
                        option = options.find(opt => 
                            opt.text.toLowerCase().includes(key) ||
                            opt.value.toLowerCase().includes(key)
                        );
                        if (option) break;
                    }
                }
            }
            
            if (option) {
                console.log(`✅ Location match found: "${option.text}" (value: "${option.value}")`);
                
                // Set the value
                element.value = option.value;
                element.selectedIndex = option.index;
                
                // Trigger events to notify the form
                const events = ['change', 'input', 'blur'];
                events.forEach(eventType => {
                    try {
                        const event = new Event(eventType, { bubbles: true, cancelable: true });
                        element.dispatchEvent(event);
                    } catch (e) {
                        // Fallback for older browsers
                        const event = document.createEvent('HTMLEvents');
                        event.initEvent(eventType, true, true);
                        element.dispatchEvent(event);
                    }
                });
                
                return true;
            } else {
                console.log(`❌ No matching option found for "${value}"`);
                console.log(`❌ Available options were:`, options.slice(0, 10).map(opt => opt.text));
                return false;
            }
        } catch (error) {
            console.error('❌ Error in fillSelectField:', error);
            return false;
        }
    }

    fillCheckboxField(element, value) {
        try {
            // Convert value to boolean
            const shouldCheck = value && 
                (value.toLowerCase() === 'yes' || 
                 value.toLowerCase() === 'true' || 
                 value === '1');
            
            element.checked = shouldCheck;
            return true;
        } catch (error) {
            console.error('❌ Error in fillCheckboxField:', error);
            return false;
        }
    }

    fillRadioField(element, value) {
        try {
            console.log(`🔘 Filling radio field with value: "${value}"`);
            
            // Find radio group and select appropriate option
            const radioGroup = document.querySelectorAll(`input[name="${element.name}"]`);
            console.log(`🔘 Found ${radioGroup.length} radio buttons in group`);
            
            for (const radio of radioGroup) {
                // Get label text in multiple ways
                const label = document.querySelector(`label[for="${radio.id}"]`);
                let labelText = '';
                
                if (label) {
                    labelText = label.textContent.toLowerCase().trim();
                } else {
                    // Try to find text near the radio button
                    const parent = radio.parentElement;
                    if (parent) {
                        labelText = parent.textContent.toLowerCase().trim();
                    }
                }
                
                // Get radio value
                const radioValue = radio.value ? radio.value.toLowerCase().trim() : '';
                
                console.log(`🔘 Checking radio: value="${radioValue}", label="${labelText}"`);
                
                // Multiple matching strategies
                const valueToMatch = value.toLowerCase().trim();
                
                // 1. Exact text match
                if (labelText === valueToMatch || radioValue === valueToMatch) {
                    console.log(`✅ Exact match found, selecting radio`);
                    radio.checked = true;
                    this.triggerRadioEvents(radio);
                    return true;
                }
                
                // 2. Contains match
                if (labelText.includes(valueToMatch) || valueToMatch.includes(labelText)) {
                    console.log(`✅ Contains match found, selecting radio`);
                    radio.checked = true;
                    this.triggerRadioEvents(radio);
                    return true;
                }
                
                // 3. Special visa requirement matching
                if (valueToMatch.includes('no') && (labelText.includes('no visa') || labelText.includes('not required'))) {
                    console.log(`✅ "No visa" match found, selecting radio`);
                    radio.checked = true;
                    this.triggerRadioEvents(radio);
                    return true;
                }
                
                if (valueToMatch.includes('yes') && (labelText.includes('yes') || labelText.includes('required') || labelText.includes('sponsorship'))) {
                    console.log(`✅ "Yes sponsorship" match found, selecting radio`);
                    radio.checked = true;
                    this.triggerRadioEvents(radio);
                    return true;
                }
            }
            
            console.log(`❌ No matching radio button found for: "${value}"`);
            return false;
        } catch (error) {
            console.error('❌ Error in fillRadioField:', error);
            return false;
        }
    }
    
    async handleResumeUpload(element, field) {
        try {
            console.log(`📎 Resume upload field detected: ${field.name || field.id}`);
            console.log(`📎 RESUME DEBUG: User profile keys:`, Object.keys(this.userProfile || {}));
            console.log(`📎 RESUME DEBUG: Profile ID:`, this.userProfile?.id);
            console.log(`📎 RESUME DEBUG: Has resume:`, this.userProfile?.has_resume);
            console.log(`📎 RESUME DEBUG: Resume path:`, this.userProfile?.resume_path);
            
            // Check if user has a resume file path in their profile
            if (!this.userProfile.resume_path && !this.userProfile.has_resume) {
                console.log(`⚠️ No resume file found in user profile, skipping upload`);
                return false;
            }
            
            console.log(`📎 User has resume: ${this.userProfile.has_resume ? 'Yes' : 'No'}`);
            console.log(`📎 Resume path: ${this.userProfile.resume_path || 'Not specified'}`);
            
            // Try to automatically upload the exact resume file from backend - TEST_ID: RESUME_ACTUAL_v6
            console.log(`📎 TEST_ID: RESUME_ACTUAL_v6 - Downloading actual resume file from backend`);
            const uploadSuccess = await this.downloadAndUploadActualResume(element);
            
            if (uploadSuccess) {
                console.log(`✅ Resume uploaded successfully!`);
                return true;
            } else {
                console.log(`⚠️ Automatic upload failed`);
                return true; // Still return true so we don't mark it as completely failed
            }
        } catch (error) {
            console.error('❌ Error handling resume upload:', error);
            return false;
        }
    }
    
    async downloadAndUploadActualResume(element) {
        try {
            console.log(`📎 TEST_ID: RESUME_ACTUAL_v6 - Attempting to download actual resume file...`);
            
            // Try the backend endpoint without auth first (simpler approach)
            const resumeUrl = `http://localhost:8000/user/profile/${this.userProfile.id}/resume`;
            console.log(`📎 TEST_ID: RESUME_ACTUAL_v6 - Trying without auth: ${resumeUrl}`);
            
            const response = await fetch(resumeUrl, {
                method: 'GET'
                // No auth headers to test if backend allows it
            });
            
            console.log(`📎 TEST_ID: RESUME_ACTUAL_v6 - Response status:`, response.status);
            console.log(`📎 TEST_ID: RESUME_ACTUAL_v6 - Response headers:`, Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unable to read error');
                console.log(`❌ TEST_ID: RESUME_ACTUAL_v6 - Download failed: ${response.status} - ${errorText}`);
                console.log(`❌ TEST_ID: RESUME_ACTUAL_v6 - Full response:`, response);
                // Fall back to the text file approach as backup
                return await this.createAndUploadResumeFromProfile(element);
            }
            
            // Get the actual file
            const blob = await response.blob();
            console.log(`📎 TEST_ID: RESUME_ACTUAL_v6 - Downloaded blob: ${blob.size} bytes, type: ${blob.type}`);
            
            // Create File object with original name
            const fileName = this.userProfile.resume_path ? 
                this.userProfile.resume_path.split('/').pop() : 
                `${this.userProfile.full_name || 'resume'}.pdf`;
            
            const file = new File([blob], fileName, { 
                type: blob.type || 'application/pdf',
                lastModified: new Date().getTime()
            });
            
            console.log(`📎 TEST_ID: RESUME_ACTUAL_v6 - Created file object: ${fileName} (${file.size} bytes)`);
            
            // Upload to form
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            element.files = dataTransfer.files;
            
            // Trigger events
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new Event('input', { bubbles: true }));
            
            console.log(`✅ TEST_ID: RESUME_ACTUAL_v6 - Actual resume file uploaded: ${fileName}`);
            
            return true;
        } catch (error) {
            console.error('❌ TEST_ID: RESUME_ACTUAL_v6 - Error downloading actual resume:', error);
            // Fall back to text file approach
            return await this.createAndUploadResumeFromProfile(element);
        }
    }

    async createAndUploadResumeFromProfile(element) {
        try {
            console.log(`📎 TEST_ID: RESUME_FIX_v5 - Creating resume from profile data...`);
            
            // Generate resume content from user profile
            const resumeContent = this.generateResumeContent();
            console.log(`📎 TEST_ID: RESUME_FIX_v5 - Generated resume content (${resumeContent.length} chars)`);
            
            // Create a File object (text file that employers can read)
            const fileName = `${this.userProfile.full_name || 'Resume'}_Resume.txt`;
            const file = new File([resumeContent], fileName, { 
                type: 'text/plain',
                lastModified: new Date().getTime()
            });
            
            console.log(`📎 TEST_ID: RESUME_FIX_v5 - Created file: ${fileName} (${file.size} bytes)`);
            
            // Create a FileList-like object
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            
            // Set the files to the input element
            element.files = dataTransfer.files;
            
            // Trigger change events
            const changeEvent = new Event('change', { bubbles: true });
            element.dispatchEvent(changeEvent);
            
            const inputEvent = new Event('input', { bubbles: true });
            element.dispatchEvent(inputEvent);
            
            console.log(`✅ TEST_ID: RESUME_FIX_v5 - Resume file uploaded successfully: ${fileName}`);
            
            return true;
        } catch (error) {
            console.error('❌ TEST_ID: RESUME_FIX_v5 - Error creating resume from profile:', error);
            return false;
        }
    }

    generateResumeContent() {
        const profile = this.userProfile;
        const normalized = this.getNormalizedProfile();
        
        let content = [];
        
        // Header
        content.push(`${normalized.full_name}`);
        content.push(`Email: ${normalized.email}`);
        content.push(`Phone: ${normalized.phone}`);
        if (normalized.address) content.push(`Address: ${normalized.address}, ${normalized.city}, ${normalized.state} ${normalized.zip_code}`);
        content.push('');
        
        // Professional Summary
        if (normalized.work_experience.length > 0) {
            content.push('PROFESSIONAL EXPERIENCE');
            content.push('========================');
            normalized.work_experience.forEach((job, index) => {
                content.push(`${job.title} at ${job.company}`);
                if (job.start_date) content.push(`${job.start_date} - ${job.end_date || 'Present'}`);
                if (job.location) content.push(`Location: ${job.location}`);
                if (job.description) content.push(job.description);
                content.push('');
            });
        }
        
        // Education
        if (normalized.education.length > 0) {
            content.push('EDUCATION');
            content.push('=========');
            normalized.education.forEach(edu => {
                content.push(`${edu.degree} - ${edu.school}`);
                if (edu.start_date) content.push(`${edu.start_date} - ${edu.end_date || 'Present'}`);
                if (edu.gpa) content.push(`GPA: ${edu.gpa}`);
                content.push('');
            });
        }
        
        // Skills
        if (normalized.skills.length > 0) {
            content.push('SKILLS');
            content.push('======');
            content.push(normalized.skills.join(', '));
            content.push('');
        }
        
        // Languages
        if (normalized.languages.length > 0) {
            content.push('LANGUAGES');
            content.push('=========');
            content.push(normalized.languages.map(lang => typeof lang === 'string' ? lang : lang.name || lang.language).join(', '));
            content.push('');
        }
        
        // Additional Information
        if (normalized.job_preferences.linkedin_link) {
            content.push('LINKS');
            content.push('=====');
            if (normalized.job_preferences.linkedin_link) content.push(`LinkedIn: ${normalized.job_preferences.linkedin_link}`);
            if (normalized.job_preferences.github_link) content.push(`GitHub: ${normalized.job_preferences.github_link}`);
            if (normalized.job_preferences.portfolio_link) content.push(`Portfolio: ${normalized.job_preferences.portfolio_link}`);
        }
        
        return content.join('\n');
    }

    async downloadAndUploadResume(element) {
        try {
            console.log(`📎 Attempting automatic resume upload...`);
            console.log(`📎 DOWNLOAD DEBUG: Profile ID:`, this.userProfile?.id);
            console.log(`📎 DOWNLOAD DEBUG: Profile has_resume:`, this.userProfile?.has_resume);
            console.log(`📎 DOWNLOAD DEBUG: Profile resume_path:`, this.userProfile?.resume_path);
            
            // Get auth token - TEST_ID: TOKEN_SEARCH_v4
            console.log(`📎 TEST_ID: TOKEN_SEARCH_v4 - Checking for auth token across storages...`);
            console.log(`📎 TEST_ID: TOKEN_SEARCH_v4 - Current domain:`, window.location.hostname);
            
            // Check all localStorage items on this domain
            const allLocalStorageItems = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                allLocalStorageItems[key] = value ? `${value.substring(0, 20)}...` : 'null';
            }
            console.log(`📎 TEST_ID: TOKEN_SEARCH_v4 - All localStorage items:`, allLocalStorageItems);
            
            // Check localStorage first (for same-domain) - TOKEN_FIX_v4
            const localToken = localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('jwt');
            console.log(`📎 TEST_ID: TOKEN_SEARCH_v4 - LocalStorage token found:`, !!localToken);
            
            // Check Chrome storage (cross-domain)
            let chromeToken = null;
            try {
                const chromeStorage = await chrome.storage.local.get(['token', 'authToken', 'access_token', 'jwt', 'accessToken']);
                console.log(`📎 TEST_ID: TOKEN_SEARCH_v3 - Chrome storage keys:`, Object.keys(chromeStorage));
                chromeToken = chromeStorage.token || chromeStorage.authToken || chromeStorage.access_token || chromeStorage.jwt || chromeStorage.accessToken;
                console.log(`📎 TEST_ID: TOKEN_SEARCH_v3 - Chrome storage token found:`, !!chromeToken);
            } catch (error) {
                console.log(`📎 TEST_ID: TOKEN_SEARCH_v3 - Chrome storage access failed:`, error);
            }
            
            const token = localToken || chromeToken;
            console.log(`📎 DOWNLOAD DEBUG: Final auth token found:`, !!token);
            console.log(`📎 DOWNLOAD DEBUG: Final auth token length:`, token?.length);
            
            if (!token) {
                console.log(`⚠️ No auth token found for resume download in localStorage or Chrome storage`);
                return false;
            }
            
            // Download resume from backend
            const resumeUrl = `http://localhost:8000/user/profile/${this.userProfile.id}/resume`;
            console.log(`📎 Downloading resume from: ${resumeUrl}`);
            
            const response = await fetch(resumeUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log(`📎 DOWNLOAD DEBUG: Response status:`, response.status);
            console.log(`📎 DOWNLOAD DEBUG: Response headers:`, Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unable to read error');
                console.log(`❌ Resume download failed: ${response.status} - ${errorText}`);
                return false;
            }
            
            // Get the blob data
            const blob = await response.blob();
            console.log(`📎 Resume downloaded, size: ${blob.size} bytes, type: ${blob.type}`);
            
            // Create a File object
            const fileName = this.userProfile.resume_path ? 
                this.userProfile.resume_path.split('/').pop() : 
                `${this.userProfile.full_name || 'resume'}.pdf`;
            
            const file = new File([blob], fileName, { 
                type: blob.type || 'application/pdf',
                lastModified: new Date().getTime()
            });
            
            // Create a FileList-like object
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            
            // Set the files to the input element
            element.files = dataTransfer.files;
            
            // Trigger change events
            const changeEvent = new Event('change', { bubbles: true });
            element.dispatchEvent(changeEvent);
            
            const inputEvent = new Event('input', { bubbles: true });
            element.dispatchEvent(inputEvent);
            
            console.log(`✅ Resume file set to input: ${fileName}`);
            
            return true;
        } catch (error) {
            console.error('❌ Error in downloadAndUploadResume:', error);
            return false;
        }
    }
    
    // Resume upload notification function REMOVED - TEST_ID: NO_NOTIFICATIONS_v16
    // Visual notifications disabled per user request
    
    triggerRadioEvents(radio) {
        // Trigger events to notify the form
        const events = ['change', 'click', 'input'];
        events.forEach(eventType => {
            try {
                const event = new Event(eventType, { bubbles: true, cancelable: true });
                radio.dispatchEvent(event);
            } catch (e) {
                // Fallback for older browsers
                const event = document.createEvent('HTMLEvents');
                event.initEvent(eventType, true, true);
                radio.dispatchEvent(event);
            }
        });
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

    // Automation Methods
    async loadAutomationComponents() {
        try {
            // Load smart form filler
            if (window.SmartFormFiller) {
                this.formFiller = new window.SmartFormFiller();
                console.log('✅ Smart Form Filler loaded');
            }
            
            // Load submission monitor
            if (window.SubmissionMonitor) {
                this.submissionMonitor = new window.SubmissionMonitor();
                console.log('✅ Submission Monitor loaded');
            }
        } catch (error) {
            console.error('❌ Error loading automation components:', error);
        }
    }

    async checkAutomationMode() {
        try {
            // Check if we already detected automation mode during profile load
            if (this.automationMode && this.currentSessionId) {
                console.log('🤖 Automation mode already active:', this.currentSessionId);
                
                // Update UI for automation mode
                this.showAutomationUI();
                
                // Manual form filling only - automatic filling disabled
                console.log('📋 Profile loaded - waiting for user to click "Fill Form Now" button');
                
                return;
            }
            
            // Fallback: Check Chrome storage
            const result = await chrome.storage.local.get(['currentSessionId']);
            if (result.currentSessionId) {
                this.currentSessionId = result.currentSessionId;
                this.automationMode = true;
                
                console.log('🤖 Automation mode activated with session:', this.currentSessionId);
                
                // Update UI for automation mode
                this.showAutomationUI();
                
                // Manual form filling only - automatic filling disabled
                console.log('📋 Session loaded - waiting for user to click "Fill Form Now" button');
            }
        } catch (error) {
            console.error('❌ Error checking automation mode:', error);
        }
    }

    showAutomationUI() {
        // Show automation controls
        const automationStatus = document.getElementById('automation-status');
        const startBtn = document.getElementById('start-automation-btn');
        const confirmBtn = document.getElementById('confirm-submission-btn');
        
        if (automationStatus) automationStatus.style.display = 'block';
        if (startBtn) startBtn.style.display = 'inline-block';
        if (confirmBtn) confirmBtn.style.display = 'inline-block';
    }

    async startAutomation() {
        if (!this.currentSessionId) {
            console.error('❌ No automation session active');
            return;
        }
        
        await this.startAutomatedFormFilling();
    }

    async startAutomatedFormFilling() {
        try {
            if (!this.formFiller) {
                console.error('❌ Form filler not available');
                return;
            }

            this.updateAutomationStatus('Analyzing form fields...', 10);
            
            // Initialize form filler with profile and session
            await this.formFiller.init(
                this.userProfile, 
                this.currentSessionId,
                (progress) => this.onFormFillingProgress(progress)
            );

            this.updateAutomationStatus('Filling form fields...', 30);
            
            // Start form filling
            const fillResult = await this.formFiller.fillForm();
            
            this.updateAutomationStatus('Form filled! Starting submission monitoring...', 80);
            
            // Start submission monitoring
            if (this.submissionMonitor) {
                await this.submissionMonitor.startMonitoring(
                    this.currentSessionId,
                    (progress) => this.onSubmissionProgress(progress)
                );
            }
            
            this.updateAutomationStatus('Waiting for submission...', 90);
            
            console.log('✅ Automated form filling completed:', fillResult);
            
            // Notify popup of successful form filling
            chrome.runtime.sendMessage({
                action: 'formFillComplete',
                success: true,
                message: 'Form filled successfully!'
            });
            
        } catch (error) {
            console.error('❌ Error in automated form filling:', error);
            this.updateAutomationStatus('Error occurred during automation', 0);
            
            // Notify popup of form filling error
            chrome.runtime.sendMessage({
                action: 'formFillError',
                success: false,
                error: error.message
            });
        }
    }

    onFormFillingProgress(progress) {
        const percentage = (progress.current / progress.total) * 60; // 60% of total progress
        this.updateAutomationStatus(
            `Filling field: ${progress.field} (${progress.current}/${progress.total})`,
            30 + percentage
        );
    }

    onSubmissionProgress(progress) {
        console.log('📊 Submission progress:', progress);
        
        switch (progress.status) {
            case 'monitoring':
                this.updateAutomationStatus('Monitoring for submission...', 90);
                break;
                
            case 'submitted':
                this.updateAutomationStatus('Submission detected! 🎉', 100);
                setTimeout(() => {
                    if (progress.status === 'next_job') {
                        this.updateAutomationStatus(`Moving to: ${progress.nextJob.job_title}`, 100);
                    } else if (progress.status === 'completed') {
                        this.updateAutomationStatus('All jobs completed! 🏁', 100);
                        this.automationCompleted();
                    }
                }, 2000);
                break;
                
            case 'next_job':
                this.updateAutomationStatus(`Moving to: ${progress.nextJob.job_title}`, 100);
                break;
                
            case 'completed':
                this.updateAutomationStatus('All jobs completed! 🏁', 100);
                this.automationCompleted();
                break;
                
            case 'stopped':
                this.updateAutomationStatus(`Monitoring stopped: ${progress.reason}`, 90);
                break;
        }
    }

    updateAutomationStatus(message, percentage) {
        const progressText = document.getElementById('progress-text');
        const progressFill = document.getElementById('progress-fill');
        
        if (progressText) progressText.textContent = message;
        if (progressFill) progressFill.style.width = `${percentage}%`;
    }

    async confirmSubmission() {
        if (this.submissionMonitor) {
            await this.submissionMonitor.confirmSubmission();
        }
    }

    automationCompleted() {
        // Clean up automation session
        this.currentSessionId = null;
        this.automationMode = false;
        
        // Clear session from storage
        chrome.storage.local.remove(['currentSessionId']);
        
        // Hide automation UI
        const automationStatus = document.getElementById('automation-status');
        if (automationStatus) {
            setTimeout(() => {
                automationStatus.style.display = 'none';
            }, 5000);
        }
    }

    // Progress Tracker Methods
    showProgressTracker() {
        this.progressActive = true; // Set flag to preserve state across UI re-renders
        const progressSection = document.getElementById('assistant-progress');
        if (progressSection) {
            progressSection.style.display = 'block';
            this.initProgressTracker();
        }
    }

    initProgressTracker() {
        const progressSteps = document.getElementById('progress-steps');
        const progressSummary = document.getElementById('progress-summary');
        
        if (progressSteps) {
            progressSteps.innerHTML = ''; // Clear existing steps
        }
        if (progressSummary) {
            progressSummary.textContent = 'Initializing automation...';
        }
    }

    addProgressStep(stepId, icon, text, subtext = '', status = 'active') {
        const progressSteps = document.getElementById('progress-steps');
        const startTime = Date.now();
        
        if (!progressSteps) return;

        // Check if step already exists
        let stepElement = document.getElementById(`step-${stepId}`);
        
        if (!stepElement) {
            // Create new step
            stepElement = document.createElement('div');
            stepElement.className = `progress-step ${status}`;
            stepElement.id = `step-${stepId}`;
            stepElement.dataset.startTime = startTime;
            
            stepElement.innerHTML = `
                <div class="step-icon">${icon}</div>
                <div class="step-content">
                    <div class="step-text">${text}</div>
                    <div class="step-subtext">${subtext}</div>
                </div>
                <div class="step-timing" id="timing-${stepId}">
                    ${status === 'active' ? '⏳' : ''}
                </div>
            `;
            
            progressSteps.appendChild(stepElement);
            
            // Auto-scroll to bottom
            progressSteps.scrollTop = progressSteps.scrollHeight;
        }
        
        return stepElement;
    }

    updateProgressStep(stepId, status, timing = '') {
        const stepElement = document.getElementById(`step-${stepId}`);
        const timingElement = document.getElementById(`timing-${stepId}`);
        
        if (!stepElement) return;
        
        // Remove old status classes and add new one
        stepElement.classList.remove('active', 'completed', 'error');
        stepElement.classList.add(status);
        
        // Update timing
        if (timingElement) {
            if (status === 'completed' && stepElement.dataset.startTime) {
                const duration = Date.now() - parseInt(stepElement.dataset.startTime);
                timingElement.textContent = `${(duration / 1000).toFixed(1)}s`;
            } else if (status === 'error') {
                timingElement.textContent = '❌';
            } else if (status === 'active') {
                timingElement.textContent = '⏳';
            }
        }
    }

    updateProgressSummary(text) {
        const progressSummary = document.getElementById('progress-summary');
        if (progressSummary) {
            progressSummary.textContent = text;
        }
    }

    hideProgressTracker() {
        this.progressActive = false; // Clear flag so future UI renders hide it
        const progressSection = document.getElementById('assistant-progress');
        if (progressSection) {
            progressSection.style.display = 'none';
        }
    }
}

// Initialize the assistant when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.jobApplicationAssistant = new JobApplicationAssistant();
    });
} else {
    window.jobApplicationAssistant = new JobApplicationAssistant();
}

} // End of duplicate prevention check