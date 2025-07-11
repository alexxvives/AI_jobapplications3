import { useState } from 'react'
import { generateCoverLetter } from '../utils/apiWithAuth'

function CoverLetterGenerator() {
  const [userProfile, setUserProfile] = useState('')
  const [jobDetails, setJobDetails] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Sample data for quick testing
  const sampleProfile = {
    "full_name": "John Doe",
    "email": "john.doe@email.com",
    "phone": "(555) 123-4567",
    "work_experience": [
      {
        "title": "Software Engineer",
        "company": "Tech Corp",
        "location": "San Francisco, CA",
        "start_date": "2021-01",
        "end_date": null,
        "description": "Developed web applications using React and Node.js"
      }
    ],
    "skills": [
      {"name": "JavaScript", "years": 5},
      {"name": "React", "years": 3},
      {"name": "Node.js", "years": 3}
    ],
    "education": [
      {
        "degree": "Bachelor of Science in Computer Science",
        "school": "University of California",
        "start_date": "2017-09",
        "end_date": "2021-05"
      }
    ]
  }

  const sampleJob = {
    "title": "Senior Software Engineer",
    "company": "Innovation Labs",
    "location": "Remote",
    "description": "We are looking for a Senior Software Engineer to join our team. You will be responsible for developing scalable web applications using modern JavaScript frameworks. Experience with React and Node.js is required."
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
    setCoverLetter('')

    try {
      // Parse JSON inputs
      const profileData = JSON.parse(userProfile)
      const jobData = JSON.parse(jobDetails)

      const response = await generateCoverLetter(profileData, jobData)
      
      if (response.success) {
        setCoverLetter(response.cover_letter)
      } else {
        setError(response.error || 'Failed to generate cover letter')
      }
    } catch (err) {
      console.error('Cover letter generation error:', err)
      if (err.name === 'SyntaxError') {
        setError('Invalid JSON format. Please check your input.')
      } else {
        setError(err.response?.data?.detail || 'Failed to generate cover letter')
      }
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(coverLetter)
    alert('Cover letter copied to clipboard!')
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Cover Letter Generator</h1>
      
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">How to Use</h2>
        <ol className="list-decimal list-inside text-blue-800 space-y-1">
          <li>Provide your user profile data in JSON format (from resume parsing or manual entry)</li>
          <li>Provide the job details in JSON format</li>
          <li>Click "Generate Cover Letter" to create a personalized cover letter</li>
          <li>You can use the "Load Sample Data" button to test with example data</li>
        </ol>
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
              placeholder='{"full_name": "John Doe", "email": "john@example.com", ...}'
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
              placeholder='{"title": "Software Engineer", "company": "Tech Corp", "description": "...", ...}'
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
            {loading ? 'Generating...' : 'Generate Cover Letter'}
          </button>
        </form>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-center space-x-4">
            <div className="loading-spinner"></div>
            <div>
              <p className="text-gray-700">Generating your cover letter...</p>
              <p className="text-sm text-gray-500">Our AI is crafting a personalized cover letter for you.</p>
            </div>
          </div>
        </div>
      )}

      {/* Generated Cover Letter */}
      {coverLetter && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Generated Cover Letter</h2>
            <button
              onClick={copyToClipboard}
              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 text-sm"
            >
              Copy to Clipboard
            </button>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-6">
            <pre className="whitespace-pre-wrap text-gray-800 font-sans leading-relaxed">
              {coverLetter}
            </pre>
          </div>

          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500 mb-2">
              Tip: Review and customize the generated cover letter before using it in your application.
            </p>
            <button
              onClick={() => {
                const blob = new Blob([coverLetter], { type: 'text/plain' })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = 'cover_letter.txt'
                link.click()
                URL.revokeObjectURL(url)
              }}
              className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 text-sm"
            >
              Download as Text File
            </button>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Tips for Better Cover Letters</h2>
        <ul className="list-disc list-inside text-gray-700 space-y-2">
          <li>Ensure your user profile includes relevant work experience and skills</li>
          <li>Provide detailed job descriptions for better personalization</li>
          <li>Review and edit the generated cover letter to match your voice</li>
          <li>Customize the opening and closing paragraphs for each application</li>
          <li>Keep the cover letter concise and focused on relevant experience</li>
        </ul>
      </div>
    </div>
  )
}

export default CoverLetterGenerator