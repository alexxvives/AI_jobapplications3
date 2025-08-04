// Web Bridge - Content Script for Frontend Communication
// This runs on localhost:3000 to bridge communication between frontend and Chrome storage

// Web bridge ready

// Listen for messages from the frontend React app
window.addEventListener('message', async (event) => {
    // Only accept messages from our frontend
    if (!event.origin.includes('localhost:3000') && !event.origin.includes('localhost:3001')) {
        return;
    }
    
    if (event.data.type === 'CHROME_EXTENSION_MESSAGE' && event.data.action === 'STORE_AUTOMATION_DATA') {
        
        // Log profile info
        if (event.data.data?.userProfile) {
            const profile = event.data.data.userProfile;
            const firstName = profile.personal_information?.basic_information?.first_name;
            const lastName = profile.personal_information?.basic_information?.last_name;
            console.log('✅ Profile loaded:', firstName, lastName);
        }
        
        try {
            const automationData = event.data.data;
            
            // Store in Chrome storage (this works because we're in extension context)
            const storageData = {
                userProfile: automationData.userProfile,
                currentSessionId: automationData.currentSessionId,
                automationActive: automationData.automationActive || true,
                currentJob: automationData.currentJob
            };
            
            if (chrome && chrome.storage && chrome.storage.local) {
                await chrome.storage.local.set(storageData);
                console.log('✅ Automation data stored in Chrome storage');
            } else {
                localStorage.setItem('chromeExtensionAutomationData', JSON.stringify(storageData));
                console.log('⚠️ Using localStorage fallback (Chrome storage not available)');
            }
            
            // Notify background script
            if (chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({
                    action: 'STORE_AUTOMATION_DATA',
                    data: automationData
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log('⚠️ Background message error:', chrome.runtime.lastError.message);
                    } else {
                        console.log('✅ Background script notified');
                    }
                });
            }
            
        } catch (error) {
            console.error('❌ Error storing automation data:', error);
        }
    }
});

// Also listen for Chrome runtime messages from background
if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('🌉 Chrome runtime message:', request);
        
        if (request.action === 'PING') {
            console.log('🌉 Responding to ping from background');
            sendResponse({ success: true, location: window.location.href });
        }
        
        return true;
    });
}

// Ready to receive automation data