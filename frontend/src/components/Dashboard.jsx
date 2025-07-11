import { useState, useEffect } from 'react'
import { getJobStats, healthCheck } from '../utils/apiWithAuth'

function Dashboard() {
  const [stats, setStats] = useState({})
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        
        // Check backend health
        const healthData = await healthCheck()
        setHealth(healthData)
        
        // Get job statistics
        const statsData = await getJobStats()
        console.log('Stats data received:', statsData)
        console.log('Simple sources:', statsData?.job_database?.simple_sources)
        setStats(statsData)
        
      } catch (error) {
        console.error('Error loading dashboard data:', error)
        setHealth({ status: 'error', message: error.message })
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
      
      {/* System Status */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">System Status</h2>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${
            health?.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <span className={`font-medium ${
            health?.status === 'healthy' ? 'text-green-700' : 'text-red-700'
          }`}>
            {health?.status === 'healthy' ? 'Backend Online' : 'Backend Offline'}
          </span>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Available Companies</h3>
          <div className="text-3xl font-bold text-blue-600">{stats.summary?.available_companies || 0}</div>
          <p className="text-sm text-gray-500">Total companies in database</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Jobs Found</h3>
          <div className="text-3xl font-bold text-green-600">{stats.summary?.total_jobs_found || 0}</div>
          <p className="text-sm text-gray-500">Total jobs extracted</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Success Rate</h3>
          <div className="text-3xl font-bold text-purple-600">{stats.summary?.success_rate || 0}%</div>
          <p className="text-sm text-gray-500">Companies with jobs found</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Scraped Companies</h3>
          <div className="text-3xl font-bold text-orange-600">{stats.summary?.scraped_companies || 0}</div>
          <p className="text-sm text-gray-500">Companies successfully scraped</p>
        </div>
      </div>

      {/* Company Sources */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Company Sources</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
          {Object.entries(stats.company_sources?.sources || {}).map(([source, count]) => (
            <div key={source} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{count}</div>
              <div className="text-sm text-gray-600">{source}</div>
            </div>
          ))}
        </div>
        <div className="text-sm text-gray-500">
          Total unique companies: {stats.company_sources?.total_companies || 0}
        </div>
      </div>

      {/* Platform Statistics */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Job Extraction by Platform</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(stats.job_database?.by_platform || {}).map(([platform, data]) => (
            <div key={platform} className="p-4 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">{data.jobs}</div>
              <div className="text-sm text-gray-600">{platform}</div>
              <div className="text-xs text-gray-500">{data.companies} companies</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performing Companies */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Top Performing Companies</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Company</th>
                <th className="text-left py-2">Platform</th>
                <th className="text-right py-2">Jobs</th>
              </tr>
            </thead>
            <tbody>
              {(stats.job_database?.top_companies || []).slice(0, 10).map((company, index) => (
                <tr key={index} className="border-b">
                  <td className="py-2">{company.company}</td>
                  <td className="py-2">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">{company.platform}</span>
                  </td>
                  <td className="py-2 text-right font-semibold">{company.jobs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            className="p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            onClick={() => window.location.href = '/jobs'}
          >
            <div className="text-lg font-semibold">Search Jobs</div>
            <div className="text-sm opacity-90">Find opportunities</div>
          </button>
          
          <button 
            className="p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            onClick={() => window.location.href = '/resume'}
          >
            <div className="text-lg font-semibold">Manage Profiles</div>
            <div className="text-sm opacity-90">Upload resumes & manage profiles</div>
          </button>
          
          <button 
            className="p-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            onClick={() => window.location.href = '/cover-letter'}
          >
            <div className="text-lg font-semibold">Generate Cover Letter</div>
            <div className="text-sm opacity-90">AI-powered writing</div>
          </button>
          
          <button 
            className="p-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            onClick={() => window.location.href = '/instructions'}
          >
            <div className="text-lg font-semibold">Application Instructions</div>
            <div className="text-sm opacity-90">Automation guidance</div>
          </button>
        </div>
      </div>

      {/* Features Overview */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Features Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Job Search</h3>
            <p className="text-gray-600 text-sm">
              Search through thousands of jobs from 25+ ATS platforms including Workday, Lever, Greenhouse, ADP, and more. 
              Our enhanced scraper covers 583+ companies with headless browser support for JavaScript-rendered content.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Profile Management</h3>
            <p className="text-gray-600 text-sm">
              Upload multiple resumes to create different profiles. Our AI extracts structured data including 
              work experience, education, skills, and contact information. View, edit, and delete profiles as needed.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Cover Letter Generation</h3>
            <p className="text-gray-600 text-sm">
              Generate personalized cover letters tailored to specific job postings 
              using your profile data and AI-powered writing.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Application Instructions</h3>
            <p className="text-gray-600 text-sm">
              Get detailed automation instructions for filling out job applications, 
              including form field mappings and success probability estimates.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard