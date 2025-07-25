import { useState, useEffect } from 'react'
import { fetchUserProfiles, deleteProfile } from '../utils/apiWithAuth'

function ProfileSelector({ selectedProfile, onProfileSelect }) {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    try {
      setLoading(true)
      const response = await fetchUserProfiles()
      const userProfiles = response.profiles || []
      setProfiles(userProfiles)
      
      // Auto-select first profile if none selected  
      if (!selectedProfile && userProfiles.length > 0) {
        onProfileSelect(userProfiles[0])
      }
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
      
      // If the deleted profile was selected, clear selection or select first remaining
      if (selectedProfile?.id === profileId) {
        if (updatedProfiles.length > 0) {
          onProfileSelect(updatedProfiles[0])
        } else {
          onProfileSelect(null)
        }
      }
      
    } catch (err) {
      setError('Failed to delete profile')
      console.error('Profile deletion error:', err)
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center space-x-2">
          <div className="loading-spinner"></div>
          <span>Loading profiles...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-red-700 text-sm">{error}</p>
        <button 
          onClick={loadProfiles}
          className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (profiles.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-2">
          <div className="text-yellow-600">⚠️</div>
          <div>
            <p className="text-yellow-800 font-medium">No profiles found</p>
            <p className="text-yellow-700 text-sm">Please upload and parse your resume first in the Resume Upload section.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Select Profile</h3>
        <span className="text-sm text-gray-500">{profiles.length} profile{profiles.length !== 1 ? 's' : ''} available</span>
      </div>
      
      {/* Success/Error Messages */}
      {message && (
        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-700 text-sm">{message}</p>
        </div>
      )}
      
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
      
      <div className="space-y-2">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            onClick={() => onProfileSelect(profile)}
            className={`p-3 rounded-lg cursor-pointer transition-colors ${
              selectedProfile?.id === profile.id
                ? 'bg-blue-50 border-2 border-blue-500'
                : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full ${
                      selectedProfile?.id === profile.id ? 'bg-blue-500' : 'bg-gray-300'
                    }`}></div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{profile.title}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>
                        {profile.full_name || 'No Name'}
                      </span>
                      <span>
                        {profile.email || 'No email'}
                      </span>
                      <span>
                        Created {new Date(profile.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteProfile(profile.id, profile.title)
                  }}
                  disabled={deleting === profile.id}
                  className="px-3 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                  title="Delete profile"
                >
                  {deleting === profile.id ? '...' : '🗑️ Delete'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {selectedProfile && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm">
            ✓ Using profile: <strong>{selectedProfile.title}</strong> for job applications
          </p>
        </div>
      )}
    </div>
  )
}

export default ProfileSelector