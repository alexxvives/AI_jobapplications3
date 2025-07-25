import { useState, useEffect } from 'react'
// Legacy imports removed - now using Chrome Extension automation only
import AutomationProgress from './AutomationProgress'

function AutomationModal({ 
  isOpen, 
  onClose, 
  selectedJobs, 
  jobs, 
  selectedProfile,
  onComplete 
}) {
  console.log('🔥🔥🔥 LATEST VERSION AutomationModal LOADED - v2.0 🔥🔥🔥');
  console.log('🔥 Selected jobs passed to modal:', selectedJobs);
  console.log('🔥 Jobs array length:', selectedJobs?.length || 0);
  
  const [automationStatus, setAutomationStatus] = useState('setup') // setup, running, completed, error
  const [applicationResults, setApplicationResults] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [error, setError] = useState(null)
  const [newSessionId, setNewSessionId] = useState(null)
  const [isMinimized, setIsMinimized] = useState(false)

  // Get selected job objects
  const selectedJobsArray = jobs.filter(job => selectedJobs.has(job.id))

  useEffect(() => {
    if (isOpen) {
      checkProfileAndResume()
    }
  }, [isOpen])

  const checkProfileAndResume = async () => {
    try {
      if (!selectedProfile || !selectedProfile.id) {
        setError('Please select a valid profile before applying to jobs.')
        return
      }
      
      const actualToken = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || localStorage.getItem('jwt')
      
      if (!actualToken) {
        setError('No authentication token found. Please refresh and log in again.')
        return
      }
      
      const response = await fetch(`http://localhost:8000/user/profile/${selectedProfile.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${actualToken}`
        }
      })
      
      if (!response.ok) {
        const errorData = await response.text()
        console.error('❌ Failed to fetch complete profile:', errorData)
        setError('Failed to load complete profile data. Please try again.')
        return
      }
      
      const completeProfile = await response.json()
      setUserProfile(completeProfile)
    } catch (err) {
      console.error('❌ Error fetching complete profile:', err)
      setError('Unable to load your complete profile. Please try again.')
    }
  }


  const startAutomation = async () => {
    console.log('🔥🔥🔥 START AUTOMATION BUTTON CLICKED! 🔥🔥🔥');
    console.log('🔍 DEBUG - startAutomation called with selectedJobs:', selectedJobs);
    console.log('🔍 DEBUG - selectedJobsArray:', selectedJobsArray);
    
    try {
      if (!userProfile) {
        setError('Profile not loaded. Please try again.')
        return
      }

      await startNewAutomation()
      
    } catch (error) {
      console.error('❌ Automation error:', error)
      setError('Failed to start automation: ' + error.message)
      setAutomationStatus('error')
    }
  }

  const startNewAutomation = async () => {
    try {
      setAutomationStatus('running')
      
      // Get auth token
      const actualToken = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token') || localStorage.getItem('jwt')
      
      if (!actualToken) {
        throw new Error('No authentication token found. Please refresh and log in again.')
      }
      
      // Sync token to Chrome storage for cross-domain access - TEST_ID: TOKEN_SYNC_v1
      console.log('📎 TEST_ID: TOKEN_SYNC_v1 - Syncing auth token to Chrome storage...')
      if (chrome && chrome.storage) {
        try {
          await chrome.storage.local.set({ authToken: actualToken })
          console.log('📎 TEST_ID: TOKEN_SYNC_v1 - Token successfully synced to Chrome storage')
        } catch (error) {
          console.warn('📎 TEST_ID: TOKEN_SYNC_v1 - Failed to sync token to Chrome storage:', error)
        }
      } else {
        console.warn('📎 TEST_ID: TOKEN_SYNC_v1 - Chrome storage not available')
      }
      
      // Create automation session with new API
      const response = await fetch('http://localhost:8000/automation/sessions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${actualToken}`
        },
        body: JSON.stringify({
          profile_id: userProfile.id,
          selected_jobs: selectedJobsArray.map(job => ({
            id: job.id,
            title: job.title,
            company: job.company,
            link: job.link,
            location: job.location || '',
            description: job.description || ''
          }))
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('❌ Backend error response:', errorData)
        console.error('❌ Response status:', response.status)
        console.error('❌ Response headers:', Object.fromEntries(response.headers.entries()))
        throw new Error(`Failed to create automation session: ${response.status} - ${errorData}`)
      }

      const result = await response.json()
      setNewSessionId(result.sessionId)
      
      console.log('✅ New automation session created:', result.sessionId)
      
      // Store session data for Chrome extension and notify it to start
      try {
        console.log('🔍 Checking Chrome APIs:', {
          chromeExists: typeof chrome !== 'undefined',
          storageExists: typeof chrome !== 'undefined' && !!chrome.storage,
          localExists: typeof chrome !== 'undefined' && !!chrome.storage?.local,
          runtimeExists: typeof chrome !== 'undefined' && !!chrome.runtime,
          bridgeExists: typeof window.chromeExtensionBridge !== 'undefined'
        });
        
        // Try direct approach - open job tab and let extension detect it
        console.log('🚀 Opening job tab directly - extension will auto-detect');
        
        // Get the first job from backend session
        console.log('🔍 Fetching job from session:', result.sessionId);
        const jobResponse = await fetch(`http://localhost:8000/automation/sessions/${result.sessionId}/current-job`, {
          headers: { 'Authorization': `Bearer ${actualToken}` }
        });
        
        console.log('🔍 Job response status:', jobResponse.status);
        console.log('🔍 Job response headers:', Object.fromEntries(jobResponse.headers.entries()));
        
        if (!jobResponse.ok) {
          const errorText = await jobResponse.text();
          console.error('🔍 Job response error:', errorText);
          throw new Error(`Failed to get current job from session: ${jobResponse.status} - ${errorText}`);
        }
        
        const jobData = await jobResponse.json();
        console.log('🔍 Raw job data from backend:', jobData);
        console.log('📋 Opening job:', jobData.job_title, 'at', jobData.company_name);
        
        // Fallback: use the jobs from the original request if backend job is empty
        if (!jobData.job_url && selectedJobsArray.length > 0) {
          console.log('🔄 Backend job empty, using first selected job as fallback');
          console.log('🔍 DEBUG - selectedJobsArray in fallback:', selectedJobsArray);
          const fallbackJob = selectedJobsArray[0];
          console.log('📋 Fallback job:', fallbackJob.title, 'at', fallbackJob.company);
          
          // Fix Lever URLs by adding /apply
          let jobUrl = fallbackJob.link;
          if (jobUrl.includes('jobs.lever.co') && !jobUrl.endsWith('/apply')) {
            jobUrl = jobUrl.replace(/\/$/, '') + '/apply';
            console.log('🔧 Fixed Lever URL:', jobUrl);
          }
          
          // Store session info and open fallback job
          const sessionData = {
            sessionId: result.sessionId,
            userProfile: userProfile,
            currentJob: {
              title: fallbackJob.title,
              company: fallbackJob.company,
              url: jobUrl,
              platform: jobUrl.includes('jobs.lever.co') ? 'lever' : 'unknown'
            },
            timestamp: Date.now()
          };
          
          localStorage.setItem('currentAutomationSession', JSON.stringify(sessionData));
          
          // Store in Chrome extension storage (works across domains)
          try {
            console.log('🔍 DEBUG - About to create automation data with selectedJobsArray:', selectedJobsArray);
            
            const automationData = {
              userProfile: userProfile,
              currentSessionId: result.sessionId,
              automationActive: true,
              currentJob: {
                title: fallbackJob.title,
                company: fallbackJob.company,
                url: jobUrl,
                platform: jobUrl.includes('jobs.lever.co') ? 'lever' : 'unknown'
              },
              selectedJobs: selectedJobsArray,
              jobQueue: selectedJobsArray,
              currentJobIndex: 0
            };
            
            console.log('🔍 DEBUG - Frontend sending automation data:', {
              hasSelectedJobs: !!automationData.selectedJobs,
              selectedJobsCount: automationData.selectedJobs?.length || 0,
              selectedJobs: automationData.selectedJobs,
              jobQueueCount: automationData.jobQueue?.length || 0
            });
            
            // Chrome storage is NOT available to web pages - only to extensions!
            // We must use Chrome extension messaging instead
            
            
            // Method 1: Chrome extension messaging (PRIMARY METHOD)
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
              
              try {
                // Get the extension ID dynamically
                const getExtensionId = () => {
                  // Try to find the extension ID from installed extensions
                  // This is a workaround since web pages can't directly get the extension ID
                  const possibleIds = [
                    'YOUR_EXTENSION_ID_HERE', // We'll replace this with the actual ID
                    // Common development extension IDs (Chrome generates predictable IDs for development)
                    chrome.runtime.id, // This won't work from web page, but worth trying
                  ].filter(Boolean);
                  
                  return possibleIds[0];
                };
                
                // Try different approaches to send the message
                const extensionId = getExtensionId();
                
                if (extensionId && extensionId !== 'YOUR_EXTENSION_ID_HERE') {
                  // Method 1: With explicit extension ID
                  chrome.runtime.sendMessage(extensionId, {
                    action: 'STORE_AUTOMATION_DATA',
                    data: automationData
                  }, (response) => {
                    if (chrome.runtime.lastError) {
                      console.error('📱 ❌ Chrome runtime error (with ID):', chrome.runtime.lastError.message);
                      console.log('📱 🔄 Trying alternative messaging approach...');
                      tryAlternativeMessaging();
                    } else if (response && response.success) {
                      console.log('📱 ✅ Automation data sent successfully via runtime message with ID!');
                      console.log('📱 📋 Response:', response);
                    } else {
                      console.error('📱 ❌ Runtime message failed (with ID):', response);
                    }
                  });
                } else {
                  console.log('📱 ⚠️ Extension ID not available, trying alternative messaging...');
                  tryAlternativeMessaging();
                }
                
                function tryAlternativeMessaging() {
                  console.log('📱 🔄 Trying alternative messaging approaches...');
                  
                  // Method 1: Try chrome.management if available
                  if (typeof chrome !== 'undefined' && chrome.management && chrome.management.getAll) {
                    chrome.management.getAll((extensions) => {
                      const jobAssistantExt = extensions.find(ext => 
                        ext.name.includes('AI Job Application Assistant') || 
                        ext.name.includes('Job Application')
                      );
                      
                      if (jobAssistantExt) {
                        chrome.runtime.sendMessage(jobAssistantExt.id, {
                          action: 'STORE_AUTOMATION_DATA',
                          data: automationData
                        }, (response) => {
                          if (chrome.runtime.lastError) {
                            console.error('📱 ❌ Extension messaging failed:', chrome.runtime.lastError.message);
                            fallbackToStorage();
                          } else {
                            console.log('📱 ✅ Successfully sent to extension!', response);
                          }
                        });
                      } else {
                        console.log('📱 ⚠️ Extension not found in management list');
                        fallbackToStorage();
                      }
                    });
                  } else {
                    console.log('📱 ⚠️ chrome.management not available, using localStorage directly');
                    fallbackToStorage();
                  }
                  
                  function fallbackToStorage() {
                    console.log('📱 🔄 Using alternative communication methods...');
                    
                    // Method 1: Try to communicate with content script on THIS page first
                    window.postMessage({
                      type: 'CHROME_EXTENSION_MESSAGE',
                      action: 'STORE_AUTOMATION_DATA',
                      data: automationData,
                      origin: 'frontend'
                    }, '*');
                    console.log('📱 📤 Posted message to current page content script');
                    
                    // Method 2: Store in localStorage (won't work cross-domain but good for debugging)
                    const localStorageData = {
                      ...automationData,
                      timestamp: Date.now(),
                      source: 'frontend'
                    };
                    
                    localStorage.setItem('chromeExtensionAutomationData', JSON.stringify(localStorageData));
                    localStorage.setItem('currentAutomationSession', JSON.stringify({
                      sessionId: automationData.currentSessionId,
                      userProfile: automationData.userProfile,
                      currentJob: automationData.currentJob,
                      timestamp: Date.now()
                    }));
                    console.log('📱 📤 Data stored in localStorage (for same-domain access only)');
                    
                    // Method 3: Try to query all tabs and inject the data
                    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
                      chrome.tabs.query({}, (tabs) => {
                        tabs.forEach(tab => {
                          if (tab.url && (tab.url.includes('jobs.lever.co') || 
                              tab.url.includes('boards.greenhouse.io') || 
                              tab.url.includes('workday.com'))) {
                            console.log('📱 📤 Sending data to job tab:', tab.url);
                            chrome.tabs.sendMessage(tab.id, {
                              action: 'STORE_AUTOMATION_DATA',
                              data: automationData
                            }, (response) => {
                              if (chrome.runtime.lastError) {
                                console.log('📱 ⚠️ Could not message tab:', chrome.runtime.lastError.message);
                              } else {
                                console.log('📱 ✅ Successfully sent to tab:', tab.url);
                              }
                            });
                          }
                        });
                      });
                    } else {
                      console.log('📱 ⚠️ chrome.tabs not available');
                    }
                  }
                }
                
              } catch (error) {
                console.error('📱 ❌ Error sending runtime message:', error.message);
              }
            } else {
              console.error('📱 ❌ Chrome runtime not available - extension may not be installed');
            }
            
            // Method 2: Via Chrome runtime message to background script
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
              try {
                chrome.runtime.sendMessage({
                  action: 'STORE_AUTOMATION_DATA',
                  data: automationData
                }, (response) => {
                  if (chrome.runtime.lastError) {
                    console.log('📱 ⚠️ Chrome runtime error:', chrome.runtime.lastError.message);
                  } else if (response && response.success) {
                    console.log('📱 ✅ Stored via Chrome runtime message');
                  } else {
                    console.log('📱 ⚠️ Chrome runtime storage failed:', response);
                  }
                });
              } catch (error) {
                console.log('📱 ⚠️ Chrome runtime sendMessage error:', error.message);
              }
            }
            
            // Method 3: PostMessage (less reliable for cross-origin)
            window.postMessage({
              type: 'STORE_AUTOMATION_DATA',
              data: automationData
            }, '*');
            console.log('📱 📤 Posted automation data message');
            
          } catch (e) {
            console.log('📱 ❌ Chrome storage error:', e.message);
          }
          
          const jobTab = window.open(jobUrl, '_blank');
          if (!jobTab) {
            throw new Error('Popup blocked. Please allow popups for this site.');
          }
          
          console.log('✅ Fallback job tab opened:', jobUrl);
          console.log('📱 Session data with job info stored for form filling');
          return;
        }
        
        // Fix Lever URLs by adding /apply  
        let finalJobUrl = jobData.job_url;
        if (finalJobUrl.includes('jobs.lever.co') && !finalJobUrl.endsWith('/apply')) {
          finalJobUrl = finalJobUrl.replace(/\/$/, '') + '/apply';
          console.log('🔧 Fixed Lever URL:', finalJobUrl);
        }
        
        
        // Store in Chrome storage for MAIN PATH too (not just fallback)
        try {
          
          const automationData = {
            userProfile: userProfile,
            currentSessionId: result.sessionId,
            automationActive: true,
            currentJob: {
              title: jobData.job_title,
              company: jobData.company_name,
              url: finalJobUrl,
              platform: finalJobUrl.includes('jobs.lever.co') ? 'lever' : 'unknown'
            },
            selectedJobs: selectedJobsArray,
            jobQueue: selectedJobsArray,
            currentJobIndex: 0
          };
          
          console.log('🔍 DEBUG - Frontend sending automation data (main path):', {
            hasSelectedJobs: !!automationData.selectedJobs,
            selectedJobsCount: automationData.selectedJobs?.length || 0,
            selectedJobs: automationData.selectedJobs,
            jobQueueCount: automationData.jobQueue?.length || 0
          });
          
          // Store via Chrome extension messaging (web pages can't access chrome.storage directly)
          
          // Also send via runtime message
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({
              action: 'STORE_AUTOMATION_DATA',
              data: automationData
            }, (response) => {
              if (chrome.runtime.lastError) {
                console.log('📱 Main Path: Chrome runtime error:', chrome.runtime.lastError.message);
              } else {
                console.log('📱 ✅ Main Path: Stored via Chrome runtime message');
              }
            });
          }
          
        } catch (e) {
          console.error('📱 ❌ Main Path: Chrome storage error:', e.message);
        }
        
        // Store session info in localStorage for extension to find
        localStorage.setItem('currentAutomationSession', JSON.stringify({
          sessionId: result.sessionId,
          userProfile: userProfile,
          currentJob: {
            title: jobData.job_title,
            company: jobData.company_name,
            url: finalJobUrl,
            platform: finalJobUrl.includes('jobs.lever.co') ? 'lever' : 'unknown'
          },
          timestamp: Date.now()
        }));
        
        // Open the job application URL
        const jobTab = window.open(finalJobUrl, '_blank');
        if (!jobTab) {
          throw new Error('Popup blocked. Please allow popups for this site.');
        }
        
        console.log('✅ Job tab opened:', finalJobUrl);
        console.log('📱 Session data with job info stored for form filling');
      } catch (directError) {
        console.error('📱 Direct automation error:', directError)
        setError('Failed to open job application: ' + directError.message)
        setAutomationStatus('error')
      }
      
    } catch (err) {
      console.error('❌ Error starting new automation:', err)
      setError('Failed to start automation: ' + err.message)
      setAutomationStatus('error')
    }
  }





  const resetAutomation = () => {
    setAutomationStatus('setup')
    setApplicationResults([])
    setError(null)
    setNewSessionId(null)
  }

  const handleNewAutomationComplete = (result) => {
    console.log('✅ New automation completed:', result)
    setAutomationStatus('completed')
    setNewSessionId(null)
    
    // Update application results for display
    if (result.data && result.data.jobs) {
      const results = result.data.jobs.map(job => ({
        job: {
          title: job.job_title,
          company: job.company_name
        },
        status: job.status === 'submitted' ? 'completed' : 'failed'
      }))
      setApplicationResults(results)
    }
  }

  const handleNewAutomationError = (error) => {
    console.error('❌ New automation error:', error)
    setError('Automation failed: ' + error.message)
    setAutomationStatus('error')
  }

  const handleClose = () => {
    if (automationStatus === 'running') {
      // Minimize instead of closing when automation is running
      setIsMinimized(true)
      return
    }
    
    resetAutomation()
    onClose()
  }

  const handleMinimize = () => {
    setIsMinimized(true)
  }

  const handleMaximize = () => {
    setIsMinimized(false)
  }

  if (!isOpen) return null

  // Minimized state - floating widget
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-blue-500 text-white p-4 rounded-lg shadow-lg cursor-pointer hover:bg-blue-600 transition-colors"
             onClick={handleMaximize}>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Automation Running</span>
            <span className="text-xs opacity-75">Click to expand</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              🚀 Chrome Extension Automation v2.0
            </h2>
            <div className="flex space-x-2">
              {automationStatus === 'running' && (
                <button
                  onClick={handleMinimize}
                  className="text-gray-500 hover:text-gray-700"
                  title="Minimize"
                >
                  ➖
                </button>
              )}
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700"
                title={automationStatus === 'running' ? 'Minimize' : 'Close'}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Setup Phase */}
          {automationStatus === 'setup' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Apply</h3>
                <p className="text-gray-600 mb-4">
                  You're about to apply to {selectedJobsArray.length} job{selectedJobsArray.length !== 1 ? 's' : ''} using your selected profile and attached resume.
                </p>
              </div>

              {userProfile && (
                <div className="bg-green-50 p-3 rounded-md">
                  <p className="text-green-700 text-sm">
                    ✓ Profile loaded: {
                      userProfile.full_name || // Database format
                      `${userProfile.personal_information?.basic_information?.first_name || ''} ${userProfile.personal_information?.basic_information?.last_name || ''}`.trim() || // Structured format
                      'Profile'
                    }
                  </p>
                  <p className="text-green-600 text-xs mt-1">
                    Resume file will be automatically used from your profile
                  </p>
                </div>
              )}

              {/* Automation System Selection */}
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="font-medium text-gray-900 mb-2">Automation Method</h4>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
                    <span className="text-sm">
                      🚀 <strong>Chrome Extension Automation</strong> - Advanced form filling with auto-progression
                    </span>
                  </div>
                </div>
                <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                  <strong>Requirements:</strong> Chrome extension must be installed and active. 
                  This method provides automatic progression between jobs.
                </div>
                <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-700 font-medium">
                  ✅ UPDATED v2.0 - Legacy browser automation removed
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={startAutomation}
                  disabled={!userProfile}
                  className="w-full bg-red-500 text-white px-6 py-3 rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🚀 START CHROME EXTENSION v2.0 🚀
                </button>
              </div>
            </div>
          )}

          {/* Chrome Extension Automation Progress */}
          {newSessionId && automationStatus === 'running' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Automation in Progress</h3>
              <p className="text-gray-600 mb-4">
                Chrome extension is processing the job application form
              </p>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-blue-800 text-sm">
                  <strong>Session ID:</strong> {newSessionId}
                </p>
                <p className="text-blue-600 text-xs mt-2">
                  The job form should be filling automatically in the new tab. 
                  You can minimize this window and check back later.
                </p>
              </div>
            </div>
          )}

          {/* Completion Phase */}
          {automationStatus === 'completed' && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="text-green-500 text-4xl mb-2">✓</div>
                <h3 className="text-lg font-medium text-gray-900">Automation Complete!</h3>
                <p className="text-gray-600">
                  Applied to {applicationResults.length} job{applicationResults.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Results Summary */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Application Results</h4>
                <div className="space-y-2">
                  {applicationResults.map((result, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span>{result.job.title} at {result.job.company}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        result.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {result.status === 'completed' ? 'Success' : 'Failed'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-600"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AutomationModal