import { useState, useEffect } from 'react'
import { fetchUserProfiles, deleteProfile, parseResume, fetchProfileById } from '../utils/apiWithAuth'
import SectionEditForm from './SectionEditForm'

function ProfileManager() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [deleting, setDeleting] = useState(null)
  
  // Upload new resume states
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadTitle, setUploadTitle] = useState('New Profile')
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  
  // Profile viewing states
  const [viewingProfile, setViewingProfile] = useState(null)
  const [editingSection, setEditingSection] = useState(null)
  const [editedData, setEditedData] = useState(null)

  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    try {
      setLoading(true)
      const response = await fetchUserProfiles()
      const userProfiles = response.profiles || []
      setProfiles(userProfiles)
    } catch (err) {
      setError('Failed to load profiles')
      console.error('Profile loading error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProfile = async (profileId, profileTitle) => {
    if (!confirm(`Are you sure you want to delete the profile "${profileTitle}"? This action cannot be undone.`)) {
      return
    }

    try {
      setDeleting(profileId)
      await deleteProfile(profileId)
      
      // Remove from local state
      const updatedProfiles = profiles.filter(p => p.id !== profileId)
      setProfiles(updatedProfiles)
      
      // Show success message
      setMessage(`Profile "${profileTitle}" deleted successfully`)
      setTimeout(() => setMessage(null), 3000)
      
      // Clear viewing if deleted profile was being viewed
      if (viewingProfile?.id === profileId) {
        setViewingProfile(null)
      }
      
    } catch (err) {
      setError('Failed to delete profile')
      console.error('Profile deletion error:', err)
    } finally {
      setDeleting(null)
    }
  }

  const handleViewProfile = async (profile) => {
    try {
      setLoading(true)
      // Get full profile data
      const fullProfile = await fetchProfileById(profile.id)
      setViewingProfile(fullProfile)
      setUploadResult(null) // Clear any upload results
    } catch (err) {
      setError('Failed to load profile details')
      console.error('Profile loading error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Please upload a PDF, DOC, DOCX, or TXT file.')
        setUploadFile(null)
        return
      }
      
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB.')
        setUploadFile(null)
        return
      }
      
      setUploadFile(selectedFile)
      setError(null)
    }
  }

  const handleUploadSubmit = async (e) => {
    e.preventDefault()
    if (!uploadFile) return

    setUploading(true)
    setError(null)
    setUploadResult(null)

    try {
      const response = await parseResume(uploadFile, uploadTitle)
      if (response.success) {
        setUploadResult(response.profile)
        setMessage(`Profile "${uploadTitle}" created successfully`)
        setTimeout(() => setMessage(null), 3000)
        
        // Reset upload form
        setUploadFile(null)
        setUploadTitle('New Profile')
        
        // Reload profiles to show the new one
        await loadProfiles()
      } else {
        setError(response.error || 'Failed to parse resume')
      }
    } catch (err) {
      console.error('Resume upload error:', err)
      setError(err.response?.data?.detail || 'Failed to upload and parse resume')
    } finally {
      setUploading(false)
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
    setEditedData(viewingProfile)
  }

  const handleSaveSection = (updatedData) => {
    setViewingProfile(updatedData)
    setEditedData(updatedData)
    setEditingSection(null)
  }

  const handleCancelEdit = () => {
    setEditingSection(null)
    setEditedData(null)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile Management</h1>
      
      {/* Success/Error Messages */}
      {message && (
        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-700 text-sm">{message}</p>
        </div>
      )}
      
      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Upload New Resume Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Upload New Resume</h2>
        <p className="text-gray-600 mb-4">Create a new profile by uploading your resume. Our AI will extract and structure your information automatically.</p>
        
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Profile Title
            </label>
            <input
              type="text"
              id="title"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
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
          
          <button
            type="submit"
            disabled={!uploadFile || uploading}
            className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Parsing Resume...' : 'Upload & Create Profile'}
          </button>
        </form>
      </div>

      {/* Profiles List */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Your Profiles</h2>
          <span className="text-sm text-gray-500">{profiles.length} profile{profiles.length !== 1 ? 's' : ''}</span>
        </div>
        
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="loading-spinner mr-3"></div>
            <span>Loading profiles...</span>
          </div>
        )}
        
        {!loading && profiles.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">You don't have any profiles yet.</p>
            <p className="text-sm text-gray-400">Upload your first resume above to get started!</p>
          </div>
        )}
        
        {!loading && profiles.length > 0 && (
          <div className="space-y-3">
            {profiles.map((profile) => (
              <div key={profile.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{profile.title}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      <span>{profile.full_name || 'No Name'}</span>
                      <span>{profile.email || 'No email'}</span>
                      <span>Created {new Date(profile.created_at).toLocaleDateString()}</span>
                      {profile.has_resume && <span className="text-green-600">📄 Resume attached</span>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewProfile(profile)}
                      className="px-3 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      👁️ View
                    </button>
                    <button
                      onClick={() => handleDeleteProfile(profile.id, profile.title)}
                      disabled={deleting === profile.id}
                      className="px-3 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                    >
                      {deleting === profile.id ? '...' : '🗑️ Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Profile Details View */}
      {viewingProfile && !editingSection && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Profile Details</h2>
            <button
              onClick={() => setViewingProfile(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕ Close
            </button>
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
                  <p className="text-gray-900">{viewingProfile.personal_information?.basic_information?.first_name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <p className="text-gray-900">{viewingProfile.personal_information?.basic_information?.last_name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Gender</label>
                  <p className="text-gray-900">{viewingProfile.personal_information?.basic_information?.gender || 'Not provided'}</p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="mb-4">
              <h4 className="text-md font-medium text-gray-800 mb-2">Contact Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{viewingProfile.personal_information?.contact_information?.email || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Country Code</label>
                  <p className="text-gray-900">{viewingProfile.personal_information?.contact_information?.country_code || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Telephone</label>
                  <p className="text-gray-900">{viewingProfile.personal_information?.contact_information?.telephone || 'Not provided'}</p>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="mb-4">
              <h4 className="text-md font-medium text-gray-800 mb-2">Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <p className="text-gray-900">{viewingProfile.personal_information?.address?.address || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">City</label>
                  <p className="text-gray-900">{viewingProfile.personal_information?.address?.city || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">State</label>
                  <p className="text-gray-900">{viewingProfile.personal_information?.address?.state || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Zip Code</label>
                  <p className="text-gray-900">{viewingProfile.personal_information?.address?.zip_code || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Country</label>
                  <p className="text-gray-900">{viewingProfile.personal_information?.address?.country || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Citizenship</label>
                  <p className="text-gray-900">{viewingProfile.personal_information?.address?.citizenship || 'Not provided'}</p>
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
            {viewingProfile.work_experience && viewingProfile.work_experience.length > 0 ? (
              <div className="space-y-4">
                {viewingProfile.work_experience.map((exp, index) => (
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
            {viewingProfile.education && viewingProfile.education.length > 0 ? (
              <div className="space-y-3">
                {viewingProfile.education.map((edu, index) => (
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
            {viewingProfile.skills && viewingProfile.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {viewingProfile.skills.map((skill, index) => (
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
          {viewingProfile.languages && viewingProfile.languages.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Languages</h3>
              <div className="flex flex-wrap gap-2">
                {viewingProfile.languages.map((language, index) => (
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
                <p className="text-gray-900 break-all">{viewingProfile.job_preferences?.linkedin_link || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">GitHub</label>
                <p className="text-gray-900 break-all">{viewingProfile.job_preferences?.github_link || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Portfolio</label>
                <p className="text-gray-900 break-all">{viewingProfile.job_preferences?.portfolio_link || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Experience</label>
                <p className="text-gray-900">{viewingProfile.job_preferences?.total_work_experience || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Highest Education</label>
                <p className="text-gray-900">{viewingProfile.job_preferences?.highest_education || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notice Period</label>
                <p className="text-gray-900">{viewingProfile.job_preferences?.notice_period || 'Not provided'}</p>
              </div>
            </div>
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

export default ProfileManager