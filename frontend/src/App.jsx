import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import JobSearch from './components/JobSearch'
import ModernJobSearch from './components/ModernJobSearch'
import ProfileManager from './components/ProfileManager'
import CoverLetterGenerator from './components/CoverLetterGenerator'
import ApplicationInstructions from './components/ApplicationInstructions'
import Dashboard from './components/Dashboard'
import SimpleAuth from './components/SimpleAuth'

function NavBar({ onLogout, userEmail }) {
  const location = useLocation()
  
  const isActive = (path) => location.pathname === path
  
  return (
    <nav className="bg-blue-600 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl font-bold">AI Job Automation Assistant</h1>
        <div className="flex items-center space-x-4">
          <div className="space-x-4">
            <Link 
              to="/" 
              className={`px-3 py-2 rounded ${isActive('/') ? 'bg-blue-800' : 'hover:bg-blue-500'}`}
            >
              Dashboard
            </Link>
            <Link 
              to="/jobs" 
              className={`px-3 py-2 rounded ${isActive('/jobs') ? 'bg-blue-800' : 'hover:bg-blue-500'}`}
            >
              Job Search
            </Link>
            <Link 
              to="/jobs-modern" 
              className={`px-3 py-2 rounded ${isActive('/jobs-modern') ? 'bg-blue-800' : 'hover:bg-blue-500'}`}
            >
              Modern Search
            </Link>
            <Link 
              to="/resume" 
              className={`px-3 py-2 rounded ${isActive('/resume') ? 'bg-blue-800' : 'hover:bg-blue-500'}`}
            >
              Profiles
            </Link>
            <Link 
              to="/cover-letter" 
              className={`px-3 py-2 rounded ${isActive('/cover-letter') ? 'bg-blue-800' : 'hover:bg-blue-500'}`}
            >
              Cover Letter
            </Link>
            <Link 
              to="/instructions" 
              className={`px-3 py-2 rounded ${isActive('/instructions') ? 'bg-blue-800' : 'hover:bg-blue-500'}`}
            >
              Instructions
            </Link>
          </div>
          <div className="flex items-center space-x-4 border-l border-blue-500 pl-4">
            <span className="text-sm">{userEmail}</span>
            <button
              onClick={onLogout}
              className="px-3 py-1 bg-blue-700 hover:bg-blue-800 rounded text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)

  const handleAuthSuccess = (userData, authToken) => {
    setUser(userData)
    setToken(authToken)
    setIsAuthenticated(true)
    
    // Set up API defaults with auth token
    window.authToken = authToken
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    setUser(null)
    setToken(null)
    setIsAuthenticated(false)
    window.authToken = null
    window.location.reload()
  }

  // Check for existing token on app load
  useEffect(() => {
    const savedToken = localStorage.getItem('authToken')
    if (savedToken && savedToken.trim() !== '') {
      // Add a small delay to ensure backend is ready
      const timeoutId = setTimeout(() => {
        fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${savedToken}`
          }
        })
        .then(response => {
          if (response.ok) {
            return response.json()
          } else {
            throw new Error(`Auth failed: ${response.status}`)
          }
        })
        .then(userData => {
          handleAuthSuccess(userData, savedToken)
        })
        .catch((error) => {
          // Only log if it's not a connection refused error
          if (!error.message.includes('ECONNREFUSED')) {
            console.debug('Auth check failed:', error.message)
          }
          localStorage.removeItem('authToken')
        })
      }, 100) // Small delay to let backend start

      return () => clearTimeout(timeoutId)
    }
  }, [])

  if (!isAuthenticated) {
    return <SimpleAuth onAuthSuccess={handleAuthSuccess} />
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <NavBar onLogout={handleLogout} userEmail={user?.email} />
        <div className="container mx-auto py-8 px-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/jobs" element={<JobSearch />} />
            <Route path="/jobs-modern" element={<ModernJobSearch />} />
            <Route path="/resume" element={<ProfileManager />} />
            <Route path="/cover-letter" element={<CoverLetterGenerator />} />
            <Route path="/instructions" element={<ApplicationInstructions />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App