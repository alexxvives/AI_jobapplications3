// Job Application Submission Monitor
// Detects when users submit applications and updates automation session

class SubmissionMonitor {
    constructor() {
        this.isMonitoring = false;
        this.sessionId = null;
        this.submissionDetected = false;
        this.monitoringStartTime = null;
        this.observers = [];
        this.submissionPatterns = [];
        this.progressCallback = null;
        
        this.initSubmissionPatterns();
        console.log('👁️ Submission Monitor initialized');
    }

    initSubmissionPatterns() {
        // Common patterns that indicate successful submission
        this.submissionPatterns = [
            // Success messages
            {
                type: 'text',
                patterns: [
                    'application submitted',
                    'thank you for applying',
                    'application received',
                    'we have received your application',
                    'your application is being reviewed',
                    'successfully submitted',
                    'application complete',
                    'thanks for your interest',
                    'we will review your application',
                    'application confirmation',
                    'submission successful'
                ],
                confidence: 0.9
            },
            
            // URL changes indicating success
            {
                type: 'url',
                patterns: [
                    '/thank-you',
                    '/success',
                    '/confirmation',
                    '/submitted',
                    '/complete',
                    '/application-received',
                    '/thank_you',
                    'success=true',
                    'submitted=true'
                ],
                confidence: 0.85
            },
            
            // Page title changes
            {
                type: 'title',
                patterns: [
                    'application submitted',
                    'thank you',
                    'confirmation',
                    'success',
                    'application received'
                ],
                confidence: 0.8
            },
            
            // DOM elements appearing
            {
                type: 'element',
                selectors: [
                    '.success-message',
                    '.confirmation-message',
                    '.submission-success',
                    '.thank-you-message',
                    '[data-testid*="success"]',
                    '[data-testid*="confirmation"]',
                    '.alert-success',
                    '.success-alert'
                ],
                confidence: 0.85
            }
        ];
    }

    async startMonitoring(sessionId, progressCallback = null) {
        if (this.isMonitoring) {
            console.log('⚠️ Already monitoring for submission');
            return;
        }

        this.sessionId = sessionId;
        this.progressCallback = progressCallback;
        this.isMonitoring = true;
        this.submissionDetected = false;
        this.monitoringStartTime = Date.now();

        console.log(`👁️ Starting submission monitoring for session: ${sessionId}`);

        // Set up various monitoring methods
        await this.setupDOMObserver();
        await this.setupURLMonitor();
        await this.setupFormSubmitListener();
        await this.setupNetworkMonitor();
        
        // Notify progress
        if (this.progressCallback) {
            this.progressCallback({
                status: 'monitoring',
                message: 'Monitoring for application submission...',
                startTime: this.monitoringStartTime
            });
        }

        // Start periodic checks
        this.startPeriodicChecks();
    }

    async setupDOMObserver() {
        // Observe DOM changes for success messages
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.checkElementForSubmission(node);
                        }
                    });
                }
                
                if (mutation.type === 'attributes' && mutation.target.nodeType === Node.ELEMENT_NODE) {
                    this.checkElementForSubmission(mutation.target);
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'id', 'data-testid']
        });

        this.observers.push(observer);
    }

    async setupURLMonitor() {
        // Monitor URL changes (for SPAs)
        let currentURL = window.location.href;
        
        const checkURL = () => {
            if (window.location.href !== currentURL) {
                currentURL = window.location.href;
                this.checkURLForSubmission(currentURL);
            }
        };

        // Check every 500ms
        const urlInterval = setInterval(checkURL, 500);
        this.observers.push({ disconnect: () => clearInterval(urlInterval) });

        // Also listen to popstate events
        const popstateHandler = () => this.checkURLForSubmission(window.location.href);
        window.addEventListener('popstate', popstateHandler);
        this.observers.push({ disconnect: () => window.removeEventListener('popstate', popstateHandler) });
    }

    async setupFormSubmitListener() {
        // Listen for form submissions
        const forms = document.querySelectorAll('form');
        
        const submitHandler = async (event) => {
            console.log('📝 Form submit detected');
            
            // Wait a bit for the submission to process
            setTimeout(() => {
                this.checkForSubmissionIndicators();
            }, 2000);
            
            // Check again after longer delay
            setTimeout(() => {
                this.checkForSubmissionIndicators();
            }, 5000);
        };

        forms.forEach(form => {
            form.addEventListener('submit', submitHandler);
        });

        // Also listen for button clicks (some sites use JS instead of form submit)
        const submitButtons = document.querySelectorAll(
            'button[type="submit"], input[type="submit"], .submit-btn, .apply-btn, [data-testid*="submit"]'
        );
        
        submitButtons.forEach(button => {
            button.addEventListener('click', submitHandler);
        });
    }

    async setupNetworkMonitor() {
        // Monitor network requests for submission endpoints
        // This is limited in content scripts, but we can try to detect common patterns
        
        // Override fetch to monitor API calls
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const response = await originalFetch(...args);
            
            // Check if this looks like a submission endpoint
            const url = args[0];
            if (typeof url === 'string' && this.looksLikeSubmissionEndpoint(url)) {
                console.log('🌐 Possible submission API call detected:', url);
                
                if (response.ok) {
                    setTimeout(() => {
                        this.checkForSubmissionIndicators();
                    }, 1000);
                }
            }
            
            return response;
        };
    }

    looksLikeSubmissionEndpoint(url) {
        const submissionKeywords = [
            '/submit', '/apply', '/send', '/create-application',
            '/job-application', '/candidate', '/applicant'
        ];
        
        return submissionKeywords.some(keyword => url.toLowerCase().includes(keyword));
    }

    startPeriodicChecks() {
        // Periodic checks every 3 seconds
        const interval = setInterval(() => {
            if (!this.isMonitoring) {
                clearInterval(interval);
                return;
            }
            
            this.checkForSubmissionIndicators();
            this.checkDocumentTitle();
            
            // Stop monitoring after 10 minutes (timeout)
            if (Date.now() - this.monitoringStartTime > 600000) {
                console.log('⏱️ Submission monitoring timed out');
                this.stopMonitoring('timeout');
            }
            
        }, 3000);
    }

    async checkForSubmissionIndicators() {
        if (this.submissionDetected) return;
        
        // Check for text patterns
        const bodyText = document.body.textContent.toLowerCase();
        const textPatterns = this.submissionPatterns.find(p => p.type === 'text');
        
        for (const pattern of textPatterns.patterns) {
            if (bodyText.includes(pattern)) {
                console.log(`✅ Submission detected via text pattern: "${pattern}"`);
                await this.handleSubmissionDetected('text_pattern', pattern, textPatterns.confidence);
                return;
            }
        }
        
        // Check for success elements
        const elementPatterns = this.submissionPatterns.find(p => p.type === 'element');
        
        for (const selector of elementPatterns.selectors) {
            const element = document.querySelector(selector);
            if (element && this.isElementVisible(element)) {
                console.log(`✅ Submission detected via element: "${selector}"`);
                await this.handleSubmissionDetected('element', selector, elementPatterns.confidence);
                return;
            }
        }
    }

    checkURLForSubmission(url) {
        if (this.submissionDetected) return;
        
        const urlPatterns = this.submissionPatterns.find(p => p.type === 'url');
        
        for (const pattern of urlPatterns.patterns) {
            if (url.toLowerCase().includes(pattern)) {
                console.log(`✅ Submission detected via URL change: "${pattern}"`);
                this.handleSubmissionDetected('url_change', pattern, urlPatterns.confidence);
                return;
            }
        }
    }

    checkDocumentTitle() {
        if (this.submissionDetected) return;
        
        const title = document.title.toLowerCase();
        const titlePatterns = this.submissionPatterns.find(p => p.type === 'title');
        
        for (const pattern of titlePatterns.patterns) {
            if (title.includes(pattern)) {
                console.log(`✅ Submission detected via title change: "${pattern}"`);
                this.handleSubmissionDetected('title_change', pattern, titlePatterns.confidence);
                return;
            }
        }
    }

    checkElementForSubmission(element) {
        if (this.submissionDetected) return;
        
        const elementText = element.textContent?.toLowerCase() || '';
        const elementClass = element.className?.toLowerCase() || '';
        const elementId = element.id?.toLowerCase() || '';
        
        const textPatterns = this.submissionPatterns.find(p => p.type === 'text');
        
        for (const pattern of textPatterns.patterns) {
            if (elementText.includes(pattern) || elementClass.includes(pattern.replace(/\s+/g, '-')) || elementId.includes(pattern.replace(/\s+/g, '-'))) {
                if (this.isElementVisible(element)) {
                    console.log(`✅ Submission detected via new element: "${pattern}"`);
                    this.handleSubmissionDetected('new_element', pattern, textPatterns.confidence);
                    return;
                }
            }
        }
    }

    isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        
        return rect.width > 0 && 
               rect.height > 0 && 
               style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0';
    }

    async handleSubmissionDetected(method, pattern, confidence) {
        if (this.submissionDetected) return;
        
        this.submissionDetected = true;
        console.log(`🎉 Application submission detected! Method: ${method}, Pattern: ${pattern}, Confidence: ${confidence}`);
        
        // Notify progress callback
        if (this.progressCallback) {
            this.progressCallback({
                status: 'submitted',
                method: method,
                pattern: pattern,
                confidence: confidence,
                message: 'Application submission detected!'
            });
        }

        // Notify the automation session
        if (this.sessionId) {
            try {
                const response = await chrome.runtime.sendMessage({
                    action: 'submitJobApplication',
                    sessionId: this.sessionId,
                    success: true,
                    errorMessage: null
                });

                if (response.success) {
                    console.log('✅ Automation session updated with submission');
                    
                    // Check if there's a next job
                    if (response.data.status === 'next_job_ready') {
                        console.log('🔄 Moving to next job:', response.data.current_job.job_title);
                        
                        if (this.progressCallback) {
                            this.progressCallback({
                                status: 'next_job',
                                nextJob: response.data.current_job,
                                progress: response.data.progress,
                                message: `Moving to next job: ${response.data.current_job.job_title}`
                            });
                        }
                        
                        // Navigate to next job URL
                        setTimeout(() => {
                            window.location.href = response.data.job_url;
                        }, 2000);
                        
                    } else if (response.data.status === 'session_completed') {
                        console.log('🏁 All jobs completed!');
                        
                        if (this.progressCallback) {
                            this.progressCallback({
                                status: 'completed',
                                summary: response.data.summary,
                                message: `All jobs completed! ${response.data.summary.completed} successful, ${response.data.summary.failed} failed.`
                            });
                        }
                    }
                } else {
                    console.error('❌ Failed to update automation session:', response.error);
                }
            } catch (error) {
                console.error('❌ Error updating automation session:', error);
            }
        }

        // Stop monitoring
        this.stopMonitoring('success');
    }

    stopMonitoring(reason = 'manual') {
        if (!this.isMonitoring) return;
        
        console.log(`🛑 Stopping submission monitoring. Reason: ${reason}`);
        
        this.isMonitoring = false;
        
        // Disconnect all observers
        this.observers.forEach(observer => {
            if (observer && typeof observer.disconnect === 'function') {
                observer.disconnect();
            }
        });
        this.observers = [];
        
        // Restore original fetch if we modified it
        // (In a real implementation, we'd store and restore the original)
        
        if (this.progressCallback) {
            this.progressCallback({
                status: 'stopped',
                reason: reason,
                message: `Monitoring stopped: ${reason}`
            });
        }
    }

    // Manual submission confirmation (for cases where auto-detection fails)
    async confirmSubmission() {
        if (!this.submissionDetected) {
            console.log('👆 Manual submission confirmation');
            await this.handleSubmissionDetected('manual', 'user_confirmed', 1.0);
        }
    }

    // Get current monitoring status
    getStatus() {
        return {
            isMonitoring: this.isMonitoring,
            submissionDetected: this.submissionDetected,
            sessionId: this.sessionId,
            monitoringTime: this.monitoringStartTime ? Date.now() - this.monitoringStartTime : 0
        };
    }
}

// Export for use in content scripts
window.SubmissionMonitor = SubmissionMonitor;