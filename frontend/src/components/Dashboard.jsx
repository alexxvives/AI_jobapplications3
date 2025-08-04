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
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Jobs</h3>
              <div className="text-3xl font-bold text-blue-600">{stats.total_jobs?.toLocaleString() || 0}</div>
              <p className="text-sm text-gray-500">Jobs in database</p>
            </div>
            <div className="text-blue-500 text-4xl">💼</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Companies</h3>
              <div className="text-3xl font-bold text-green-600">{stats.top_companies?.length || 0}</div>
              <p className="text-sm text-gray-500">Unique companies</p>
            </div>
            <div className="text-green-500 text-4xl">🏢</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Platforms</h3>
              <div className="text-3xl font-bold text-purple-600">{stats.platforms?.length || 0}</div>
              <p className="text-sm text-gray-500">ATS platforms</p>
            </div>
            <div className="text-purple-500 text-4xl">🔗</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Top Company</h3>
              <div className="text-2xl font-bold text-orange-600">{stats.top_companies?.[0]?.company || 'N/A'}</div>
              <p className="text-sm text-gray-500">{stats.top_companies?.[0]?.count || 0} jobs</p>
            </div>
            <div className="text-orange-500 text-4xl">🏆</div>
          </div>
        </div>
      </div>

      {/* Platform Statistics */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center">
          <span className="mr-2">🔗</span>
          Jobs by Platform
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {(stats.platforms || []).map((platform) => {
            const getPlatformIcon = (name) => {
              const icons = {
                'lever': '🎚️',
                'greenhouse': '🌱', 
                'workday': '💼',
                'bamboohr': '🎋',
                'smartrecruiters': '🧠'
              }
              return icons[name] || '⚙️'
            }

            const getPlatformColor = (name) => {
              const colors = {
                'lever': 'text-blue-600 bg-blue-50 border-blue-200',
                'greenhouse': 'text-green-600 bg-green-50 border-green-200',
                'workday': 'text-purple-600 bg-purple-50 border-purple-200',
                'bamboohr': 'text-orange-600 bg-orange-50 border-orange-200',
                'smartrecruiters': 'text-red-600 bg-red-50 border-red-200'
              }
              return colors[platform.platform] || 'text-gray-600 bg-gray-50 border-gray-200'
            }

            return (
              <div key={platform.platform} className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${getPlatformColor(platform.platform)}`}>
                <div className="text-center">
                  <div className="text-2xl mb-2">{getPlatformIcon(platform.platform)}</div>
                  <div className="text-2xl font-bold">{platform.count.toLocaleString()}</div>
                  <div className="text-sm font-medium capitalize">{platform.platform}</div>
                  <div className="text-xs opacity-75">
                    {platform.count === 1 ? 'job' : 'jobs'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-4 text-sm text-gray-500 text-center">
          Total: {stats.total_jobs?.toLocaleString() || 0} jobs across {stats.platforms?.length || 0} platforms
        </div>
      </div>

      {/* Companies by Platform */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center">
          <span className="mr-2">🏭</span>
          Companies by Platform
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {(stats.platforms || []).map((platform) => {
            // Find the corresponding company data for this platform
            const platformData = (stats.companies_by_platform || []).find(p => p.platform === platform.platform) || {
              platform: platform.platform,
              company_count: 0,
              companies: []
            };
            const getPlatformIcon = (name) => {
              const icons = {
                'lever': '🎚️',
                'greenhouse': '🌱', 
                'workday': '💼',
                'bamboohr': '🎋',
                'smartrecruiters': '🧠'
              }
              return icons[name] || '⚙️'
            }

            const getPlatformColor = (name) => {
              const colors = {
                'lever': 'text-blue-600 bg-blue-50 border-blue-200',
                'greenhouse': 'text-green-600 bg-green-50 border-green-200',
                'workday': 'text-purple-600 bg-purple-50 border-purple-200',
                'bamboohr': 'text-orange-600 bg-orange-50 border-orange-200',
                'smartrecruiters': 'text-red-600 bg-red-50 border-red-200'
              }
              return colors[platformData.platform] || 'text-gray-600 bg-gray-50 border-gray-200'
            }

            return (
              <div key={platformData.platform} className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${getPlatformColor(platformData.platform)}`}>
                <div className="text-center">
                  <div className="text-2xl mb-2">{getPlatformIcon(platformData.platform)}</div>
                  <div className="text-2xl font-bold">{platformData.company_count}</div>
                  <div className="text-sm font-medium capitalize">{platformData.platform}</div>
                  <div className="text-xs opacity-75">
                    {platformData.company_count === 1 ? 'company' : 'companies'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-4 text-sm text-gray-500 text-center">
          Total: {stats.companies_by_platform?.reduce((sum, p) => sum + p.company_count, 0) || 0} companies across {stats.companies_by_platform?.length || 0} platforms
        </div>
      </div>

      {/* Top Performing Companies */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center">
          <span className="mr-2">🏆</span>
          Top Companies
        </h2>
        <div className="space-y-3">
          {(stats.top_companies || []).slice(0, 10).map((company, index) => {
            const percentage = stats.total_jobs > 0 ? ((company.count / stats.total_jobs) * 100).toFixed(1) : 0;
            const getRankIcon = (idx) => {
              if (idx === 0) return '🥇'
              if (idx === 1) return '🥈' 
              if (idx === 2) return '🥉'
              return `${idx + 1}.`
            }

            return (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="text-lg font-semibold w-8 text-center">
                    {getRankIcon(index)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{company.company}</div>
                    <div className="text-sm text-gray-500">{percentage}% of all jobs</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-xl font-bold text-blue-600">{company.count.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{company.count === 1 ? 'job' : 'jobs'}</div>
                  </div>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.max(percentage, 2)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {stats.top_companies?.length > 10 && (
          <div className="mt-4 text-sm text-gray-500 text-center">
            Showing top 10 of {stats.top_companies.length} companies
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center">
          <span className="mr-2">⚡</span>
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg"
            onClick={() => window.location.href = '/jobs-modern'}
          >
            <div className="text-center">
              <div className="text-3xl mb-2">🔍</div>
              <div className="text-lg font-semibold">Search Jobs</div>
              <div className="text-sm opacity-90">{stats.total_jobs?.toLocaleString() || 0} jobs available</div>
            </div>
          </button>
          
          <button 
            className="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105 shadow-lg"
            onClick={() => window.location.href = '/resume'}
          >
            <div className="text-center">
              <div className="text-3xl mb-2">📄</div>
              <div className="text-lg font-semibold">Manage Profiles</div>
              <div className="text-sm opacity-90">Upload & edit resumes</div>
            </div>
          </button>
          
          <button 
            className="p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
            onClick={() => window.location.href = '/cover-letter'}
          >
            <div className="text-center">
              <div className="text-3xl mb-2">✍️</div>
              <div className="text-lg font-semibold">Cover Letters</div>
              <div className="text-sm opacity-90">AI-powered writing</div>
            </div>
          </button>
          
          <button 
            className="p-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all transform hover:scale-105 shadow-lg"
            onClick={() => window.location.href = '/instructions'}
          >
            <div className="text-center">
              <div className="text-3xl mb-2">🤖</div>
              <div className="text-lg font-semibold">Automation</div>
              <div className="text-sm opacity-90">Application guidance</div>
            </div>
          </button>
        </div>
      </div>

      {/* Current Database Status */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center">
          <span className="mr-2">📊</span>
          Current Database Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-blue-600 text-2xl mb-2">💼</div>
            <div className="text-2xl font-bold text-blue-600">{stats.total_jobs?.toLocaleString() || 0}</div>
            <div className="text-sm text-blue-600 font-medium">Total Jobs Scraped</div>
            <div className="text-xs text-gray-500 mt-1">Ready to search and apply</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-green-600 text-2xl mb-2">🏢</div>
            <div className="text-2xl font-bold text-green-600">{stats.top_companies?.length || 0}</div>
            <div className="text-sm text-green-600 font-medium">Companies Tracked</div>
            <div className="text-xs text-gray-500 mt-1">Including {stats.top_companies?.[0]?.company || 'major companies'}</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="text-purple-600 text-2xl mb-2">🎯</div>
            <div className="text-2xl font-bold text-purple-600">
              {stats.platforms?.reduce((acc, p) => acc + (p.count > 0 ? 1 : 0), 0) || 0}
            </div>
            <div className="text-sm text-purple-600 font-medium">Active Platforms</div>
            <div className="text-xs text-gray-500 mt-1">Lever, Greenhouse, Workday +</div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-gray-900">🚀 Ready to expand data collection</div>
              <div className="text-sm text-gray-600">Current focus: Gathering more jobs from additional companies and platforms</div>
            </div>
            <div className="text-2xl">📈</div>
          </div>
        </div>
      </div>

    </div>
  )
}

export default Dashboard