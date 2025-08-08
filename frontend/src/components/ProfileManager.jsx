import { useState, useEffect } from 'react'
import { fetchUserProfiles, deleteProfile, parseResume, fetchProfileById, updateProfile } from '../utils/apiWithAuth'
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
  
  // Profile name editing states
  const [editingProfileName, setEditingProfileName] = useState(null)
  const [newProfileName, setNewProfileName] = useState('')

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

  const handleSaveSection = async (updatedData) => {
    console.log('🔍 handleSaveSection called with:', updatedData)
    console.log('📋 Profile ID being updated:', viewingProfile.id)
    try {
      // Save changes to database
      console.log('📡 Calling updateProfile API...')
      const updatedProfile = await updateProfile(viewingProfile.id, updatedData)
      console.log('✅ Profile update successful:', updatedProfile)
      console.log('🔍 Response details:', JSON.stringify(updatedProfile, null, 2))
      
      // Update local state with returned data
      setViewingProfile(updatedProfile)
      setEditedData(updatedProfile)
      setEditingSection(null)
      
      // Update the profiles list with updated data
      const updatedProfiles = profiles.map(profile => 
        profile.id === updatedProfile.id 
          ? { ...profile, title: updatedProfile.title, updated_at: updatedProfile.updated_at }
          : profile
      )
      setProfiles(updatedProfiles)
      
      // Show success message
      setMessage('Profile updated successfully!')
      setTimeout(() => setMessage(null), 3000)
      
    } catch (err) {
      setError('Failed to save profile changes')
      console.error('❌ Profile update error:', err)
      console.error('❌ Error details:', err.response?.data || err.message)
    }
  }

  const handleCancelEdit = () => {
    setEditingSection(null)
    setEditedData(null)
  }

  const handleEditProfileName = (profile) => {
    setEditingProfileName(profile.id)
    setNewProfileName(profile.title)
  }

  const handleSaveProfileName = async (profileId) => {
    try {
      const updatedProfile = await updateProfile(profileId, { title: newProfileName })
      
      // Update local state
      const updatedProfiles = profiles.map(profile => 
        profile.id === profileId 
          ? { ...profile, title: updatedProfile.title, updated_at: updatedProfile.updated_at }
          : profile
      )
      setProfiles(updatedProfiles)
      
      // Update viewing profile if it's the same one
      if (viewingProfile?.id === profileId) {
        setViewingProfile({ ...viewingProfile, title: updatedProfile.title })
      }
      
      setEditingProfileName(null)
      setNewProfileName('')
      setMessage('Profile name updated successfully!')
      setTimeout(() => setMessage(null), 3000)
      
    } catch (err) {
      setError('Failed to update profile name')
      console.error('Profile name update error:', err)
    }
  }

  const handleCancelProfileNameEdit = () => {
    setEditingProfileName(null)
    setNewProfileName('')
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
                    {editingProfileName === profile.id ? (
                      <div className="flex items-center space-x-2 mb-2">
                        <input
                          type="text"
                          value={newProfileName}
                          onChange={(e) => setNewProfileName(e.target.value)}
                          className="flex-1 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveProfileName(profile.id)
                            }
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveProfileName(profile.id)}
                          className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleCancelProfileNameEdit}
                          className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-900">{profile.title}</h3>
                        <button
                          onClick={() => handleEditProfileName(profile)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit profile name"
                        >
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                          </svg>
                        </button>
                      </div>
                    )}
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
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                {editingProfileName === viewingProfile.id ? (
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      className="px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-white text-gray-900 bg-white text-lg font-bold flex-1"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveProfileName(viewingProfile.id)
                        }
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveProfileName(viewingProfile.id)}
                      className="px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
                    >
                      ✓ Save
                    </button>
                    <button
                      onClick={handleCancelProfileNameEdit}
                      className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <div>
                      <h2 className="text-xl font-bold text-white">{viewingProfile.title}</h2>
                      <p className="text-blue-100 text-sm mt-1">
                        {viewingProfile.personal_information?.basic_information?.first_name} {viewingProfile.personal_information?.basic_information?.last_name}
                      </p>
                    </div>
                    <button
                      onClick={() => handleEditProfileName(viewingProfile)}
                      className="text-blue-200 hover:text-white transition-colors p-1"
                      title="Edit profile name"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setViewingProfile(null)}
                className="text-white hover:text-blue-200 bg-blue-800 hover:bg-blue-900 px-3 py-1 rounded-md text-sm transition-colors ml-4"
              >
                ✕ Close
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6">
          
          {/* Personal Information */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <span className="text-blue-600">👤</span>
                <span>Personal Information</span>
              </h3>
              <button
                onClick={() => handleEditSection('personal')}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm font-medium transition-colors shadow-sm"
              >
                ✏️ Edit
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
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
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
                <div key={`citizenship-${viewingProfile.updated_at}`}>
                  <label className="block text-sm font-medium text-gray-700">Citizenship</label>
                  <p className="text-gray-900">{viewingProfile.personal_information?.citizenship || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Work Experience */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <span className="text-blue-600">💼</span>
                <span>Work Experience</span>
              </h3>
              <button
                onClick={() => handleEditSection('work')}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm font-medium transition-colors shadow-sm"
              >
                ✏️ Edit
              </button>
            </div>
            {viewingProfile.work_experience && viewingProfile.work_experience.length > 0 ? (
              <div className="space-y-4">
                {viewingProfile.work_experience.map((exp, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-3">
                      <div className="text-blue-600 text-xl mt-1">💼</div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{exp.title}</h4>
                        <p className="text-blue-700 font-medium">{exp.company}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span>📅 {exp.start_date} - {exp.end_date || 'Present'}</span>
                          {exp.location && <span>📍 {exp.location}</span>}
                        </div>
                        {exp.description && (
                          <p className="text-sm text-gray-700 mt-2 leading-relaxed">{exp.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-gray-400 text-4xl mb-2">💼</div>
                <p className="text-gray-500 text-sm">No work experience added yet</p>
                <p className="text-gray-400 text-xs mt-1">Click Edit to add your professional experience</p>
              </div>
            )}
          </div>

          {/* Education */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <span className="text-green-600">🎓</span>
                <span>Education</span>
              </h3>
              <button
                onClick={() => handleEditSection('education')}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm font-medium transition-colors shadow-sm"
              >
                ✏️ Edit
              </button>
            </div>
            {viewingProfile.education && viewingProfile.education.length > 0 ? (
              <div className="space-y-4">
                {viewingProfile.education.map((edu, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-green-50 to-green-100 hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-3">
                      <div className="text-green-600 text-xl mt-1">🎓</div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{edu.degree}</h4>
                        <p className="text-green-700 font-medium">{edu.school}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span>📅 {edu.start_date} - {edu.end_date || 'Present'}</span>
                          {edu.gpa && <span>🏅 GPA: {edu.gpa}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-gray-400 text-4xl mb-2">🎓</div>
                <p className="text-gray-500 text-sm">No education added yet</p>
                <p className="text-gray-400 text-xs mt-1">Click Edit to add your educational background</p>
              </div>
            )}
          </div>

          {/* Skills */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <span className="text-purple-600">🚀</span>
                <span>Skills</span>
              </h3>
              <button
                onClick={() => handleEditSection('skills')}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm font-medium transition-colors shadow-sm"
              >
                ✏️ Edit
              </button>
            </div>
            {viewingProfile.skills && viewingProfile.skills.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {viewingProfile.skills.map((skill, index) => (
                  <div key={index} className="bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 px-4 py-2 rounded-full text-sm font-medium shadow-sm hover:shadow-md transition-shadow">
                    <span className="flex items-center space-x-1">
                      <span>🚀</span>
                      <span>{typeof skill === 'object' ? skill.name : skill}</span>
                      {typeof skill === 'object' && skill.years && (
                        <span className="text-purple-600 text-xs">({skill.years}y)</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-gray-400 text-4xl mb-2">🚀</div>
                <p className="text-gray-500 text-sm">No skills added yet</p>
                <p className="text-gray-400 text-xs mt-1">Click Edit to add your technical and soft skills</p>
              </div>
            )}
          </div>

          {/* Languages */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <span className="text-teal-600">🌍</span>
                <span>Languages</span>
              </h3>
              <button
                onClick={() => handleEditSection('languages')}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm font-medium transition-colors shadow-sm"
              >
                ✏️ Edit
              </button>
            </div>
            {viewingProfile.languages && viewingProfile.languages.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {viewingProfile.languages.map((language, index) => {
                  // Handle both old string format and new object format
                  const languageName = typeof language === 'string' ? language : language.name
                  const proficiency = typeof language === 'object' ? language.proficiency : ''
                  
                  return (
                    <div key={index} className="bg-gradient-to-r from-teal-100 to-teal-200 text-teal-800 px-4 py-2 rounded-full text-sm font-medium shadow-sm flex items-center space-x-1">
                      <span>🌍</span>
                      <span>{languageName}</span>
                      {proficiency && (
                        <span className="text-teal-600 text-xs bg-teal-200 px-2 py-0.5 rounded-full ml-2">
                          {proficiency}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-gray-400 text-4xl mb-2">🌍</div>
                <p className="text-gray-500 text-sm">No languages added yet</p>
                <p className="text-gray-400 text-xs mt-1">Click Edit to add the languages you speak</p>
              </div>
            )}
          </div>

          {/* Job Preferences */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <span className="text-indigo-600">⚙️</span>
                <span>Job Preferences</span>
              </h3>
              <button
                onClick={() => handleEditSection('preferences')}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm font-medium transition-colors shadow-sm"
              >
                ✏️ Edit
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
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Salary</label>
                <p className="text-gray-900">{viewingProfile.job_preferences?.current_salary || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Expected Salary</label>
                <p className="text-gray-900">{viewingProfile.job_preferences?.expected_salary || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Willing to Relocate</label>
                <p className="text-gray-900">{viewingProfile.job_preferences?.willing_to_relocate || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Driving License</label>
                <p className="text-gray-900">{viewingProfile.job_preferences?.driving_license || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Visa Requirement</label>
                <p className="text-gray-900">{viewingProfile.job_preferences?.visa_requirement || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Other URL</label>
                <p className="text-gray-900 break-all">{viewingProfile.job_preferences?.other_url || 'Not provided'}</p>
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <span className="text-yellow-600">🏆</span>
                <span>Achievements & Awards</span>
              </h3>
              <button
                onClick={() => handleEditSection('achievements')}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm font-medium transition-colors shadow-sm"
              >
                ✏️ Edit
              </button>
            </div>
            {viewingProfile.achievements && viewingProfile.achievements.length > 0 ? (
              <div className="space-y-4">
                {viewingProfile.achievements.map((achievement, index) => (
                  <div key={index} className="border-l-4 border-yellow-500 pl-4 bg-yellow-50 p-4 rounded-r-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 flex items-center">
                          🏆 {achievement.title}
                        </h4>
                        {achievement.issuer && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Issued by:</span> {achievement.issuer}
                          </p>
                        )}
                        {achievement.date && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Date:</span> {achievement.date}
                          </p>
                        )}
                        {achievement.description && (
                          <p className="text-sm text-gray-700 mt-2 italic">
                            {achievement.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-gray-400 text-4xl mb-2">🏆</div>
                <p className="text-gray-500 text-sm">No achievements added yet</p>
                <p className="text-gray-400 text-xs mt-1">Click Edit to add your achievements and awards</p>
              </div>
            )}
          </div>

          {/* Certificates */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <span className="text-blue-600">📜</span>
                <span>Certificates & Credentials</span>
              </h3>
              <button
                onClick={() => handleEditSection('certificates')}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm font-medium transition-colors shadow-sm"
              >
                ✏️ Edit
              </button>
            </div>
            {viewingProfile.certificates && viewingProfile.certificates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {viewingProfile.certificates.map((cert, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-blue-50 hover:bg-blue-100 transition-colors">
                    <div className="flex items-start space-x-3">
                      <div className="text-blue-600 text-2xl mt-1">📜</div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{cert.name}</h4>
                        
                        {(cert.organization || cert.school) && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Issued by:</span> {cert.organization || cert.school}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                          {cert.issue_date && (
                            <span>📅 Issued: {cert.issue_date}</span>
                          )}
                          {cert.expiry_date && (
                            <span>⏰ Expires: {cert.expiry_date}</span>
                          )}
                        </div>
                        
                        {cert.credential_id && (
                          <p className="text-xs text-gray-500 mt-2">
                            <span className="font-medium">ID:</span> {cert.credential_id}
                          </p>
                        )}
                        
                        {cert.credential_url && (
                          <a 
                            href={cert.credential_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            🔗 View Credential
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-gray-400 text-4xl mb-2">📜</div>
                <p className="text-gray-500 text-sm">No certificates added yet</p>
                <p className="text-gray-400 text-xs mt-1">Click Edit to add your professional certificates</p>
              </div>
            )}
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