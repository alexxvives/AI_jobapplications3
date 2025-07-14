// AI Job Application Assistant - Popup Script (STATUS ONLY)

class PopupManager {
    constructor() {
        this.userProfile = null;
        this.stats = { filledCount: 0 };
        this.sessionData = null;
        
        this.init();
    }

    async init() {
        console.log('🔥 POPUP UPDATED: STATUS ONLY - NO PROFILE SETUP 🔥');
        
        // Load stored data
        await this.loadAutomationData();
        await this.loadStats();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Update UI
        this.updateUI();
        
        // Auto-refresh every 2 seconds
        setInterval(() => {
            this.loadAutomationData();
            this.updateUI();
        }, 2000);
    }

    async loadAutomationData() {
        try {
            // Check Chrome storage for automation data
            const result = await chrome.storage.local.get([
                'userProfile', 
                'currentSessionId', 
                'automationActive',
                'currentJob'
            ]);
            
            this.userProfile = result.userProfile;
            this.sessionData = {
                sessionId: result.currentSessionId,
                active: result.automationActive,
                currentJob: result.currentJob
            };
            
            console.log('Popup: Loaded automation data:', {
                hasProfile: !!this.userProfile,
                profileName: this.userProfile?.full_name,
                sessionId: this.sessionData?.sessionId,
                active: this.sessionData?.active
            });
            
        } catch (error) {
            console.error('Error loading automation data:', error);
        }
    }

    async loadStats() {
        try {
            const result = await chrome.storage.local.get(['stats']);
            this.stats = result.stats || { filledCount: 0 };
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    setupEventListeners() {
        // Clear automation data button
        document.getElementById('clear-data-btn')?.addEventListener('click', () => {
            this.clearAutomationData();
        });

        // Help and feedback
        document.getElementById('help-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openHelp();
        });

        document.getElementById('feedback-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openFeedback();
        });

        // Go to frontend button
        document.getElementById('frontend-btn')?.addEventListener('click', () => {
            chrome.tabs.create({
                url: 'http://localhost:3000'
            });
        });
    }

    updateUI() {
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        const filledCount = document.getElementById('filled-count');
        const profileInfo = document.getElementById('profile-info');
        const sessionInfo = document.getElementById('session-info');

        // Update filled count
        if (filledCount) {
            filledCount.textContent = this.stats.filledCount;
        }

        // Update profile status
        if (this.userProfile) {
            if (statusIndicator) statusIndicator.textContent = '✅';
            if (statusText) statusText.textContent = 'Profile Active';
            
            if (profileInfo) {
                profileInfo.innerHTML = `
                    <div class="profile-summary">
                        <div class="field">
                            <strong>Name:</strong> ${this.userProfile.full_name || 'Unknown'}
                        </div>
                        <div class="field">
                            <strong>Email:</strong> ${this.userProfile.email || 'Unknown'}
                        </div>
                    </div>
                `;
                profileInfo.style.display = 'block';
            }
        } else {
            if (statusIndicator) statusIndicator.textContent = '❌';
            if (statusText) statusText.textContent = 'No Active Profile';
            if (profileInfo) profileInfo.style.display = 'none';
        }

        // Update session status
        if (this.sessionData?.active && this.sessionData?.sessionId) {
            if (sessionInfo) {
                sessionInfo.innerHTML = `
                    <div class="session-summary">
                        <div class="field">
                            <strong>Session:</strong> ${this.sessionData.sessionId.substring(0, 8)}...
                        </div>
                        ${this.sessionData.currentJob ? `
                            <div class="field">
                                <strong>Current Job:</strong> ${this.sessionData.currentJob.title}
                            </div>
                            <div class="field">
                                <strong>Company:</strong> ${this.sessionData.currentJob.company}
                            </div>
                        ` : ''}
                        <div class="field status-active">
                            <strong>Status:</strong> ✅ Active
                        </div>
                    </div>
                `;
                sessionInfo.style.display = 'block';
            }
        } else {
            if (sessionInfo) {
                sessionInfo.innerHTML = `
                    <div class="session-summary">
                        <div class="field status-inactive">
                            <strong>Status:</strong> ❌ No Active Session
                        </div>
                        <div class="help-text">
                            Start automation from the frontend at localhost:3000
                        </div>
                    </div>
                `;
                sessionInfo.style.display = 'block';
            }
        }
    }

    async clearAutomationData() {
        if (confirm('Clear all automation data? This will stop any active sessions.')) {
            try {
                await chrome.storage.local.clear();
                
                this.userProfile = null;
                this.sessionData = null;
                this.stats = { filledCount: 0 };
                
                this.showMessage('All automation data cleared!', 'success');
                this.updateUI();
                
            } catch (error) {
                console.error('Error clearing data:', error);
                this.showMessage('Error clearing data. Please try again.', 'error');
            }
        }
    }

    showMessage(text, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());

        // Create new message
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = text;

        // Insert after header
        const header = document.querySelector('.popup-header');
        if (header) {
            header.insertAdjacentElement('afterend', message);
        }

        // Auto-remove after 3 seconds
        setTimeout(() => {
            message.remove();
        }, 3000);
    }

    openHelp() {
        chrome.tabs.create({
            url: 'https://github.com/anthropics/claude-code/issues'
        });
    }

    openFeedback() {
        chrome.tabs.create({
            url: 'https://github.com/anthropics/claude-code/issues'
        });
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'incrementFilledCount') {
        // Update stats when forms are filled
        chrome.storage.local.get(['stats']).then(result => {
            const stats = result.stats || { filledCount: 0 };
            stats.filledCount += request.count || 1;
            
            chrome.storage.local.set({ stats });
            const filledCountEl = document.getElementById('filled-count');
            if (filledCountEl) {
                filledCountEl.textContent = stats.filledCount;
            }
        });
    }
});