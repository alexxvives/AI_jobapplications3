import { useState } from 'react'
import { parseResume } from '../utils/apiWithAuth'
import SectionEditForm from './SectionEditForm'

function ResumeUpload() {
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('Resume Profile')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [editingSection, setEditingSection] = useState(null)
  const [editedData, setEditedData] = useState(null)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Please upload a PDF, DOC, DOCX, or TXT file.')
        setFile(null)
        return
      }
      
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB.')
        setFile(null)
        return
      }
      
      setFile(selectedFile)
      setError(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await parseResume(file, title)
      if (response.success) {
        setResult(response.profile)
      } else {
        setError(response.error || 'Failed to parse resume')
      }
    } catch (err) {
      console.error('Resume upload error:', err)
      setError(err.response?.data?.detail || 'Failed to upload and parse resume')
    } finally {
      setLoading(false)
    }
  }

  const formatJsonField = (field) => {
    if (Array.isArray(field)) {
      return field.length > 0 ? field : 'None'
    }
    if (typeof field === 'object' && field !== null) {
      const entries = Object.entries(field).filter(([key, value]) => value)
      return entries.length > 0 ? entries : 'None'
    }
    return field || 'Not provided'
  }

  const handleEditSection = (section) => {
    setEditingSection(section)
    setEditedData(result)
  }

  const handleSaveSection = (updatedData) => {
    setResult(updatedData)
    setEditedData(updatedData)
    setEditingSection(null)
  }

  const handleCancelEdit = () => {
    setEditingSection(null)
    setEditedData(null)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Resume Upload & Parsing</h1>
      
      {/* Upload Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Profile Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for this profile"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
              Resume File *
            </label>
            <input
              type="file"
              id="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.txt"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Supported formats: PDF, DOC, DOCX, TXT (max 10MB)
            </p>
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          <button
            type="submit"
            disabled={!file || loading}
            className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Parsing Resume...' : 'Upload & Parse Resume'}
          </button>
        </form>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-center space-x-4">
            <div className="loading-spinner"></div>
            <div>
              <p className="text-gray-700">Processing your resume...</p>
              <p className="text-sm text-gray-500">This may take a few moments while our AI extracts the information.</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !editingSection && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Parsed Resume Data</h2>
          </div>
          
          {/* Personal Information */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
              <button
                onClick={() => handleEditSection('personal')}
                className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 text-sm"
              >
                Edit
              </button>
            </div>
            
            {/* Basic Information */}
            <div className="mb-4">
              <h4 className="text-md font-medium text-gray-800 mb-2">Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <p className="text-gray-900">{result.personal_information?.basic_information?.first_name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <p className="text-gray-900">{result.personal_information?.basic_information?.last_name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Gender</label>
                  <p className="text-gray-900">{result.personal_information?.basic_information?.gender || 'Not provided'}</p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="mb-4">
              <h4 className="text-md font-medium text-gray-800 mb-2">Contact Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{result.personal_information?.contact_information?.email || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Country Code</label>
                  <p className="text-gray-900">{result.personal_information?.contact_information?.country_code || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Telephone</label>
                  <p className="text-gray-900">{result.personal_information?.contact_information?.telephone || 'Not provided'}</p>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="mb-4">
              <h4 className="text-md font-medium text-gray-800 mb-2">Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <p className="text-gray-900">{result.personal_information?.address?.address || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">City</label>
                  <p className="text-gray-900">{result.personal_information?.address?.city || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">State</label>
                  <p className="text-gray-900">{result.personal_information?.address?.state || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Zip Code</label>
                  <p className="text-gray-900">{result.personal_information?.address?.zip_code || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Country</label>
                  <p className="text-gray-900">{result.personal_information?.address?.country || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Citizenship</label>
                  <p className="text-gray-900">{result.personal_information?.address?.citizenship || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Work Experience */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-900">Work Experience</h3>
              <button
                onClick={() => handleEditSection('work')}
                className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 text-sm"
              >
                Edit
              </button>
            </div>
            {result.work_experience && result.work_experience.length > 0 ? (
              <div className="space-y-4">
                {result.work_experience.map((exp, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium text-gray-900">{exp.title} at {exp.company}</h4>
                    <p className="text-sm text-gray-600">
                      {exp.start_date} - {exp.end_date || 'Present'}
                      {exp.location && ` • ${exp.location}`}
                    </p>
                    {exp.description && <p className="text-sm text-gray-700 mt-1">{exp.description}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No work experience found</p>
            )}
          </div>

          {/* Education */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-900">Education</h3>
              <button
                onClick={() => handleEditSection('education')}
                className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 text-sm"
              >
                Edit
              </button>
            </div>
            {result.education && result.education.length > 0 ? (
              <div className="space-y-3">
                {result.education.map((edu, index) => (
                  <div key={index} className="border-l-4 border-green-500 pl-4">
                    <h4 className="font-medium text-gray-900">{edu.degree}</h4>
                    <p className="text-sm text-gray-600">
                      {edu.school} • {edu.start_date} - {edu.end_date || 'Present'}
                      {edu.gpa && ` • GPA: ${edu.gpa}`}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No education information found</p>
            )}
          </div>

          {/* Skills */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-900">Skills</h3>
              <button
                onClick={() => handleEditSection('skills')}
                className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 text-sm"
              >
                Edit
              </button>
            </div>
            {result.skills && result.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {result.skills.map((skill, index) => (
                  <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {typeof skill === 'object' ? skill.name : skill}
                    {typeof skill === 'object' && skill.years && ` (${skill.years} years)`}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No skills found</p>
            )}
          </div>

          {/* Languages */}
          {result.languages && result.languages.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Languages</h3>
              <div className="flex flex-wrap gap-2">
                {result.languages.map((language, index) => (
                  <span key={index} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                    {language}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Job Preferences */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-900">Job Preferences</h3>
              <button
                onClick={() => handleEditSection('preferences')}
                className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 text-sm"
              >
                Edit
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">LinkedIn</label>
                <p className="text-gray-900 break-all">{result.job_preferences?.linkedin_link || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">GitHub</label>
                <p className="text-gray-900 break-all">{result.job_preferences?.github_link || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Portfolio</label>
                <p className="text-gray-900 break-all">{result.job_preferences?.portfolio_link || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Other URL</label>
                <p className="text-gray-900 break-all">{result.job_preferences?.other_url || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Salary</label>
                <p className="text-gray-900">{result.job_preferences?.current_salary || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Expected Salary</label>
                <p className="text-gray-900">{result.job_preferences?.expected_salary || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notice Period</label>
                <p className="text-gray-900">{result.job_preferences?.notice_period || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Work Experience</label>
                <p className="text-gray-900">{result.job_preferences?.total_work_experience || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Highest Education</label>
                <p className="text-gray-900">{result.job_preferences?.highest_education || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Willing to Relocate</label>
                <p className="text-gray-900">{result.job_preferences?.willing_to_relocate || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Driving License</label>
                <p className="text-gray-900">{result.job_preferences?.driving_license || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Visa Requirement</label>
                <p className="text-gray-900">{result.job_preferences?.visa_requirement || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Veteran Status</label>
                <p className="text-gray-900">{result.job_preferences?.veteran_status || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Disability</label>
                <p className="text-gray-900">{result.job_preferences?.disability || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Race/Ethnicity</label>
                <p className="text-gray-900">{result.job_preferences?.race_ethnicity || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Security Clearance</label>
                <p className="text-gray-900">{result.job_preferences?.security_clearance || 'Not provided'}</p>
              </div>
            </div>
          </div>

          {/* Download JSON */}
          <div className="mt-6 pt-6 border-t">
            <button
              onClick={() => {
                const dataStr = JSON.stringify(result, null, 2)
                const dataBlob = new Blob([dataStr], {type: 'application/json'})
                const url = URL.createObjectURL(dataBlob)
                const link = document.createElement('a')
                link.href = url
                link.download = `${title.replace(/\s+/g, '_')}_parsed.json`
                link.click()
                URL.revokeObjectURL(url)
              }}
              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 text-sm"
            >
              Download Parsed Data (JSON)
            </button>
          </div>
        </div>
      )}

      {/* Section-Specific Editable Form */}
      {editingSection && (
        <SectionEditForm
          section={editingSection}
          data={editedData}
          onSave={handleSaveSection}
          onCancel={handleCancelEdit}
        />
      )}
    </div>
  )
}

export default ResumeUpload