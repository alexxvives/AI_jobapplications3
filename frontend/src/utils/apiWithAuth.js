import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken') || window.authToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken')
      window.authToken = null
      window.location.reload()
    }
    return Promise.reject(error)
  }
)

// Authentication API calls
export const loginUser = async (email, password) => {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, {
    email,
    password
  })
  return response.data
}

export const signupUser = async (email, password) => {
  const response = await axios.post(`${API_BASE_URL}/auth/signup`, {
    email,
    password
  })
  return response.data
}

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me')
  return response.data
}

// Profile API calls (now with auth)
export const fetchUserProfiles = async () => {
  const response = await api.get('/user/profiles')
  return response.data
}

export const fetchProfileById = async (profileId) => {
  const response = await api.get(`/user/profile/${profileId}`)
  return response.data
}

export const deleteProfile = async (profileId) => {
  const response = await api.delete(`/user/profile/${profileId}`)
  return response.data
}

// Job-related API calls
export const searchJobs = async (title, location = '', limit = 50) => {
  const response = await api.get('/jobs/search', {
    params: { title, location, limit }
  })
  return response.data
}

export const fetchJobsManually = async () => {
  const response = await api.post('/jobs/fetch')
  return response.data
}

export const getJobStats = async () => {
  const response = await api.get('/jobs/stats')
  return response.data
}

// Agent-related API calls (now with auth)
export const parseResume = async (file, title = 'Resume Profile') => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('title', title)
  
  const response = await api.post('/agents/parse-resume', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const generateCoverLetter = async (userProfile, jobDetails) => {
  const response = await api.post('/agents/generate-cover-letter', {
    user_profile: userProfile,
    job_details: jobDetails
  })
  return response.data
}

export const generateApplicationInstructions = async (userProfile, jobDetails) => {
  const response = await api.post('/agents/generate-application-instructions', {
    user_profile: userProfile,
    job_details: jobDetails
  })
  return response.data
}

// Check user profile
export const checkUserProfile = async () => {
  const response = await api.get('/user/profile')
  return response.data
}

// Automation-related API calls (now with auth and profile selection)
export const startJobAutomation = async ({ job, profile }) => {
  try {
    // Start automation session
    const response = await api.post('/automation/start', {
      jobs: [job], // Start with single job
      profile_id: profile.id // Send profile ID instead of full profile object
    })
    
    if (response.data.success) {
      const sessionId = response.data.session_id
      
      // Process the first (and only) job
      const jobResponse = await api.post(`/automation/${sessionId}/next`)
      
      return {
        success: true,
        instructions: jobResponse.data.instructions || [],
        session_id: sessionId,
        job_index: jobResponse.data.job_index,
        total_jobs: jobResponse.data.total_jobs,
        application_url: jobResponse.data.application_url,
        status: jobResponse.data.status,
        fields_filled: jobResponse.data.fields_filled,
        fallback_url: jobResponse.data.fallback_url
      }
    } else {
      throw new Error(response.data.error || 'Failed to start automation')
    }
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.detail || error.message
    }
  }
}

export const markJobComplete = async (sessionId, status, notes = '') => {
  const response = await api.post(`/automation/${sessionId}/complete`, {
    status: status,
    notes: notes
  })
  return response.data
}

export const getAutomationStatus = async (sessionId) => {
  const response = await api.get(`/automation/${sessionId}/status`)
  return response.data
}

export const getBrowserStatus = async (sessionId) => {
  const response = await api.get(`/automation/${sessionId}/browser`)
  return response.data
}

// Health check
export const healthCheck = async () => {
  const response = await api.get('/health')
  return response.data
}

export default api