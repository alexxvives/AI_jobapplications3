import { useState, useEffect } from 'react'
import { startJobAutomation, checkUserProfile, markJobComplete, getBrowserStatus } from '../utils/apiWithAuth'

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
    
    // Start with the first job
    await processNextJob()
  }

  const processNextJob = async () => {
    if (currentJobIndex >= selectedJobsArray.length) {
      setAutomationStatus('completed')
      return
    }

    const currentJob = selectedJobsArray[currentJobIndex]
    
    try {
      setAutomationStatus('running')
      
      // Call backend to start automation for this job
      const response = await startJobAutomation({
        job: currentJob,
        profile: userProfile
      })

      if (response.success) {
        console.log('Automation response received:', response)
        setCurrentInstructions(response.instructions || [])
        setCurrentSessionId(response.session_id)
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
          {(automationStatus === 'running' || automationStatus === 'waiting_for_submit' || automationStatus === 'visual_automation_active' || automationStatus === 'manual_fallback') && currentJob && (
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

              {automationStatus === 'waiting_for_submit' && (
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