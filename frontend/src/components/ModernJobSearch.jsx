import { useState, useEffect } from 'react'
import { searchJobs, fetchJobsManually, getJobStats, getJobCountries } from '../utils/apiWithAuth'
import { getCompanyLogoUrl, handleLogoErrorWithFallbacks, getLogoColorFilter } from '../utils/companyLogos'
import '../utils/logoMappingManager.js' // Load logo management utilities

function ModernJobSearch() {
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLocation, setSearchLocation] = useState('')
  const [selectedFilters, setSelectedFilters] = useState({
    platform: 'all',
    jobType: 'all',
    workType: 'all',
    remote: 'all'
  })

  // Data state
  const [jobs, setJobs] = useState([])
  const [allJobs, setAllJobs] = useState([])
  const [selectedJobs, setSelectedJobs] = useState(new Set())
  const [stats, setStats] = useState(null)
  const [countries, setCountries] = useState([])

  // UI state
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState(null)

  // Load initial data (but not jobs - wait for user search)
  useEffect(() => {
    loadJobStats()
    loadCountries()
  }, [])

  const loadJobStats = async () => {
    try {
      const statsData = await getJobStats()
      setStats(statsData)
    } catch (err) {
      console.error('Failed to load job stats:', err)
    }
  }

  const loadCountries = async () => {
    try {
      const countryData = await getJobCountries()
      setCountries(countryData.countries || [])
    } catch (err) {
      console.error('Failed to load countries:', err)
    }
  }

  const loadRecentJobs = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('🔄 Loading recent jobs...')
      
      const response = await searchJobs('', '', 50)
      console.log('📡 Load response:', response)
      
      if (Array.isArray(response)) {
        // Direct array response from API
        setAllJobs(response)
        setJobs(response)
        console.log('✅ Loaded', response.length, 'jobs')
      } else {
        console.error('❌ Unexpected load response:', response)
        setError('Failed to load jobs - unexpected response format')
      }
    } catch (err) {
      console.error('❌ Load error:', err)
      setError(`Failed to load jobs: ${err.response?.data?.detail || err.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim() && !searchLocation.trim()) return

    try {
      setSearching(true)
      setError(null)
      console.log('🔍 Searching for:', searchQuery, 'in', searchLocation)
      
      const response = await searchJobs(searchQuery, searchLocation, 100)
      console.log('📡 Search response:', response)
      
      if (Array.isArray(response)) {
        // Direct array response from API
        setAllJobs(response)
        applyFilters(response)
        console.log('✅ Found', response.length, 'jobs')
      } else {
        console.error('❌ Unexpected response format:', response)
        setError('Search failed - unexpected response format')
      }
    } catch (err) {
      console.error('❌ Search error:', err)
      setError(`Search failed: ${err.response?.data?.detail || err.message || 'Unknown error'}`)
    } finally {
      setSearching(false)
    }
  }

  const applyFilters = (jobsToFilter = allJobs) => {
    let filtered = [...jobsToFilter]

    if (selectedFilters.platform !== 'all') {
      filtered = filtered.filter(job => job.platform === selectedFilters.platform)
    }
    if (selectedFilters.jobType !== 'all') {
      filtered = filtered.filter(job => job.job_type?.toLowerCase().includes(selectedFilters.jobType))
    }
    if (selectedFilters.workType !== 'all') {
      filtered = filtered.filter(job => job.work_type?.toLowerCase() === selectedFilters.workType)
    }
    if (selectedFilters.remote !== 'all') {
      if (selectedFilters.remote === 'remote') {
        filtered = filtered.filter(job => job.remote_option === true)
      } else if (selectedFilters.remote === 'onsite') {
        filtered = filtered.filter(job => job.remote_option === false)
      }
    }

    setJobs(filtered)
  }

  const updateFilter = (filterType, value) => {
    const newFilters = { ...selectedFilters, [filterType]: value }
    setSelectedFilters(newFilters)
    applyFilters()
  }

  const toggleJobSelection = (jobId) => {
    const newSelected = new Set(selectedJobs)
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId)
    } else if (newSelected.size < 5) {
      newSelected.add(jobId)
    }
    setSelectedJobs(newSelected)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getPlatformColor = (platform) => {
    const colors = {
      'lever': 'bg-blue-100 text-blue-800',
      'greenhouse': 'bg-green-100 text-green-800',
      'workday': 'bg-purple-100 text-purple-800',
      'bamboohr': 'bg-orange-100 text-orange-800',
      'smartrecruiters': 'bg-red-100 text-red-800'
    }
    return colors[platform] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Find your next job</h1>
                <p className="text-gray-600 mt-1">
                  {stats && `${stats.total_jobs?.toLocaleString() || 0} jobs`} from top companies
                </p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-2">
              <div className="flex items-center space-x-4">
                <div className="flex-1 flex items-center space-x-4">
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Job title, keywords, or company"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="w-full pl-12 pr-4 py-3 text-gray-900 placeholder-gray-500 bg-transparent border-0 focus:outline-none focus:ring-0"
                    />
                  </div>
                  <div className="h-8 border-l border-gray-300"></div>
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                      <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <select
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 text-gray-900 bg-transparent border-0 focus:outline-none focus:ring-0 appearance-none cursor-pointer"
                    >
                      <option value="">All Countries</option>
                      {countries.map((country, index) => (
                        <option 
                          key={index} 
                          value={country.country}
                          className={country.count === 0 ? 'text-gray-400' : ''}
                        >
                          {country.country} ({country.count} jobs)
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSearch}
                  disabled={searching || (!searchQuery.trim() && !searchLocation.trim())}
                  className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {searching ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Searching...</span>
                    </div>
                  ) : (
                    'Search'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Filters</h3>
              
              {/* Selected Jobs Counter */}
              {selectedJobs.size > 0 && (
                <div className="mb-6 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-teal-900">
                      {selectedJobs.size} job{selectedJobs.size !== 1 ? 's' : ''} selected
                    </span>
                    <button className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
                      Apply Now
                    </button>
                  </div>
                </div>
              )}

              {/* Platform Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Platform</label>
                <select
                  value={selectedFilters.platform}
                  onChange={(e) => updateFilter('platform', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="all">All Platforms</option>
                  <option value="lever">Lever</option>
                  <option value="greenhouse">Greenhouse</option>
                  <option value="workday">Workday</option>
                  <option value="bamboohr">BambooHR</option>
                  <option value="smartrecruiters">SmartRecruiters</option>
                </select>
              </div>

              {/* Remote Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Work Style</label>
                <div className="space-y-2">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'remote', label: 'Remote' },
                    { value: 'hybrid', label: 'Hybrid' },
                    { value: 'onsite', label: 'On-site' }
                  ].map(option => (
                    <label key={option.value} className="flex items-center">
                      <input
                        type="radio"
                        name="remote"
                        value={option.value}
                        checked={selectedFilters.remote === option.value}
                        onChange={(e) => updateFilter('remote', e.target.value)}
                        className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300"
                      />
                      <span className="ml-3 text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Job Type Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Job Type</label>
                <select
                  value={selectedFilters.jobType}
                  onChange={(e) => updateFilter('jobType', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="all">All Types</option>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {jobs.length} job{jobs.length !== 1 ? 's' : ''} found
                </h2>
                {searchQuery && (
                  <p className="text-gray-600 mt-1">
                    Results for "{searchQuery}" {searchLocation && `in ${searchLocation}`}
                  </p>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent"></div>
                <span className="ml-3 text-gray-600">Loading jobs...</span>
              </div>
            )}

            {/* Job Results */}
            {!loading && jobs.length > 0 && (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className={`bg-white rounded-xl border transition-all duration-200 hover:shadow-lg cursor-pointer p-4 ${
                      selectedJobs.has(job.id)
                        ? 'border-teal-500 shadow-lg ring-2 ring-teal-100'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleJobSelection(job.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <input
                              type="checkbox"
                              checked={selectedJobs.has(job.id)}
                              onChange={() => toggleJobSelection(job.id)}
                              className="h-5 w-5 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                            />
                          </div>
                          <div className="flex-shrink-0 ml-3">
                            <div className="relative">
                              <img
                                src={getCompanyLogoUrl(job.company)}
                                alt={`${job.company} logo`}
                                onError={(e) => handleLogoErrorWithFallbacks(e, job.company)}
                                style={getLogoColorFilter(job.company)}
                                className="w-12 h-12 rounded-lg border border-gray-200 bg-white object-contain p-2 shadow-sm hover:shadow-md transition-all duration-200"
                              />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1 hover:text-teal-600 transition-colors">
                              {job.title}
                            </h3>
                            <p className="text-gray-700 font-medium mb-2">{job.company}</p>
                            
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                              {job.location && (
                                <span className="flex items-center">
                                  <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                                  </svg>
                                  {job.location}
                                </span>
                              )}
                              {job.fetched_at && (
                                <span>Posted {formatDate(job.fetched_at)}</span>
                              )}
                            </div>

                            {job.description && (
                              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                {job.description.substring(0, 150)}...
                              </p>
                            )}

                            <div className="flex items-center space-x-2 mb-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPlatformColor(job.platform)}`}>
                                {job.platform}
                              </span>
                              {job.remote_option && (
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Remote
                                </span>
                              )}
                              {job.job_type && (
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {job.job_type}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0 ml-4">
                        <a
                          href={job.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          View Job
                          <svg className="ml-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                          </svg>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && jobs.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">
                  {searchQuery || searchLocation ? '🔍' : '💼'}
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery || searchLocation ? 'No jobs found' : 'Find your dream job'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery || searchLocation
                    ? `No jobs found${searchLocation ? ` in ${searchLocation}` : ''}${searchQuery ? ` for "${searchQuery}"` : ''}. Try adjusting your search criteria or filters.`
                    : `Search through ${stats?.total_jobs?.toLocaleString() || '388'} jobs from top companies worldwide. Enter a job title or select a country to get started.`
                  }
                </p>
                {(searchQuery || searchLocation) && (
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setSearchLocation('')  
                      setSelectedFilters({
                        platform: 'all',
                        jobType: 'all',
                        workType: 'all',
                        remote: 'all'
                      })
                      setJobs([])
                      setAllJobs([])
                    }}
                    className="text-teal-600 hover:text-teal-700 font-medium"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModernJobSearch