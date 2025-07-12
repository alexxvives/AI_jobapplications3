import { useState, useEffect } from 'react'
import { startJobAutomation, checkUserProfile, markJobComplete, getBrowserStatus, processNextJobInSession } from '../utils/apiWithAuth'

function AutomationModal({ 
  isOpen, 
  onClose, 
  selectedJobs, 
  jobs, 
  selectedProfile,
  onComplete 
}) {
  const [currentJobIndex, setCurrentJobIndex] = useState(0)
  const [automationStatus, setAutomationStatus] = useState('setup') // setup, running, waiting_for_submit, completed, error
  const [applicationResults, setApplicationResults] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [error, setError] = useState(null)
  const [currentInstructions, setCurrentInstructions] = useState([])
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [fieldsFilled, setFieldsFilled] = useState([])
  const [browserStatus, setBrowserStatus] = useState(null)

  // Get selected job objects
  const selectedJobsArray = jobs.filter(job => selectedJobs.has(job.id))

  useEffect(() => {
    if (isOpen) {
      checkProfileAndResume()
    }
  }, [isOpen])

  const checkProfileAndResume = async () => {
    try {
      console.log('AutomationModal - checkProfileAndResume called with selectedProfile:', selectedProfile)
      console.log('selectedProfile ID:', selectedProfile?.id)
      
      // Use the selected profile passed from JobSearch
      // Check for either database format (flat fields) or structured format
      const hasValidProfile = selectedProfile && (
        selectedProfile.full_name || // Database format
        selectedProfile.personal_information?.basic_information?.first_name // Structured format
      )
      
      if (!hasValidProfile) {
        setError('Please select a valid profile before applying to jobs.')
        return
      }
      
      if (!selectedProfile.id) {
        setError('Profile is missing ID. Please select a valid profile.')
        console.error('Profile missing ID:', selectedProfile)
        return
      }
      
      setUserProfile(selectedProfile)
    } catch (err) {
      setError('Unable to load your profile. Please select a valid profile.')
    }
  }


  const startAutomation = async () => {
    if (!userProfile) {
      setError('Profile not loaded. Please try again.')
      return
    }

    setAutomationStatus('running')
    setCurrentJobIndex(0)
    
    console.log('🎯 FRONTEND DEBUG: ===== STARTING AUTOMATION WITH ALL JOBS =====')
    console.log('🎯 FRONTEND DEBUG: Total jobs selected:', selectedJobsArray.length)
    console.log('🎯 FRONTEND DEBUG: Jobs:', selectedJobsArray.map(j => j.title))
    
    // Create ONE session with ALL jobs, then process first job
    await processFirstJobOnly()
  }

  const processFirstJobOnly = async () => {
    try {
      setAutomationStatus('running')
      
      console.log('🎯 FRONTEND DEBUG: ===== CREATING SESSION WITH ALL JOBS =====')
      console.log('🎯 FRONTEND DEBUG: Will send all jobs to create ONE session')
      
      // Create ONE automation session with ALL jobs
      const response = await startJobAutomation({
        jobs: selectedJobsArray, // Send ALL jobs
        profile: userProfile
      })
      
      // Store session ID for the entire automation
      setCurrentSessionId(response.session_id)
      
      console.log('🎯 FRONTEND DEBUG: ===== SESSION CREATED - PROCESSING FIRST JOB =====')
      console.log('🎯 FRONTEND DEBUG: Session ID:', response.session_id)
      
      // Now handle the first job response
      await handleJobResponse(response)
      
    } catch (err) {
      console.error('🎯 FRONTEND DEBUG: Error starting automation:', err)
      setError('Failed to start automation: ' + err.message)
      setAutomationStatus('setup')
    }
  }

  const processNextJob = async () => {
    if (currentJobIndex >= selectedJobsArray.length) {
      setAutomationStatus('completed')
      return
    }

    if (!currentSessionId) {
      setError('No active session. Please restart automation.')
      return
    }
    
    try {
      setAutomationStatus('running')
      
      console.log('🎯 FRONTEND DEBUG: ===== PROCESSING NEXT JOB =====')
      console.log('🎯 FRONTEND DEBUG: Job index:', currentJobIndex)
      console.log('🎯 FRONTEND DEBUG: Session ID:', currentSessionId)
      
      // Use processNextJobInSession from apiWithAuth
      const response = await processNextJobInSession(currentSessionId)
      
      await handleJobResponse(response)
      
    } catch (err) {
      console.error('🎯 FRONTEND DEBUG: Error processing next job:', err)
      setError('Failed to process next job: ' + err.message)
    }
  }

  const handleJobResponse = async (response) => {
    try {
      const currentJob = selectedJobsArray[currentJobIndex]

      if (response.success) {
        console.log('🎯 FRONTEND DEBUG: ===== AUTOMATION RESPONSE RECEIVED =====')
        console.log('🎯 FRONTEND DEBUG: VERSION: EXPECTING SEMANTIC JAVASCRIPT INJECTION')
        console.log('🎯 FRONTEND DEBUG: Response keys:', Object.keys(response))
        console.log('🎯 FRONTEND DEBUG: Response success:', response.success)
        console.log('🎯 FRONTEND DEBUG: Response status:', response.status)
        console.log('🎯 FRONTEND DEBUG: Response automation_type:', response.automation_type)
        console.log('🎯 FRONTEND DEBUG: Response has js_injection:', 'js_injection' in response)
        console.log('🎯 FRONTEND DEBUG: Response form_data:', response.form_data)
        console.log('🎯 FRONTEND DEBUG: Full response:', response)
        setCurrentInstructions(response.instructions || [])
        setCurrentSessionId(response.session_id)
        
        // Handle job skipped due to invalid/expired posting
        if (response.status === 'job_skipped' || response.should_skip) {
          console.log('Job skipped:', response.reason)
          
          // Record the skipped job
          const skippedResult = {
            job: currentJob,
            status: 'skipped',
            notes: response.message || response.reason || 'Job no longer available',
            timestamp: new Date().toISOString(),
            automation_type: response.automation_type || 'ai_validation'
          }
          
          setApplicationResults(prev => [...prev, skippedResult])
          
          // Show user notification
          alert(`⚠️ Job Skipped: ${currentJob.title}

${response.message || response.reason || 'This job posting is no longer available or has expired.'}

Moving to the next job automatically...`)
          
          // Automatically move to next job after a short delay
          setTimeout(() => {
            handleJobCompleted('skipped', response.message || response.reason || 'Job no longer available')
          }, 2000)
          
          return
        }
        setFieldsFilled(response.fields_filled || [])
        
        if (response.status === 'visual_automation_active') {
          setAutomationStatus('visual_automation_active')
          
          // Start monitoring browser status
          startBrowserMonitoring(response.session_id)
          
          // Show instructions to user
          alert(`Browser automation started! 

IMPORTANT: This automation processes jobs ONE AT A TIME.

1. Watch the form being filled automatically
2. Review all information carefully  
3. Click Submit on the job application form
4. Return here and click "Application Submitted" to move to the next job

Do NOT close this window - it controls the automation sequence.`)
        } else if (response.status === 'tab_ready') {
          setAutomationStatus('tab_opened')
          
          // Open URL in new tab with smart form filling
          const applicationUrl = response.application_url || response.tab_url || currentJob.link
          const formData = response.form_data || {}
          const fieldsCount = response.fields_filled?.length || 0
          
          console.log('Opening job in new tab with smart form filling:', applicationUrl)
          console.log('Form data available:', formData)
          
          // Create a URL with form data encoded as a special hash
          const formDataEncoded = encodeURIComponent(JSON.stringify(formData))
          const urlWithData = `${applicationUrl}#autoFillData=${formDataEncoded}`
          
          const newTab = window.open(urlWithData, '_blank')
          
          if (newTab) {
            console.log('Job tab opened successfully with form data')
            
            // Store form data in localStorage for the bookmarklet to access
            const storageKey = `autoFill_${Date.now()}`
            localStorage.setItem(storageKey, JSON.stringify(formData))
            
            // Create a bookmarklet that the user can run to fill the form
            const bookmarkletCode = `
javascript:(function(){
  var data = ${JSON.stringify(formData)};
  var filled = 0;
  var mappings = [
    {selectors: ['input[name*="name"]:not([name*="last"]):not([name*="first"])', 'input[placeholder*="full name" i]', 'input[id*="name"]:not([id*="last"]):not([id*="first"])'], value: data.full_name},
    {selectors: ['input[name*="first" i]', 'input[placeholder*="first name" i]', 'input[id*="first" i]'], value: data.first_name},
    {selectors: ['input[name*="last" i]', 'input[placeholder*="last name" i]', 'input[id*="last" i]'], value: data.last_name},
    {selectors: ['input[type="email"]', 'input[name*="email" i]', 'input[placeholder*="email" i]', 'input[id*="email" i]'], value: data.email},
    {selectors: ['input[type="tel"]', 'input[name*="phone" i]', 'input[placeholder*="phone" i]', 'input[id*="phone" i]'], value: data.phone},
    {selectors: ['input[name*="city" i]', 'input[placeholder*="city" i]', 'input[id*="city" i]'], value: data.city},
    {selectors: ['input[name*="state" i]', 'input[placeholder*="state" i]', 'input[id*="state" i]'], value: data.state},
    {selectors: ['input[name*="country" i]', 'input[placeholder*="country" i]', 'input[id*="country" i]'], value: data.country}
  ];
  mappings.forEach(function(mapping) {
    if (mapping.value && mapping.value.trim()) {
      mapping.selectors.forEach(function(selector) {
        try {
          document.querySelectorAll(selector).forEach(function(element) {
            if (element && element.offsetParent !== null && !element.value) {
              element.style.border = '2px solid #4CAF50';
              element.style.boxShadow = '0 0 5px #4CAF50';
              element.focus();
              element.value = mapping.value;
              element.dispatchEvent(new Event('input', {bubbles: true}));
              element.dispatchEvent(new Event('change', {bubbles: true}));
              filled++;
              setTimeout(function() {
                element.style.border = '';
                element.style.boxShadow = '';
              }, 3000);
            }
          });
        } catch (e) {
          console.log('Error filling field:', selector, e);
        }
      });
    }
  });
  if (filled > 0) {
    var banner = document.createElement('div');
    banner.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; z-index: 999999; background: linear-gradient(90deg, #4CAF50, #45a049); color: white; padding: 15px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 16px; font-weight: 500; box-shadow: 0 2px 10px rgba(0,0,0,0.3);';
    banner.innerHTML = '🤖 <strong>Smart Auto-Fill Complete!</strong> Filled ' + filled + ' fields automatically. Please review and submit.';
    document.body.appendChild(banner);
    setTimeout(function() { banner.remove(); }, 8000);
  }
  alert('Auto-fill completed: ' + filled + ' fields filled');
})();`
            
            // Copy bookmarklet to clipboard if possible
            if (navigator.clipboard) {
              navigator.clipboard.writeText(bookmarkletCode).then(() => {
                console.log('Bookmarklet copied to clipboard')
              }).catch(err => {
                console.log('Could not copy bookmarklet:', err)
              })
            }
            
            alert(`🤖 Smart Form Filling Ready!

✅ Job application opened in new tab
📋 ${fieldsCount} fields ready to auto-fill
🔧 Auto-fill bookmarklet copied to clipboard

INSTRUCTIONS:
1. In the job application tab, run the auto-fill by either:
   - Pressing Ctrl+V and hitting Enter (if bookmarklet was copied)
   - Or manually fill the form
2. Green highlights will show filled fields
3. Review all information carefully
4. Submit the application
5. Return here and click "Application Submitted"

IMPORTANT: This processes jobs ONE AT A TIME.
Do NOT close this window - it controls the automation sequence.`)
          } else {
            throw new Error('Popup blocked. Please allow popups for this site.')
          }
        } else if (response.automation_type === 'semantic_with_ai_fallback' || response.automation_type === 'browser_automation_with_ai' || response.status === 'awaiting_user_confirmation' || response.status === 'awaiting_user_submission') {
          console.log('🎯 FRONTEND DEBUG: ===== SEMANTIC WITH AI FALLBACK PATH =====')
          console.log('🎯 FRONTEND DEBUG: Setting automation status to awaiting_user_confirmation')
          setAutomationStatus('awaiting_user_confirmation')
          
          // Semantic form filling completed - open tab with JavaScript injection
          console.log('🎯 FRONTEND DEBUG: Semantic form filling with AI fallback completed successfully')
          console.log('🎯 FRONTEND DEBUG: Fields filled:', response.fields_filled || 0)
          console.log('🎯 FRONTEND DEBUG: Total fields filled:', response.total_fields_filled || 0)
          console.log('🎯 FRONTEND DEBUG: Semantic matches:', response.semantic_matches || 0)
          console.log('🎯 FRONTEND DEBUG: JS injection available:', !!response.js_injection)
          console.log('🎯 FRONTEND DEBUG: JS injection length:', response.js_injection ? response.js_injection.length : 0)
          
          // Open tab with semantic JavaScript injection
          const applicationUrl = response.application_url || response.job_url || currentJob.link
          const jsInjection = response.js_injection
          const totalFields = response.total_fields_filled || response.fields_filled || 0
          const semanticMatches = response.semantic_matches || 0
          
          console.log('Opening job tab with semantic JavaScript injection:', applicationUrl)
          
          const newTab = window.open(applicationUrl, '_blank')
          
          if (newTab) {
            console.log('Semantic form filling tab opened successfully')
            
            // Store the JavaScript injection in localStorage for easy access
            const injectionKey = `semanticAutoFill_${Date.now()}`
            localStorage.setItem(injectionKey, jsInjection)
            
            // Create a simplified bookmarklet that runs the semantic injection
            const semanticBookmarklet = `javascript:${jsInjection.replace(/\n/g, ' ').replace(/\s+/g, ' ')}`
            
            // Copy semantic bookmarklet to clipboard if possible
            if (navigator.clipboard) {
              navigator.clipboard.writeText(semanticBookmarklet).then(() => {
                console.log('Semantic auto-fill bookmarklet copied to clipboard')
              }).catch(err => {
                console.log('Could not copy semantic bookmarklet:', err)
              })
            }
            
            alert(`🧠 Semantic Form Filling Ready! 

✅ Intelligent Analysis: ${semanticMatches} field types identified
✅ Auto-Fill Ready: ${totalFields} form fields prepared
🚀 Semantic JavaScript generated and copied to clipboard
📋 Job application opened in new tab

INSTRUCTIONS:
1. In the job application tab, paste and run the auto-fill code:
   - Press Ctrl+V in the address bar and hit Enter
   - OR open Developer Console (F12) and paste the code
2. Watch the semantic auto-fill work with progress indicators
3. Green highlights will show intelligently matched fields
4. Review all information carefully
5. Submit the application
6. Return here and click "Application Submitted"

IMPORTANT: This processes jobs ONE AT A TIME.
Do NOT close this window - it controls the automation sequence.`)
          } else {
            throw new Error('Popup blocked. Please allow popups for this site.')
          }
        } else if (response.status === 'manual_fallback') {
          setAutomationStatus('manual_fallback')
          
          // Open URL manually due to visual automation failure
          const applicationUrl = response.fallback_url || currentJob.link
          console.log('Opening manual fallback URL:', applicationUrl)
          
          const newTab = window.open(applicationUrl, '_blank')
          
          if (newTab) {
            console.log('Manual fallback tab opened successfully')
            alert(`Visual automation not available. Job application opened in new tab.

IMPORTANT: This automation processes jobs ONE AT A TIME.

1. Fill out the form manually in the new tab
2. Review all information carefully
3. Click Submit on the job application form  
4. Return here and click "Application Submitted" to move to the next job

Do NOT close this window - it controls the automation sequence.`)
          } else {
            console.error('Failed to open popup - likely blocked')
            alert(`Popup blocked! Please manually open this URL: ${applicationUrl}`)
            // Also copy to clipboard if possible
            if (navigator.clipboard) {
              navigator.clipboard.writeText(applicationUrl)
              alert(`URL copied to clipboard: ${applicationUrl}`)
            }
          }
        } else if (response.status === 'automation_failed') {
          console.log('Automation failed, opening URL manually')
          setAutomationStatus('manual_fallback')
          
          // For failed automation, still try to open the URL manually
          // Apply Lever URL transformation on frontend side as backup
          let applicationUrl = response.application_url || currentJob.link
          
          // Frontend backup: Add /apply to Lever URLs if not present
          if (applicationUrl.includes('jobs.lever.co') && !applicationUrl.endsWith('/apply')) {
            applicationUrl = applicationUrl.replace(/\/$/, '') + '/apply'
            console.log('Frontend applied Lever /apply transformation:', applicationUrl)
          }
          
          console.log('Opening failed automation URL:', applicationUrl)
          const newTab = window.open(applicationUrl, '_blank')
          
          if (newTab) {
            console.log('Failed automation tab opened successfully')
            alert('Automation failed, but job application page opened in new tab. Please fill out the form manually and return here when done.')
          } else {
            console.error('Failed to open popup - likely blocked')
            alert(`Popup blocked! Please manually open this URL: ${applicationUrl}`)
            if (navigator.clipboard) {
              navigator.clipboard.writeText(applicationUrl)
              alert(`URL copied to clipboard: ${applicationUrl}`)
            }
          }
        } else {
          console.log('Unknown automation status, using fallback:', response.status)
          setAutomationStatus('waiting_for_submit')
          
          // Standard fallback - open URL manually with Lever transformation
          let applicationUrl = response.application_url || currentJob.link
          
          // Frontend backup: Add /apply to Lever URLs if not present
          if (applicationUrl.includes('jobs.lever.co') && !applicationUrl.endsWith('/apply')) {
            applicationUrl = applicationUrl.replace(/\/$/, '') + '/apply'
            console.log('Frontend applied Lever /apply transformation:', applicationUrl)
          }
          
          console.log('Opening standard fallback URL:', applicationUrl)
          const newTab = window.open(applicationUrl, '_blank')
          
          if (!newTab) {
            throw new Error('Popup blocked. Please allow popups for this site.')
          } else {
            console.log('Standard fallback tab opened successfully')
          }
        }
      } else {
        throw new Error(response.error || 'Failed to generate application instructions')
      }
      
    } catch (err) {
      console.error('Automation error:', err)
      
      // Record the failure
      const newResult = {
        job: currentJob,
        status: 'failed',
        error: err.message,
        timestamp: new Date().toISOString()
      }
      
      setApplicationResults(prev => [...prev, newResult])
      
      // Move to next job automatically
      setTimeout(() => {
        moveToNextJob()
      }, 2000)
    }
  }

  const markCurrentJobComplete = async () => {
    if (!currentSessionId) {
      console.error('No active session')
      return
    }
    
    try {
      const response = await markJobComplete(currentSessionId, 'completed', 'Application submitted successfully')
      
      if (response.success) {
        const currentJob = selectedJobsArray[currentJobIndex]
        
        const newResult = {
          job: currentJob,
          status: 'completed',
          timestamp: new Date().toISOString()
        }
        
        setApplicationResults(prev => [...prev, newResult])
        
        if (response.status === 'completed') {
          setAutomationStatus('completed')
        } else {
          moveToNextJob()
        }
      }
    } catch (err) {
      console.error('Error marking job complete:', err)
      alert('Error updating job status. Please try again.')
    }
  }

  const markCurrentJobFailed = async () => {
    if (!currentSessionId) {
      console.error('No active session')
      return
    }
    
    try {
      const response = await markJobComplete(currentSessionId, 'failed', 'User marked as failed')
      
      if (response.success) {
        const currentJob = selectedJobsArray[currentJobIndex]
        
        const newResult = {
          job: currentJob,
          status: 'failed',
          error: 'User marked as failed',
          timestamp: new Date().toISOString()
        }
        
        setApplicationResults(prev => [...prev, newResult])
        
        if (response.status === 'completed') {
          setAutomationStatus('completed')
        } else {
          moveToNextJob()
        }
      }
    } catch (err) {
      console.error('Error marking job failed:', err)
      alert('Error updating job status. Please try again.')
    }
  }

  const startBrowserMonitoring = (sessionId) => {
    const monitor = setInterval(async () => {
      try {
        const status = await getBrowserStatus(sessionId)
        setBrowserStatus(status)
        
        if (!status.browser_active) {
          clearInterval(monitor)
          if (status.status === 'browser_closed') {
            setAutomationStatus('waiting_for_submit')
            alert('Browser was closed. Please confirm if you submitted the application.')
          }
        }
      } catch (err) {
        console.error('Browser monitoring error:', err)
        clearInterval(monitor)
      }
    }, 3000) // Check every 3 seconds
    
    // Store interval ID for cleanup
    setCurrentInstructions(prev => ({ ...prev, monitorInterval: monitor }))
  }

  const moveToNextJob = () => {
    const nextIndex = currentJobIndex + 1
    setCurrentJobIndex(nextIndex)
    
    // Clear browser monitoring
    setBrowserStatus(null)
    
    if (nextIndex >= selectedJobsArray.length) {
      setAutomationStatus('completed')
    } else {
      // Small delay before processing next job
      setTimeout(() => {
        processNextJob()
      }, 1000)
    }
  }

  const resetAutomation = () => {
    setCurrentJobIndex(0)
    setAutomationStatus('setup')
    setApplicationResults([])
    setCurrentInstructions([])
    setCurrentSessionId(null)
    setFieldsFilled([])
    setBrowserStatus(null)
    setError(null)
  }

  const handleClose = () => {
    if (automationStatus === 'running' || automationStatus === 'waiting_for_submit') {
      if (!confirm('Automation is in progress. Are you sure you want to close?')) {
        return
      }
    }
    
    resetAutomation()
    onClose()
  }

  if (!isOpen) return null

  const currentJob = selectedJobsArray[currentJobIndex]
  const progress = ((currentJobIndex + 1) / selectedJobsArray.length) * 100

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Job Application Automation
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
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

              <div className="pt-4">
                <button
                  onClick={startAutomation}
                  disabled={!userProfile}
                  className="w-full bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Automation
                </button>
              </div>
            </div>
          )}

          {/* Progress Phase */}
          {(automationStatus === 'running' || automationStatus === 'waiting_for_submit' || automationStatus === 'visual_automation_active' || automationStatus === 'manual_fallback' || automationStatus === 'awaiting_user_confirmation') && currentJob && (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Job {currentJobIndex + 1} of {selectedJobsArray.length}</span>
                  <span>{Math.round(progress)}% Complete</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Current Job */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900">{currentJob.title}</h3>
                <p className="text-gray-600">{currentJob.company}</p>
                <p className="text-sm text-gray-500">{currentJob.location}</p>
              </div>

              {/* Status */}
              {automationStatus === 'running' && (
                <div className="text-center py-4">
                  <div className="loading-spinner mb-2"></div>
                  <p className="text-gray-600">Starting browser automation...</p>
                </div>
              )}

              {automationStatus === 'visual_automation_active' && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="font-medium text-blue-800 mb-2">🤖 Visual Automation Active</h4>
                  <p className="text-blue-700 text-sm mb-3">
                    Browser automation is running! You can watch the form being filled automatically.
                  </p>
                  
                  {fieldsFilled.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-blue-800 mb-1">Fields Filled:</p>
                      <div className="flex flex-wrap gap-1">
                        {fieldsFilled.map((field, index) => (
                          <span key={index} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                            ✓ {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {browserStatus && (
                    <div className="text-xs text-blue-600">
                      Browser Status: {browserStatus.browser_active ? '🟢 Active' : '🔴 Inactive'}
                      {browserStatus.current_url && (
                        <div className="mt-1 truncate">URL: {browserStatus.current_url}</div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={markCurrentJobComplete}
                      className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 text-sm"
                    >
                      ✓ Application Submitted
                    </button>
                    <button
                      onClick={markCurrentJobFailed}
                      className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 text-sm"
                    >
                      ✗ Mark as Failed
                    </button>
                  </div>
                </div>
              )}

              {automationStatus === 'manual_fallback' && (
                <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
                  <h4 className="font-medium text-orange-800 mb-2">🔧 Manual Application Mode</h4>
                  <p className="text-orange-700 text-sm mb-4">
                    Visual automation is not available (ChromeDriver not installed). The job application page has been opened in a new tab for manual completion.
                  </p>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={markCurrentJobComplete}
                      className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 text-sm"
                    >
                      ✓ Application Submitted
                    </button>
                    <button
                      onClick={markCurrentJobFailed}
                      className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 text-sm"
                    >
                      ✗ Mark as Failed
                    </button>
                  </div>
                </div>
              )}

              {(automationStatus === 'waiting_for_submit' || automationStatus === 'awaiting_user_confirmation') && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">Action Required</h4>
                  <p className="text-yellow-700 text-sm mb-4">
                    The application form has been opened in a new tab and filled with your information. 
                    Please review the details and click Submit on that page, then return here.
                  </p>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={markCurrentJobComplete}
                      className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 text-sm"
                    >
                      ✓ Application Submitted
                    </button>
                    <button
                      onClick={markCurrentJobFailed}
                      className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 text-sm"
                    >
                      ✗ Mark as Failed
                    </button>
                  </div>
                </div>
              )}
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