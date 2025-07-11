import { useState } from 'react'
import { generateApplicationInstructions } from '../utils/apiWithAuth'

function ApplicationInstructions() {
  const [userProfile, setUserProfile] = useState('')
  const [jobDetails, setJobDetails] = useState('')
  const [instructions, setInstructions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Sample data for quick testing
  const sampleProfile = {
    "full_name": "Jane Smith",
    "email": "jane.smith@email.com",
    "phone": "(555) 987-6543",
    "address": "123 Main St, San Francisco, CA 94102",
    "work_experience": [
      {
        "title": "Product Manager",
        "company": "StartupXYZ",
        "location": "San Francisco, CA",
        "start_date": "2022-01",
        "end_date": null,
        "description": "Led product development for mobile app with 1M+ users"
      },
      {
        "title": "Associate Product Manager",
        "company": "TechCorp",
        "location": "Palo Alto, CA",
        "start_date": "2020-06",
        "end_date": "2021-12",
        "description": "Managed feature roadmap and worked with engineering teams"
      }
    ],
    "education": [
      {
        "degree": "MBA",
        "school": "Stanford Graduate School of Business",
        "start_date": "2018-09",
        "end_date": "2020-05"
      }
    ],
    "skills": [
      {"name": "Product Management", "years": 4},
      {"name": "Data Analysis", "years": 5},
      {"name": "Agile", "years": 3}
    ],
    "job_preferences": {
      "total_experience": "4 years",
      "notice_period": "2 weeks",
      "visa_requirement": "US Citizen"
    }
  }

  const sampleJob = {
    "title": "Senior Product Manager",
    "company": "Growth Inc",
    "location": "San Francisco, CA",
    "description": "We're seeking a Senior Product Manager to lead our consumer products. You'll work with cross-functional teams to define product strategy and execute on our roadmap.",
    "link": "https://jobs.lever.co/growthinc/senior-pm"
  }

  const loadSampleData = () => {
    setUserProfile(JSON.stringify(sampleProfile, null, 2))
    setJobDetails(JSON.stringify(sampleJob, null, 2))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!userProfile.trim() || !jobDetails.trim()) {
      setError('Please provide both user profile and job details.')
      return
    }

    setLoading(true)
    setError(null)
    setInstructions(null)

    try {
      // Parse JSON inputs
      const profileData = JSON.parse(userProfile)
      const jobData = JSON.parse(jobDetails)

      const response = await generateApplicationInstructions(profileData, jobData)
      
      if (response.success) {
        setInstructions(response.instructions)
      } else {
        setError(response.error || 'Failed to generate application instructions')
      }
    } catch (err) {
      console.error('Application instructions generation error:', err)
      if (err.name === 'SyntaxError') {
        setError('Invalid JSON format. Please check your input.')
      } else {
        setError(err.response?.data?.detail || 'Failed to generate application instructions')
      }
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action) => {
    switch (action) {
      case 'fill_field':
        return '✏️'
      case 'select_option':
        return '📋'
      case 'click':
        return '👆'
      case 'upload_file':
        return '📁'
      case 'wait':
        return '⏳'
      default:
        return '🔧'
    }
  }

  const getActionColor = (action) => {
    switch (action) {
      case 'fill_field':
        return 'bg-blue-50 border-blue-200'
      case 'select_option':
        return 'bg-green-50 border-green-200'
      case 'click':
        return 'bg-purple-50 border-purple-200'
      case 'upload_file':
        return 'bg-orange-50 border-orange-200'
      case 'wait':
        return 'bg-gray-50 border-gray-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Application Instructions Generator</h1>
      
      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-yellow-900 mb-2">How This Works</h2>
        <p className="text-yellow-800 mb-2">
          This tool generates step-by-step automation instructions for filling out job applications. 
          The instructions can be used with browser automation tools like Selenium or Chrome extensions.
        </p>
        <ul className="list-disc list-inside text-yellow-800 space-y-1">
          <li>Provide your complete profile data and job details</li>
          <li>The AI will generate field mappings and form-filling instructions</li>
          <li>Instructions include selectors, values, and estimated completion time</li>
          <li>Use these instructions with automation tools for faster applications</li>
        </ul>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Input Data</h2>
            <button
              type="button"
              onClick={loadSampleData}
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 text-sm"
            >
              Load Sample Data
            </button>
          </div>

          <div>
            <label htmlFor="userProfile" className="block text-sm font-medium text-gray-700 mb-1">
              User Profile (JSON) *
            </label>
            <textarea
              id="userProfile"
              value={userProfile}
              onChange={(e) => setUserProfile(e.target.value)}
              placeholder='{"full_name": "Jane Smith", "email": "jane@example.com", "work_experience": [...], ...}'
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="jobDetails" className="block text-sm font-medium text-gray-700 mb-1">
              Job Details (JSON) *
            </label>
            <textarea
              id="jobDetails"
              value={jobDetails}
              onChange={(e) => setJobDetails(e.target.value)}
              placeholder='{"title": "Product Manager", "company": "Growth Inc", "link": "https://...", ...}'
              className="w-full h-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating Instructions...' : 'Generate Application Instructions'}
          </button>
        </form>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-center space-x-4">
            <div className="loading-spinner"></div>
            <div>
              <p className="text-gray-700">Generating application instructions...</p>
              <p className="text-sm text-gray-500">Analyzing job requirements and mapping profile data to form fields.</p>
            </div>
          </div>
        </div>
      )}

      {/* Generated Instructions */}
      {instructions && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Generated Application Instructions</h2>
          
          {/* Summary */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {instructions.instructions?.length || 0}
                </div>
                <div className="text-sm text-blue-700">Steps</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {instructions.estimated_time || 'N/A'}
                </div>
                <div className="text-sm text-green-700">Estimated Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {instructions.success_probability ? `${Math.round(instructions.success_probability * 100)}%` : 'N/A'}
                </div>
                <div className="text-sm text-purple-700">Success Rate</div>
              </div>
            </div>
          </div>

          {/* Instructions List */}
          {instructions.instructions && instructions.instructions.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Step-by-Step Instructions</h3>
              {instructions.instructions.map((instruction, index) => (
                <div 
                  key={index} 
                  className={`border rounded-lg p-4 ${getActionColor(instruction.action)}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <span className="text-lg">{getActionIcon(instruction.action)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900">Step {index + 1}:</span>
                        <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs">
                          {instruction.action}
                        </span>
                        {instruction.field_type && (
                          <span className="bg-blue-200 text-blue-700 px-2 py-1 rounded text-xs">
                            {instruction.field_type}
                          </span>
                        )}
                      </div>
                      
                      {instruction.selector && (
                        <div className="mb-2">
                          <span className="text-sm text-gray-600">Selector: </span>
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                            {instruction.selector}
                          </code>
                        </div>
                      )}
                      
                      {instruction.value && (
                        <div className="mb-2">
                          <span className="text-sm text-gray-600">Value: </span>
                          <span className="font-medium text-gray-900">"{instruction.value}"</span>
                        </div>
                      )}
                      
                      {instruction.description && (
                        <p className="text-sm text-gray-700">{instruction.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No instructions generated. Please try with different input data.</p>
            </div>
          )}

          {/* Download Instructions */}
          <div className="mt-6 pt-6 border-t">
            <button
              onClick={() => {
                const dataStr = JSON.stringify(instructions, null, 2)
                const dataBlob = new Blob([dataStr], { type: 'application/json' })
                const url = URL.createObjectURL(dataBlob)
                const link = document.createElement('a')
                link.href = url
                link.download = 'application_instructions.json'
                link.click()
                URL.revokeObjectURL(url)
              }}
              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 text-sm mr-3"
            >
              Download Instructions (JSON)
            </button>
            
            <button
              onClick={() => {
                const textInstructions = instructions.instructions
                  ?.map((inst, i) => `${i + 1}. ${inst.action}: ${inst.selector} = "${inst.value}"`)
                  .join('\n') || 'No instructions'
                
                const blob = new Blob([textInstructions], { type: 'text/plain' })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = 'application_instructions.txt'
                link.click()
                URL.revokeObjectURL(url)
              }}
              className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 text-sm"
            >
              Download Instructions (TXT)
            </button>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Using the Instructions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Selenium Integration</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
              <li>Use the selectors to find form elements</li>
              <li>Apply the values using WebDriver methods</li>
              <li>Handle dropdowns with Select classes</li>
              <li>Add waits between actions for stability</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Chrome Extension</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
              <li>Inject content scripts to manipulate forms</li>
              <li>Use document.querySelector with provided selectors</li>
              <li>Handle events and form validation</li>
              <li>Provide user feedback during automation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ApplicationInstructions