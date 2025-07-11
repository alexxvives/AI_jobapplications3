import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import JobSearch from './components/JobSearch'
import ResumeUpload from './components/ResumeUpload'
import CoverLetterGenerator from './components/CoverLetterGenerator'
import ApplicationInstructions from './components/ApplicationInstructions'
import Dashboard from './components/Dashboard'

function NavBar() {
  const location = useLocation()
  
  const isActive = (path) => location.pathname === path
  
  return (
    <nav className="bg-blue-600 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl font-bold">AI Job Automation Assistant</h1>
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
            to="/resume" 
            className={`px-3 py-2 rounded ${isActive('/resume') ? 'bg-blue-800' : 'hover:bg-blue-500'}`}
          >
            Resume Upload
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
      </div>
    </nav>
  )
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="container mx-auto py-8 px-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/jobs" element={<JobSearch />} />
            <Route path="/resume" element={<ResumeUpload />} />
            <Route path="/cover-letter" element={<CoverLetterGenerator />} />
            <Route path="/instructions" element={<ApplicationInstructions />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App