// AI Job Application Assistant - Background Service Worker

class BackgroundService {
    constructor() {
        this.init();
    }

    init() {
        console.log('🚀 AI Job Application Assistant background service started');
        console.log('🔥 DEBUG: UPDATED BACKGROUND SCRIPT 2025-01-13 - ENHANCED STORAGE DEBUGGING 🔥');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize storage if needed
        this.initializeStorage();
    }

    setupEventListeners() {
        // Extension installation/update
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstall(details);
        });

        // Messages from content scripts and popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Keep message channel open for async responses
        });

        // Tab updates to inject content script dynamically
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.handleTabUpdate(tabId, changeInfo, tab);
        });

        // Context menu for quick access
        if (chrome.contextMenus) {
            chrome.contextMenus.onClicked.addListener((info, tab) => {
                this.handleContextMenu(info, tab);
            });
        }
    }

    async handleInstall(details) {
        console.log('Extension installed/updated:', details.reason);
        
        if (details.reason === 'install') {
            // First time installation
            await this.showWelcomeMessage();
            await this.createContextMenus();
        } else if (details.reason === 'update') {
            // Extension updated
            console.log('Extension updated to version:', chrome.runtime.getManifest().version);
        }
    }

    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'openPopup':
                    await this.openPopup();
                    sendResponse({ success: true });
                    break;

                case 'getProfile':
                    const profile = await this.getStoredProfile();
                    sendResponse({ success: true, profile });
                    break;

                case 'saveProfile':
                    await this.saveProfile(request.profile);
                    sendResponse({ success: true });
                    break;

                case 'importFromBackend':
                    const result = await this.importProfileFromBackend(request.backendUrl, request.userId);
                    sendResponse(result);
                    break;

                case 'logFormFilling':
                    await this.logFormFillingActivity(request.data);
                    sendResponse({ success: true });
                    break;

                case 'getStats':
                    const stats = await this.getStats();
                    sendResponse({ success: true, stats });
                    break;

                case 'detectJobSite':
                    const isJobSite = await this.detectJobApplicationSite(request.url);
                    sendResponse({ success: true, isJobSite });
                    break;

                case 'createAutomationSession':
                    const sessionResult = await this.createAutomationSession(request.profileId, request.selectedJobs);
                    sendResponse(sessionResult);
                    break;

                case 'startAutomationSession':
                    const startResult = await this.startAutomationSession(request.sessionId);
                    sendResponse(startResult);
                    break;

                case 'START_AUTOMATION':
                    console.log('🚀 Received START_AUTOMATION message:', request);
                    const automationResult = await this.startWebAutomation(request.sessionId, request.profileId);
                    sendResponse(automationResult);
                    break;

                case 'getCurrentJob':
                    const currentJob = await this.getCurrentJob(request.sessionId);
                    sendResponse(currentJob);
                    break;

                case 'markFormFilled':
                    const fillResult = await this.markFormFilled(request.sessionId, request.formData);
                    sendResponse(fillResult);
                    break;

                case 'submitJobApplication':
                    const submitResult = await this.submitJobApplication(request.sessionId, request.success, request.errorMessage);
                    sendResponse(submitResult);
                    break;

                case 'getSessionStatus':
                    const statusResult = await this.getSessionStatus(request.sessionId);
                    sendResponse(statusResult);
                    break;

                case 'STORE_AUTOMATION_DATA':
                    await this.storeAutomationData(request.data);
                    sendResponse({ success: true });
                    break;

                case 'cancelAutomationSession':
                    const cancelResult = await this.cancelAutomationSession(request.sessionId);
                    sendResponse(cancelResult);
                    break;

                default:
                    console.warn('Unknown message action:', request.action);
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleTabUpdate(tabId, changeInfo, tab) {
        // Only act when the page is completely loaded
        if (changeInfo.status !== 'complete' || !tab.url) return;

        try {
            // Check if this is a job application site
            const isJobSite = await this.detectJobApplicationSite(tab.url);
            
            if (isJobSite) {
                console.log('🎯 Job application site detected:', tab.url);
                
                // Inject content script if not already injected
                await this.injectContentScript(tabId);
                
                // Show page action badge
                await this.showBadge(tabId);
            }
        } catch (error) {
            console.error('Error handling tab update:', error);
        }
    }

    async handleContextMenu(info, tab) {
        switch (info.menuItemId) {
            case 'fillApplication':
                await this.triggerFormFilling(tab);
                break;
            case 'openAssistant':
                await this.openPopup();
                break;
        }
    }

    async initializeStorage() {
        try {
            // Initialize default values if not present
            const defaults = {
                stats: { filledCount: 0, sitesUsed: [], lastUsed: null },
                settings: {
                    autoDetect: true,
                    showNotifications: true,
                    logActivity: true
                }
            };

            for (const [key, defaultValue] of Object.entries(defaults)) {
                const result = await chrome.storage.local.get([key]);
                if (!result[key]) {
                    await chrome.storage.local.set({ [key]: defaultValue });
                }
            }
        } catch (error) {
            console.error('Error initializing storage:', error);
        }
    }

    async showWelcomeMessage() {
        try {
            // Create a welcome tab or notification
            await chrome.tabs.create({
                url: chrome.runtime.getURL('welcome.html')
            });
        } catch (error) {
            console.error('Error showing welcome message:', error);
        }
    }

    async createContextMenus() {
        try {
            if (!chrome.contextMenus) {
                console.log('Context menus not available');
                return;
            }
            
            await chrome.contextMenus.removeAll();
            
            chrome.contextMenus.create({
                id: 'fillApplication',
                title: 'Fill Application Form',
                contexts: ['page'],
                documentUrlPatterns: [
                    'https://jobs.lever.co/*',
                    'https://boards.greenhouse.io/*',
                    'https://*.workday.com/*',
                    'https://*.bamboohr.com/*',
                    'https://*.smartrecruiters.com/*'
                ]
            });

            chrome.contextMenus.create({
                id: 'openAssistant',
                title: 'Open AI Job Assistant',
                contexts: ['page']
            });
        } catch (error) {
            console.error('Error creating context menus:', error);
        }
    }

    async openPopup() {
        try {
            // Get current window to position popup
            const windows = await chrome.windows.getAll({ populate: false });
            const currentWindow = windows.find(w => w.focused) || windows[0];
            
            // Open popup as a new window (since we can't programmatically open extension popup)
            await chrome.windows.create({
                url: chrome.runtime.getURL('popup.html'),
                type: 'popup',
                width: 420,
                height: 600,
                left: currentWindow.left + currentWindow.width - 440,
                top: currentWindow.top + 50
            });
        } catch (error) {
            console.error('Error opening popup:', error);
        }
    }

    async getStoredProfile() {
        try {
            const result = await chrome.storage.local.get(['userProfile']);
            return result.userProfile || null;
        } catch (error) {
            console.error('Error getting stored profile:', error);
            return null;
        }
    }

    async saveProfile(profile) {
        try {
            await chrome.storage.local.set({ userProfile: profile });
            console.log('✅ Profile saved to storage');
        } catch (error) {
            console.error('Error saving profile:', error);
            throw error;
        }
    }

    async importProfileFromBackend(backendUrl, userId) {
        try {
            console.log(`🔄 Importing profile from ${backendUrl} for user ${userId}`);
            
            const response = await fetch(`${backendUrl}/api/users/${userId}/profile`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Add timeout
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const profileData = await response.json();
            
            if (!profileData || !profileData.personal_information) {
                throw new Error('Invalid profile data received from backend');
            }

            // Save the imported profile
            await this.saveProfile(profileData);
            
            console.log('✅ Profile imported successfully');
            return { success: true, profile: profileData };

        } catch (error) {
            console.error('❌ Error importing profile:', error);
            return { success: false, error: error.message };
        }
    }

    async logFormFillingActivity(data) {
        try {
            // Update stats
            const result = await chrome.storage.local.get(['stats']);
            const stats = result.stats || { filledCount: 0, sitesUsed: [], lastUsed: null };
            
            stats.filledCount += data.fieldsCount || 1;
            stats.lastUsed = new Date().toISOString();
            
            // Track unique sites
            const siteDomain = new URL(data.url).hostname;
            if (!stats.sitesUsed.includes(siteDomain)) {
                stats.sitesUsed.push(siteDomain);
            }

            await chrome.storage.local.set({ stats });

            // Optionally log to backend analytics
            const settings = await chrome.storage.local.get(['settings']);
            if (settings.settings?.logActivity) {
                await this.sendAnalytics(data);
            }

        } catch (error) {
            console.error('Error logging form filling activity:', error);
        }
    }

    async sendAnalytics(data) {
        try {
            // Send anonymous analytics to backend (if configured)
            const profile = await this.getStoredProfile();
            if (!profile) return;

            // Extract backend URL from profile or use default
            const backendUrl = 'http://localhost:8000'; // Could be configurable
            
            await fetch(`${backendUrl}/api/analytics/form-fill`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    timestamp: new Date().toISOString(),
                    site: new URL(data.url).hostname,
                    fieldsCount: data.fieldsCount,
                    success: data.success
                }),
                signal: AbortSignal.timeout(5000)
            });
        } catch (error) {
            // Silently fail analytics - don't affect user experience
            console.debug('Analytics send failed (non-critical):', error);
        }
    }

    async getStats() {
        try {
            const result = await chrome.storage.local.get(['stats']);
            return result.stats || { filledCount: 0, sitesUsed: [], lastUsed: null };
        } catch (error) {
            console.error('Error getting stats:', error);
            return { filledCount: 0, sitesUsed: [], lastUsed: null };
        }
    }

    async detectJobApplicationSite(url) {
        try {
            // Define job site patterns
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

            return jobSitePatterns.some(pattern => url.includes(pattern));
        } catch (error) {
            console.error('Error detecting job site:', error);
            return false;
        }
    }

    async injectContentScript(tabId) {
        try {
            // Check if content script is already injected
            const results = await chrome.scripting.executeScript({
                target: { tabId },
                func: () => !!window.jobApplicationAssistant
            });

            if (results[0]?.result) {
                console.log('Content script already injected');
                return;
            }

            // Inject content script
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ['content.js']
            });

            // Inject CSS
            await chrome.scripting.insertCSS({
                target: { tabId },
                files: ['content.css']
            });

            console.log('✅ Content script injected into tab', tabId);

        } catch (error) {
            console.error('Error injecting content script:', error);
        }
    }

    async showBadge(tabId) {
        try {
            await chrome.action.setBadgeText({
                text: '✓',
                tabId: tabId
            });

            await chrome.action.setBadgeBackgroundColor({
                color: '#667eea',
                tabId: tabId
            });

            await chrome.action.setTitle({
                title: 'AI Job Assistant is active on this page',
                tabId: tabId
            });

        } catch (error) {
            console.error('Error showing badge:', error);
        }
    }

    async triggerFormFilling(tab) {
        try {
            // Send message to content script to start form filling
            await chrome.tabs.sendMessage(tab.id, {
                action: 'fillForm'
            });
        } catch (error) {
            console.error('Error triggering form filling:', error);
        }
    }

    // Automation Service Integration Methods
    async createAutomationSession(profileId, selectedJobs) {
        try {
            const backendUrl = await this.getBackendUrl();
            const authToken = await this.getAuthToken();
            
            if (!authToken) {
                return { success: false, error: 'Not authenticated. Please log in first.' };
            }
            
            const response = await fetch(`${backendUrl}/automation/sessions/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    profile_id: profileId,
                    selected_jobs: selectedJobs
                }),
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ Automation session created:', result.session_id);
            
            // Store session ID for later use
            await chrome.storage.local.set({ currentSessionId: result.session_id });
            
            return { success: true, sessionId: result.session_id };

        } catch (error) {
            console.error('❌ Error creating automation session:', error);
            return { success: false, error: error.message };
        }
    }

    async startAutomationSession(sessionId) {
        try {
            const backendUrl = await this.getBackendUrl();
            const authToken = await this.getAuthToken();
            
            const response = await fetch(`${backendUrl}/automation/sessions/${sessionId}/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ Automation session started:', result);
            
            return { success: true, data: result };

        } catch (error) {
            console.error('❌ Error starting automation session:', error);
            return { success: false, error: error.message };
        }
    }

    async startWebAutomation(sessionId, profileId) {
        try {
            console.log('🚀 Starting web automation for session:', sessionId);
            
            // Get the first job from the session
            const currentJobResult = await this.getCurrentJob(sessionId);
            if (!currentJobResult.success || !currentJobResult.data) {
                throw new Error('No jobs available in session');
            }
            
            const job = currentJobResult.data;
            console.log('📋 Opening job application:', job.job_title, 'at', job.company_name);
            
            // Open the job application URL in a new tab
            const tab = await chrome.tabs.create({
                url: job.job_url,
                active: true
            });
            
            console.log('✅ Job tab opened:', tab.id, job.job_url);
            
            return { 
                success: true, 
                message: 'Job application opened',
                tabId: tab.id,
                jobTitle: job.job_title,
                company: job.company_name
            };
            
        } catch (error) {
            console.error('❌ Error starting web automation:', error);
            return { success: false, error: error.message };
        }
    }

    async getCurrentJob(sessionId) {
        try {
            const backendUrl = await this.getBackendUrl();
            const authToken = await this.getAuthToken();
            
            const response = await fetch(`${backendUrl}/automation/sessions/${sessionId}/current-job`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return { success: true, data: result };

        } catch (error) {
            console.error('❌ Error getting current job:', error);
            return { success: false, error: error.message };
        }
    }

    async markFormFilled(sessionId, formData) {
        try {
            const backendUrl = await this.getBackendUrl();
            const authToken = await this.getAuthToken();
            
            const response = await fetch(`${backendUrl}/automation/sessions/${sessionId}/form-filled`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ form_data: formData }),
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ Form marked as filled:', result);
            
            return { success: true, data: result };

        } catch (error) {
            console.error('❌ Error marking form filled:', error);
            return { success: false, error: error.message };
        }
    }

    async submitJobApplication(sessionId, success = true, errorMessage = null) {
        try {
            const backendUrl = await this.getBackendUrl();
            const authToken = await this.getAuthToken();
            
            const response = await fetch(`${backendUrl}/automation/sessions/${sessionId}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ 
                    success: success,
                    error_message: errorMessage 
                }),
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ Job application submitted:', result);
            
            return { success: true, data: result };

        } catch (error) {
            console.error('❌ Error submitting job application:', error);
            return { success: false, error: error.message };
        }
    }

    async getSessionStatus(sessionId) {
        try {
            const backendUrl = await this.getBackendUrl();
            const authToken = await this.getAuthToken();
            
            const response = await fetch(`${backendUrl}/automation/sessions/${sessionId}/status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return { success: true, data: result };

        } catch (error) {
            console.error('❌ Error getting session status:', error);
            return { success: false, error: error.message };
        }
    }

    async cancelAutomationSession(sessionId) {
        try {
            const backendUrl = await this.getBackendUrl();
            const authToken = await this.getAuthToken();
            
            const response = await fetch(`${backendUrl}/automation/sessions/${sessionId}/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ Automation session cancelled:', result);
            
            // Clear stored session ID
            await chrome.storage.local.remove(['currentSessionId']);
            
            return { success: true, data: result };

        } catch (error) {
            console.error('❌ Error cancelling automation session:', error);
            return { success: false, error: error.message };
        }
    }

    async getBackendUrl() {
        try {
            const result = await chrome.storage.local.get(['backendUrl']);
            return result.backendUrl || 'http://localhost:8000';
        } catch (error) {
            console.error('Error getting backend URL:', error);
            return 'http://localhost:8000';
        }
    }

    async getAuthToken() {
        try {
            const result = await chrome.storage.local.get(['authToken']);
            return result.authToken || null;
        } catch (error) {
            console.error('Error getting auth token:', error);
            return null;
        }
    }

    async storeAutomationData(data) {
        try {
            console.log('📱 Background: Storing automation data:', data.userProfile?.full_name || data.userProfile?.email);
            console.log('📱 Background: Full data object:', {
                hasProfile: !!data.userProfile,
                profileKeys: data.userProfile ? Object.keys(data.userProfile) : [],
                sessionId: data.currentSessionId,
                active: data.automationActive,
                hasJob: !!data.currentJob
            });
            
            const storageData = {
                userProfile: data.userProfile,
                currentSessionId: data.currentSessionId,
                automationActive: data.automationActive,
                currentJob: data.currentJob
            };
            
            console.log('📱 Background: About to store:', storageData);
            await chrome.storage.local.set(storageData);
            
            // Verify storage worked
            const verification = await chrome.storage.local.get(['userProfile', 'currentSessionId', 'automationActive']);
            console.log('📱 Background: ✅ Automation data stored and verified:', {
                storedProfile: !!verification.userProfile,
                storedSession: !!verification.currentSessionId,
                storedActive: verification.automationActive,
                profileName: verification.userProfile?.full_name || verification.userProfile?.email
            });
            
            // Notify all tabs about the new automation data
            const tabs = await chrome.tabs.query({});
            console.log('📱 Background: Notifying', tabs.length, 'tabs about automation data');
            for (const tab of tabs) {
                try {
                    await chrome.tabs.sendMessage(tab.id, {
                        action: 'SET_AUTOMATION_DATA',
                        data: data
                    });
                    console.log('📱 Background: ✅ Notified tab', tab.id);
                } catch (error) {
                    console.log('📱 Background: ⚠️ Could not notify tab', tab.id, ':', error.message);
                }
            }
            
            return { success: true };
        } catch (error) {
            console.error('📱 Background: ❌ Error storing automation data:', error);
            return { success: false, error: error.message };
        }
    }
}

// Initialize background service
new BackgroundService();