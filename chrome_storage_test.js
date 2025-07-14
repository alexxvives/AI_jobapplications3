// CHROME EXTENSION STORAGE TEST
// Copy and paste this into any webpage's console (F12) to test Chrome storage

console.log('🧪 TESTING: Chrome Extension Storage...');

// Real profile data from your database
const testProfileData = {
    userProfile: {
        id: 2,
        full_name: "John Doe",
        email: "john.doe@email.com",
        phone: "555-123-4567",
        city: "",
        state: "",
        work_experience: [],
        education: [],
        skills: [],
        job_preferences: {}
    },
    currentSessionId: "test-session-real-" + Date.now(),
    automationActive: true,
    currentJob: {
        title: "Software Engineer",
        company: "Test Company",
        url: "https://jobs.lever.co/activecampaign/b3b62c66-6b94-4fc1-a651-08ed9a31aeb5/apply"
    }
};

async function testChromeStorage() {
    console.log('🔍 Chrome APIs available:', typeof chrome !== 'undefined');
    console.log('🔍 Chrome storage available:', typeof chrome !== 'undefined' && !!chrome.storage);
    console.log('🔍 Chrome storage.local available:', typeof chrome !== 'undefined' && !!chrome.storage?.local);

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        try {
            // Store the data
            await chrome.storage.local.set(testProfileData);
            console.log('✅ Test data stored successfully!');
            
            // Verify it was stored
            const verification = await chrome.storage.local.get(['userProfile', 'currentSessionId', 'automationActive']);
            console.log('🔍 Verification result:', {
                hasProfile: !!verification.userProfile,
                profileName: verification.userProfile?.full_name,
                hasSession: !!verification.currentSessionId,
                isActive: verification.automationActive
            });
            
            console.log('✅ Chrome storage test completed successfully!');
            console.log('👉 Now go to a job page to see if the extension finds this data');
            
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    } else {
        console.log('❌ Chrome storage not available - are you running this on a webpage with the Chrome extension installed?');
    }
}

async function clearChromeStorage() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.clear();
        console.log('✅ Chrome storage cleared!');
    } else {
        console.log('❌ Chrome storage not available');
    }
}

// Run the test
testChromeStorage();

console.log('💡 TIP: You can also run clearChromeStorage() to clear the data');