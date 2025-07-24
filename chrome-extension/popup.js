// AI Job Application Assistant - Modern Popup Manager

class PopupManager {
    constructor() {
        this.userProfile = null;
        this.stats = { filledCount: 0, successRate: 100 };
        this.sessionData = null;
        this.jobQueue = [];
        this.currentJobIndex = 0;
        
        this.init();
    }

    async init() {
        console.log('🚀 AI Job Assistant Popup - Professional UI v2.0');
        
        // Load stored data
        await this.loadAutomationData();
        await this.loadStats();
        await this.loadJobQueue();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Update UI
        this.updateUI();
        
        // Auto-refresh every 2 seconds
        setInterval(() => {
            this.loadAutomationData();
            this.loadJobQueue();
            this.updateUI();
        }, 2000);
    }

    async loadAutomationData() {
        try {
            const result = await chrome.storage.local.get([
                'userProfile', 
                'currentSessionId', 
                'automationActive',
                'currentJob',
                'aiThinking',
                'aiThinkingStatus',
                'formReady'
            ]);
            
            this.userProfile = result.userProfile;
            this.sessionData = {
                sessionId: result.currentSessionId,
                active: result.automationActive,
                currentJob: result.currentJob,
                aiThinking: result.aiThinking || false,
                aiThinkingStatus: result.aiThinkingStatus || 'Processing with Ollama',
                formReady: result.formReady || false
            };
            
        } catch (error) {
            console.error('Error loading automation data:', error);
        }
    }

    async loadJobQueue() {
        try {
            const result = await chrome.storage.local.get(['jobQueue', 'currentJobIndex']);
            this.jobQueue = result.jobQueue || [];
            this.currentJobIndex = result.currentJobIndex || 0;
        } catch (error) {
            console.error('Error loading job queue:', error);
        }
    }

    async loadStats() {
        try {
            const result = await chrome.storage.local.get(['stats']);
            this.stats = result.stats || { filledCount: 0, successRate: 100 };
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    setupEventListeners() {
        // Form filling button
        document.getElementById('fill-form-btn')?.addEventListener('click', () => {
            this.startFormFilling();
        });

        // Next job button
        document.getElementById('next-job-btn')?.addEventListener('click', () => {
            this.goToNextJob();
        });

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

    async startFormFilling() {
        try {
            console.log('🎯 User clicked Fill Form Now - starting form automation');
            
            // Disable the button and show loading state
            const fillBtn = document.getElementById('fill-form-btn');
            fillBtn.disabled = true;
            fillBtn.innerHTML = '<span class="btn-icon">⏳</span>Processing...';
            
            // Update form status
            const formStatus = document.getElementById('form-status');
            formStatus.textContent = 'AI is filling form...';
            formStatus.style.color = '#f59e0b';
            
            // Send message to content script to start form filling
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            chrome.tabs.sendMessage(tab.id, {
                action: 'START_FORM_FILLING'
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Error sending form fill message:', chrome.runtime.lastError);
                    this.resetFormButton();
                } else {
                    console.log('Form filling started:', response);
                }
            });
            
        } catch (error) {
            console.error('Error starting form filling:', error);
            this.resetFormButton();
        }
    }

    async goToNextJob() {
        try {
            console.log('⏭️ User clicked Next Job - moving to next application');
            
            if (this.currentJobIndex < this.jobQueue.length - 1) {
                this.currentJobIndex++;
                
                // Store updated index
                await chrome.storage.local.set({ currentJobIndex: this.currentJobIndex });
                
                // Get next job URL and navigate
                const nextJob = this.jobQueue[this.currentJobIndex];
                if (nextJob && nextJob.link) {
                    chrome.tabs.create({ url: nextJob.link });
                }
                
                this.updateUI();
            } else {
                // No more jobs
                this.showMessage('No more jobs in queue!', 'info');
            }
            
        } catch (error) {
            console.error('Error going to next job:', error);
        }
    }

    resetFormButton() {
        const fillBtn = document.getElementById('fill-form-btn');
        const formStatus = document.getElementById('form-status');
        
        fillBtn.disabled = false;
        fillBtn.innerHTML = '<span class="btn-icon">✨</span>Fill Form Now';
        formStatus.textContent = 'Ready to fill';
        formStatus.style.color = '#10b981';
    }

    updateUI() {
        this.updateProfileCard();
        this.updateJobQueueCard();
        this.updateFormControls();
        this.updateStats();
        this.updateAIThinking();
    }

    updateProfileCard() {
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        const profileDetails = document.getElementById('profile-details');

        if (this.userProfile) {
            statusIndicator.textContent = '✅';
            statusText.textContent = 'Profile Active';
            profileDetails.textContent = `${this.userProfile.full_name} • ${this.userProfile.email}`;
        } else {
            statusIndicator.textContent = '❌';
            statusText.textContent = 'No Active Profile';
            profileDetails.textContent = 'Open dashboard to upload resume';
        }
    }

    updateJobQueueCard() {
        const jobQueueCard = document.getElementById('job-queue-card');
        const queueStats = document.getElementById('queue-stats');
        const currentJobDiv = document.getElementById('current-job');
        const nextJobDiv = document.getElementById('next-job');

        if (this.jobQueue.length > 0) {
            jobQueueCard.style.display = 'block';
            
            const remainingJobs = this.jobQueue.length - this.currentJobIndex;
            queueStats.textContent = `${remainingJobs} jobs remaining`;

            // Current job
            const currentJob = this.jobQueue[this.currentJobIndex];
            if (currentJob) {
                currentJobDiv.style.display = 'block';
                document.getElementById('current-job-title').textContent = currentJob.title;
                document.getElementById('current-job-company').textContent = currentJob.company;
            } else {
                currentJobDiv.style.display = 'none';
            }

            // Next job
            const nextJob = this.jobQueue[this.currentJobIndex + 1];
            if (nextJob) {
                nextJobDiv.style.display = 'block';
                document.getElementById('next-job-title').textContent = nextJob.title;
                document.getElementById('next-job-company').textContent = nextJob.company;
            } else {
                nextJobDiv.style.display = 'none';
            }
        } else {
            jobQueueCard.style.display = 'none';
        }
    }

    updateFormControls() {
        const formControls = document.getElementById('form-controls');
        const nextJobBtn = document.getElementById('next-job-btn');
        
        // Show form controls only if we're on a job application page
        const isJobPage = window.location.href.includes('apply') || 
                          window.location.href.includes('jobs') ||
                          this.sessionData?.formReady;
        
        if (this.userProfile && (this.jobQueue.length > 0 || isJobPage)) {
            formControls.style.display = 'block';
            
            // Show Next Job button only if there are more jobs
            if (this.currentJobIndex < this.jobQueue.length - 1) {
                nextJobBtn.style.display = 'block';
            } else {
                nextJobBtn.style.display = 'none';
            }
        } else {
            formControls.style.display = 'none';
        }
    }

    updateStats() {
        document.getElementById('filled-count').textContent = this.stats.filledCount;
        document.getElementById('success-rate').textContent = `${this.stats.successRate}%`;
    }

    updateAIThinking() {
        const aiThinking = document.getElementById('ai-thinking');
        const thinkingSubtext = document.getElementById('thinking-subtext');

        if (this.sessionData?.aiThinking) {
            aiThinking.style.display = 'block';
            if (thinkingSubtext) {
                thinkingSubtext.textContent = this.sessionData.aiThinkingStatus;
            }
        } else {
            aiThinking.style.display = 'none';
        }
    }

    async clearAutomationData() {
        if (confirm('Reset automation session? This will clear all data and stop any active processes.')) {
            try {
                await chrome.storage.local.clear();
                
                this.userProfile = null;
                this.sessionData = null;
                this.jobQueue = [];
                this.currentJobIndex = 0;
                this.stats = { filledCount: 0, successRate: 100 };
                
                this.showMessage('Session reset successfully!', 'success');
                this.updateUI();
                
            } catch (error) {
                console.error('Error clearing data:', error);
                this.showMessage('Error resetting session. Please try again.', 'error');
            }
        }
    }

    showMessage(text, type) {
        // Create temporary message notification
        const message = document.createElement('div');
        message.className = `popup-message ${type}`;
        message.style.cssText = `
            position: fixed;
            top: 60px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        `;
        message.textContent = text;

        document.body.appendChild(message);

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

    // Progress Tracker Methods (preserved for compatibility)
    initProgressTracker() {
        const progressTracker = document.getElementById('progress-tracker');
        const progressSteps = document.getElementById('progress-steps');
        const progressSummary = document.getElementById('progress-summary');
        
        if (progressTracker) {
            progressTracker.style.display = 'block';
            progressSteps.innerHTML = '';
            progressSummary.textContent = 'Initializing automation...';
        }
    }

    addProgressStep(stepId, icon, text, subtext = '', status = 'active') {
        const progressSteps = document.getElementById('progress-steps');
        const startTime = Date.now();
        
        if (!progressSteps) return;

        let stepElement = document.getElementById(`step-${stepId}`);
        
        if (!stepElement) {
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
            progressSteps.scrollTop = progressSteps.scrollHeight;
        }
        
        return stepElement;
    }

    updateProgressStep(stepId, status, timing = '') {
        const stepElement = document.getElementById(`step-${stepId}`);
        const timingElement = document.getElementById(`timing-${stepId}`);
        
        if (!stepElement) return;
        
        stepElement.classList.remove('active', 'completed', 'error');
        stepElement.classList.add(status);
        
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

    showProgressTracker() {
        const progressTracker = document.getElementById('progress-tracker');
        const aiThinking = document.getElementById('ai-thinking');
        
        if (progressTracker) {
            progressTracker.style.display = 'block';
        }
        
        if (aiThinking) {
            aiThinking.style.display = 'none';
        }
    }

    hideProgressTracker() {
        const progressTracker = document.getElementById('progress-tracker');
        if (progressTracker) {
            progressTracker.style.display = 'none';
        }
    }
}

// Global popup manager instance
let popupManager;

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    popupManager = new PopupManager();
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'incrementFilledCount') {
        chrome.storage.local.get(['stats']).then(result => {
            const stats = result.stats || { filledCount: 0, successRate: 100 };
            stats.filledCount += request.count || 1;
            
            chrome.storage.local.set({ stats });
            if (popupManager) {
                popupManager.stats = stats;
                popupManager.updateStats();
            }
        });
    }
    
    if (request.action === 'formFillComplete') {
        if (popupManager) {
            popupManager.resetFormButton();
            popupManager.showMessage('Form filled successfully!', 'success');
        }
    }
    
    if (request.action === 'formFillError') {
        if (popupManager) {
            popupManager.resetFormButton();
            popupManager.showMessage('Form filling failed. Please try again.', 'error');
        }
    }
    
    // Handle progress tracker updates
    if (request.action === 'showProgressTracker' && popupManager) {
        popupManager.showProgressTracker();
        popupManager.initProgressTracker();
    }
    
    if (request.action === 'addProgressStep' && popupManager) {
        popupManager.addProgressStep(
            request.stepId,
            request.icon,
            request.text,
            request.subtext,
            request.status
        );
    }
    
    if (request.action === 'updateProgressStep' && popupManager) {
        popupManager.updateProgressStep(
            request.stepId,
            request.status,
            request.timing
        );
    }
    
    if (request.action === 'updateProgressSummary' && popupManager) {
        popupManager.updateProgressSummary(request.text);
    }
    
    if (request.action === 'hideProgressTracker' && popupManager) {
        popupManager.hideProgressTracker();
    }
});