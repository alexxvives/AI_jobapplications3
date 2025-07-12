// AI Job Application Assistant - Popup Script

class PopupManager {
    constructor() {
        this.userProfile = null;
        this.stats = { filledCount: 0 };
        
        this.init();
    }

    async init() {
        // Load stored data
        await this.loadUserProfile();
        await this.loadStats();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Update UI
        this.updateUI();
    }

    async loadUserProfile() {
        try {
            const result = await chrome.storage.local.get(['userProfile']);
            this.userProfile = result.userProfile;
        } catch (error) {
            console.error('Error loading user profile:', error);
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

    async saveUserProfile() {
        try {
            await chrome.storage.local.set({ userProfile: this.userProfile });
        } catch (error) {
            console.error('Error saving user profile:', error);
        }
    }

    async saveStats() {
        try {
            await chrome.storage.local.set({ stats: this.stats });
        } catch (error) {
            console.error('Error saving stats:', error);
        }
    }

    setupEventListeners() {
        // Profile setup
        document.getElementById('setup-profile-btn').addEventListener('click', () => {
            this.showProfileForm();
        });

        // Import profile
        document.getElementById('import-profile-btn').addEventListener('click', () => {
            this.showImportForm();
        });

        // Profile form actions
        document.getElementById('save-profile-btn').addEventListener('click', () => {
            this.saveProfile();
        });

        document.getElementById('cancel-profile-btn').addEventListener('click', () => {
            this.hideAllForms();
        });

        // Import form actions
        document.getElementById('import-btn').addEventListener('click', () => {
            this.importProfile();
        });

        document.getElementById('cancel-import-btn').addEventListener('click', () => {
            this.hideAllForms();
        });

        // Current profile actions
        document.getElementById('edit-profile-btn').addEventListener('click', () => {
            this.editProfile();
        });

        document.getElementById('clear-profile-btn').addEventListener('click', () => {
            this.clearProfile();
        });

        // Help and feedback
        document.getElementById('help-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.openHelp();
        });

        document.getElementById('feedback-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.openFeedback();
        });
    }

    updateUI() {
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        const filledCount = document.getElementById('filled-count');

        if (this.userProfile) {
            statusIndicator.textContent = '✅';
            statusText.textContent = 'Profile configured';
            this.showCurrentProfile();
        } else {
            statusIndicator.textContent = '❌';
            statusText.textContent = 'No profile configured';
            this.hideCurrentProfile();
        }

        filledCount.textContent = this.stats.filledCount;
    }

    showProfileForm() {
        this.hideAllForms();
        document.getElementById('profile-form').style.display = 'block';
        
        // Pre-fill form if editing
        if (this.userProfile) {
            this.populateProfileForm();
        }
    }

    showImportForm() {
        this.hideAllForms();
        document.getElementById('import-form').style.display = 'block';
    }

    showCurrentProfile() {
        document.getElementById('current-profile').style.display = 'block';
        this.populateProfileSummary();
    }

    hideCurrentProfile() {
        document.getElementById('current-profile').style.display = 'none';
    }

    hideAllForms() {
        document.getElementById('profile-form').style.display = 'none';
        document.getElementById('import-form').style.display = 'none';
    }

    populateProfileForm() {
        if (!this.userProfile) return;

        const personal = this.userProfile.personal_information || {};
        const workExp = this.userProfile.work_experience || [];
        const education = this.userProfile.education || [];
        const jobPrefs = this.userProfile.job_preferences || {};

        // Personal information
        this.setFieldValue('first-name', personal.first_name || '');
        this.setFieldValue('last-name', personal.last_name || '');
        this.setFieldValue('email', personal.email || '');
        this.setFieldValue('phone', personal.phone || '');
        this.setFieldValue('address', personal.address || '');
        this.setFieldValue('city', personal.city || '');
        this.setFieldValue('state', personal.state || '');
        this.setFieldValue('zip-code', personal.zip_code || '');
        this.setFieldValue('country', personal.country || '');

        // Work experience
        const currentJob = workExp.length > 0 ? workExp[0] : {};
        this.setFieldValue('current-title', currentJob.title || '');
        this.setFieldValue('current-company', currentJob.company || '');
        this.setFieldValue('experience-years', jobPrefs.total_experience || '');

        // Education
        const currentEducation = education.length > 0 ? education[0] : {};
        this.setFieldValue('degree', currentEducation.degree || '');
        this.setFieldValue('school', currentEducation.school || '');

        // Professional links
        this.setFieldValue('linkedin', jobPrefs.linkedin || '');
        this.setFieldValue('github', jobPrefs.github || '');
        this.setFieldValue('portfolio', jobPrefs.portfolio || '');

        // Preferences
        this.setFieldValue('notice-period', jobPrefs.notice_period || '');
        this.setFieldValue('willing-relocate', jobPrefs.willing_to_relocate || '');
        this.setFieldValue('visa-status', jobPrefs.visa_requirement || '');
    }

    populateProfileSummary() {
        if (!this.userProfile) return;

        const personal = this.userProfile.personal_information || {};
        const workExp = this.userProfile.work_experience || [];
        const education = this.userProfile.education || [];
        const jobPrefs = this.userProfile.job_preferences || {};

        const currentJob = workExp.length > 0 ? workExp[0] : {};
        const currentEducation = education.length > 0 ? education[0] : {};

        const summaryEl = document.getElementById('profile-summary');
        summaryEl.innerHTML = `
            ${this.createProfileField('Name', `${personal.first_name || ''} ${personal.last_name || ''}`.trim())}
            ${this.createProfileField('Email', personal.email)}
            ${this.createProfileField('Phone', personal.phone)}
            ${this.createProfileField('Location', `${personal.city || ''}, ${personal.state || ''}`.replace(', ,', ',').trim())}
            ${this.createProfileField('Current Position', currentJob.title)}
            ${this.createProfileField('Current Company', currentJob.company)}
            ${this.createProfileField('Education', currentEducation.degree)}
            ${this.createProfileField('School', currentEducation.school)}
            ${this.createProfileField('Experience', jobPrefs.total_experience)}
            ${this.createProfileField('LinkedIn', jobPrefs.linkedin)}
        `;
    }

    createProfileField(label, value) {
        if (!value) return '';
        
        return `
            <div class="profile-field">
                <span class="field-label">${label}:</span>
                <span class="field-value">${value}</span>
            </div>
        `;
    }

    setFieldValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value;
        }
    }

    getFieldValue(fieldId) {
        const field = document.getElementById(fieldId);
        return field ? field.value.trim() : '';
    }

    async saveProfile() {
        try {
            this.showLoading(true);

            // Validate required fields
            const firstName = this.getFieldValue('first-name');
            const lastName = this.getFieldValue('last-name');
            const email = this.getFieldValue('email');

            if (!firstName || !lastName || !email) {
                this.showMessage('Please fill in all required fields (marked with *)', 'error');
                this.showLoading(false);
                return;
            }

            // Build profile object
            this.userProfile = {
                personal_information: {
                    first_name: firstName,
                    last_name: lastName,
                    full_name: `${firstName} ${lastName}`,
                    email: email,
                    phone: this.getFieldValue('phone'),
                    address: this.getFieldValue('address'),
                    city: this.getFieldValue('city'),
                    state: this.getFieldValue('state'),
                    zip_code: this.getFieldValue('zip-code'),
                    country: this.getFieldValue('country')
                },
                work_experience: [{
                    title: this.getFieldValue('current-title'),
                    company: this.getFieldValue('current-company'),
                    location: '',
                    start_date: '',
                    end_date: null,
                    description: ''
                }],
                education: [{
                    degree: this.getFieldValue('degree'),
                    school: this.getFieldValue('school'),
                    start_date: '',
                    end_date: '',
                    gpa: ''
                }],
                skills: [],
                languages: [],
                job_preferences: {
                    linkedin: this.getFieldValue('linkedin'),
                    github: this.getFieldValue('github'),
                    portfolio: this.getFieldValue('portfolio'),
                    notice_period: this.getFieldValue('notice-period'),
                    total_experience: this.getFieldValue('experience-years'),
                    willing_to_relocate: this.getFieldValue('willing-relocate'),
                    visa_requirement: this.getFieldValue('visa-status')
                },
                achievements: [],
                certificates: []
            };

            // Save to storage
            await this.saveUserProfile();

            this.showMessage('Profile saved successfully!', 'success');
            this.hideAllForms();
            this.updateUI();

        } catch (error) {
            console.error('Error saving profile:', error);
            this.showMessage('Error saving profile. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async importProfile() {
        try {
            this.showLoading(true);

            const backendUrl = this.getFieldValue('backend-url');
            const userId = this.getFieldValue('user-id');

            if (!backendUrl || !userId) {
                this.showMessage('Please enter both Backend URL and User ID', 'error');
                this.showLoading(false);
                return;
            }

            // Fetch profile from backend
            const response = await fetch(`${backendUrl}/api/users/${userId}/profile`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const profileData = await response.json();
            
            if (profileData && profileData.personal_information) {
                this.userProfile = profileData;
                await this.saveUserProfile();
                
                this.showMessage('Profile imported successfully!', 'success');
                this.hideAllForms();
                this.updateUI();
            } else {
                throw new Error('Invalid profile data received');
            }

        } catch (error) {
            console.error('Error importing profile:', error);
            this.showMessage(`Import failed: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    editProfile() {
        this.showProfileForm();
    }

    async clearProfile() {
        if (confirm('Are you sure you want to clear your profile? This action cannot be undone.')) {
            try {
                this.userProfile = null;
                await chrome.storage.local.remove(['userProfile']);
                
                this.showMessage('Profile cleared successfully!', 'success');
                this.updateUI();
            } catch (error) {
                console.error('Error clearing profile:', error);
                this.showMessage('Error clearing profile. Please try again.', 'error');
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
        header.insertAdjacentElement('afterend', message);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            message.remove();
        }, 5000);
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        overlay.style.display = show ? 'flex' : 'none';
    }

    openHelp() {
        chrome.tabs.create({
            url: 'https://github.com/yourusername/ai-job-assistant/wiki'
        });
    }

    openFeedback() {
        chrome.tabs.create({
            url: 'https://github.com/yourusername/ai-job-assistant/issues'
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
            document.getElementById('filled-count').textContent = stats.filledCount;
        });
    }
});