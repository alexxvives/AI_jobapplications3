import { useState } from 'react'
import { searchJobs, fetchJobsManually } from '../utils/apiWithAuth'
import AutomationModal from './AutomationModal'
import ProfileSelector from './ProfileSelector'

function JobSearch() {
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [jobs, setJobs] = useState([])
  const [allJobs, setAllJobs] = useState([]) // Store unfiltered jobs
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [selectedJobs, setSelectedJobs] = useState(new Set())
  const [isAutomating, setIsAutomating] = useState(false)
  const [showAutomationModal, setShowAutomationModal] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState(null)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    try {
      const results = await searchJobs(title, location)
      setAllJobs(results)
      // Apply source filter if set
      applySourceFilter(results, sourceFilter)
    } catch (error) {
      console.error('Search error:', error)
      alert('Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const applySourceFilter = (jobList, filter) => {
    if (!filter) {
      setJobs(jobList)
    } else {
      const filtered = jobList.filter(job => 
        job.source && job.source.toLowerCase().includes(filter.toLowerCase())
      )
      setJobs(filtered)
    }
  }

  // Apply filter when sourceFilter changes
  const handleSourceFilterChange = (newFilter) => {
    setSourceFilter(newFilter)
    applySourceFilter(allJobs, newFilter)
    setSelectedJobs(new Set()) // Clear selections when filter changes
  }

  const handleFetchJobs = async () => {
    setFetching(true)
    try {
      const result = await fetchJobsManually()
      alert(`Successfully fetched ${result.total_jobs} jobs!`)
      // Refresh search if we have a current search
      if (title.trim()) {
        const results = await searchJobs(title, location)
        setAllJobs(results)
        applySourceFilter(results, sourceFilter)
      }
    } catch (error) {
      console.error('Fetch error:', error)
      alert('Failed to fetch jobs. Please try again.')
    } finally {
      setFetching(false)
    }
  }

  const toggleJobSelection = (jobId) => {
    const newSelected = new Set(selectedJobs)
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId)
    } else {
      newSelected.add(jobId)
    }
    setSelectedJobs(newSelected)
  }

  const selectAllJobs = () => {
    if (selectedJobs.size === jobs.length) {
      setSelectedJobs(new Set())
    } else {
      setSelectedJobs(new Set(jobs.map(job => job.id)))
    }
  }

  const handleStartAutomation = () => {
    console.log('🚀 Starting automation for', selectedJobs.size, 'jobs')
    
    if (!selectedProfile) {
      console.error('No profile selected')
      alert('Please select a profile first.')
      return
    }
    
    if (selectedJobs.size === 0) {
      alert('Please select at least one job to apply to.')
      return
    }
    
    if (selectedJobs.size > 5) {
      alert('Please select no more than 5 jobs per session.')
      return
    }
    
    setShowAutomationModal(true)
  }

  const handleAutomationComplete = () => {
    setShowAutomationModal(false)
    setIsAutomating(false)
    setSelectedJobs(new Set()) // Clear selections after automation
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Job Search</h1>
      
      {/* Profile Selection */}
      <ProfileSelector 
        selectedProfile={selectedProfile} 
        onProfileSelect={setSelectedProfile} 
      />
      
      {/* Search Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Job Title *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Software Engineer, Product Manager"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Location (Optional)
              </label>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., San Francisco, Remote"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-1">
                Source Filter (Optional)
              </label>
              <select
                id="source"
                value={sourceFilter}
                onChange={(e) => handleSourceFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Sources</option>
                <option value="lever">Lever</option>
                <option value="greenhouse">Greenhouse</option>
                <option value="workday">Workday</option>
                <option value="ashby">Ashby</option>
                <option value="bamboohr">BambooHR</option>
                <option value="smartrecruiters">SmartRecruiters</option>
                <option value="jobvite">Jobvite</option>
                <option value="icims">iCIMS</option>
                <option value="adp">ADP</option>
                <option value="successfactors">SuccessFactors</option>
              </select>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Search Jobs'}
            </button>
            
            <button
              type="button"
              onClick={handleFetchJobs}
              disabled={fetching}
              className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {fetching ? 'Fetching...' : 'Refresh Job Database'}
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      {jobs.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold">
                Found {jobs.length} job{jobs.length !== 1 ? 's' : ''}
                {allJobs.length > jobs.length && (
                  <span className="text-gray-500 text-sm ml-2">
                    (filtered from {allJobs.length} total)
                  </span>
                )}
              </h2>
              {sourceFilter && (
                <p className="text-sm text-gray-600 mt-1">
                  Filtered by source: <span className="font-medium capitalize">{sourceFilter}</span>
                  <button 
                    onClick={() => handleSourceFilterChange('')}
                    className="ml-2 text-blue-500 hover:text-blue-700 text-xs underline"
                  >
                    Clear filter
                  </button>
                </p>
              )}
            </div>
            <button
              onClick={selectAllJobs}
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              {selectedJobs.size === jobs.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          
          {selectedJobs.size > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded-md">
              <div className="flex justify-between items-center">
                <p className="text-sm text-blue-700">
                  {selectedJobs.size} job{selectedJobs.size !== 1 ? 's' : ''} selected
                  {selectedJobs.size > 5 && <span className="text-red-600 ml-2">(Max 5 allowed)</span>}
                </p>
                <button
                  onClick={handleStartAutomation}
                  disabled={selectedJobs.size === 0 || selectedJobs.size > 5 || isAutomating}
                  className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isAutomating ? 'Applying...' : 'Apply to Selected Jobs'}
                </button>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            {jobs.map((job) => (
              <div 
                key={job.id} 
                className={`border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedJobs.has(job.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
                onClick={() => toggleJobSelection(job.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        checked={selectedJobs.has(job.id)}
                        onChange={() => toggleJobSelection(job.id)}
                        className="mr-3"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                    </div>
                    
                    <div className="text-gray-600 mb-2">
                      <span className="font-medium">{job.company}</span>
                      {job.location && <span> • {job.location}</span>}
                      {job.source && <span className="text-sm bg-gray-200 px-2 py-1 rounded ml-2">{job.source}</span>}
                    </div>
                    
                    {job.description && (
                      <p className="text-gray-700 text-sm line-clamp-3">
                        {job.description.length > 200 
                          ? job.description.substring(0, 200) + '...' 
                          : job.description}
                      </p>
                    )}
                    
                    <div className="mt-2 flex gap-2">
                      {job.job_type && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          {job.job_type}
                        </span>
                      )}
                      {job.remote_option && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          Remote
                        </span>
                      )}
                      {job.salary_range && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          {job.salary_range}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <a
                    href={job.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View Job
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center min-h-32">
          <div className="loading-spinner"></div>
        </div>
      )}

      {jobs.length === 0 && !loading && title && (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-500">No jobs found for "{title}". Try a different search term or refresh the job database.</p>
        </div>
      )}

      {/* Automation Modal */}
      <AutomationModal
        isOpen={showAutomationModal}
        onClose={() => setShowAutomationModal(false)}
        selectedJobs={selectedJobs}
        jobs={jobs}
        selectedProfile={selectedProfile}
        onComplete={handleAutomationComplete}
      />
    </div>
  )
}

export default JobSearch