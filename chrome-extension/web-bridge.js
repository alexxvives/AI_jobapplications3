// Web Bridge - Content Script for Frontend Communication
// This runs on localhost:3000 to bridge communication between frontend and Chrome storage

console.log('🌉 Web Bridge initialized on:', window.location.href);

// Listen for messages from the frontend React app
window.addEventListener('message', async (event) => {
    console.log('🌉 Web Bridge received message:', event.data.type, 'from:', event.origin);
    
    // Only accept messages from our frontend
    if (!event.origin.includes('localhost:3000') && !event.origin.includes('localhost:3001')) {
        console.log('🌉 ⚠️ Ignoring message from unknown origin:', event.origin);
        return;
    }
    
    if (event.data.type === 'CHROME_EXTENSION_MESSAGE' && event.data.action === 'STORE_AUTOMATION_DATA') {
        console.log('🌉 🔥 AUTOMATION DATA MESSAGE RECEIVED ON FRONTEND!', {
            hasData: !!event.data.data,
            hasProfile: !!event.data.data?.userProfile,
            profileName: event.data.data?.userProfile?.full_name
        });
        
        // 🔍 DEBUG: Show ALL profile data being transferred
        console.log('🔍 COMPLETE PROFILE DATA BEING TRANSFERRED:');
        console.log('📋 User Profile Object:', JSON.stringify(event.data.data?.userProfile, null, 2));
        console.log('📋 Profile Keys:', Object.keys(event.data.data?.userProfile || {}));
        
        if (event.data.data?.userProfile) {
            const profile = event.data.data.userProfile;
            console.log('📋 PROFILE BREAKDOWN:');
            console.log('  - ID:', profile.id);
            console.log('  - Full Name:', profile.full_name);
            console.log('  - Email:', profile.email);
            console.log('  - Phone:', profile.phone);
            console.log('  - Address:', profile.address);
            console.log('  - City:', profile.city);
            console.log('  - State:', profile.state);
            console.log('  - Zip Code:', profile.zip_code);
            console.log('  - Country:', profile.country);
            console.log('  - Work Experience:', profile.work_experience?.length || 0, 'entries');
            console.log('  - Education:', profile.education?.length || 0, 'entries');
            console.log('  - Skills:', profile.skills?.length || 0, 'items');
            console.log('  - Job Preferences:', Object.keys(profile.job_preferences || {}));
            
            if (profile.work_experience?.length > 0) {
                console.log('  - Current Job:', profile.work_experience[0]?.title, 'at', profile.work_experience[0]?.company);
            }
            if (profile.education?.length > 0) {
                console.log('  - Education:', profile.education[0]?.degree, 'from', profile.education[0]?.school);
            }
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
            
            console.log('🌉 Storing automation data in Chrome storage:', {
                hasProfile: !!storageData.userProfile,
                profileName: storageData.userProfile?.full_name,
                sessionId: storageData.currentSessionId,
                active: storageData.automationActive
            });
            
            await chrome.storage.local.set(storageData);
            console.log('🌉 ✅ Automation data stored in Chrome storage from frontend!');
            
            // Verify storage worked
            const verification = await chrome.storage.local.get(['userProfile', 'currentSessionId', 'automationActive']);
            console.log('🌉 ✅ Storage verification:', {
                hasProfile: !!verification.userProfile,
                profileName: verification.userProfile?.full_name,
                hasSession: !!verification.currentSessionId,
                isActive: verification.automationActive
            });
            
            // Also send to background script to notify all tabs
            if (chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({
                    action: 'STORE_AUTOMATION_DATA',
                    data: automationData
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log('🌉 ⚠️ Background message error:', chrome.runtime.lastError.message);
                    } else {
                        console.log('🌉 ✅ Notified background script:', response);
                    }
                });
            }
            
        } catch (error) {
            console.error('🌉 ❌ Error storing automation data:', error);
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

console.log('🌉 Web Bridge ready to receive automation data from React frontend');