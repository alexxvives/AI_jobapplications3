// AI Job Application Assistant - Background Service Worker

class BackgroundService {
    constructor() {
        this.init();
    }

    init() {
        console.log('🚀 AI Job Application Assistant background service started');
        
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
        chrome.contextMenus.onClicked.addListener((info, tab) => {
            this.handleContextMenu(info, tab);
        });
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
}

// Initialize background service
new BackgroundService();