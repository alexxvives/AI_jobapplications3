import { useState } from 'react'
import { COUNTRIES, VISA_OPTIONS } from '../utils/countries'

function EditableResumeForm({ initialData, onSave, onCancel }) {
  const [formData, setFormData] = useState(initialData || {
    personal_information: {
      basic_information: {
        first_name: '',
        last_name: '',
        gender: ''
      },
      contact_information: {
        email: '',
        telephone: ''
      },
      address: {
        address: '',
        city: '',
        state: '',
        zip_code: '',
        country: '',
        citizenship: ''
      }
    },
    work_experience: [],
    education: [],
    skills: [],
    languages: [],
    job_preferences: {
      linkedin_link: '',
      github_link: '',
      portfolio_link: '',
      other_url: '',
      current_salary: '',
      expected_salary: '',
      notice_period: '',
      total_work_experience: '',
      highest_education: '',
      willing_to_relocate: '',
      driving_license: '',
      visa_requirement: '',
      veteran_status: '',
      disability: '',
      race_ethnicity: '',
      security_clearance: ''
    },
    achievements: [],
    certificates: []
  })

  const handleInputChange = (section, subsection, field, value) => {
    setFormData(prev => {
      const newData = { ...prev }
      if (subsection) {
        newData[section] = {
          ...newData[section],
          [subsection]: {
            ...newData[section][subsection],
            [field]: value
          }
        }
      } else {
        newData[section] = {
          ...newData[section],
          [field]: value
        }
      }
      return newData
    })
  }

  const handleArrayChange = (section, index, field, value) => {
    setFormData(prev => {
      const newData = { ...prev }
      newData[section] = [...newData[section]]
      newData[section][index] = {
        ...newData[section][index],
        [field]: value
      }
      return newData
    })
  }

  const addArrayItem = (section, template) => {
    setFormData(prev => ({
      ...prev,
      [section]: [...prev[section], template]
    }))
  }

  const removeArrayItem = (section, index) => {
    setFormData(prev => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index)
    }))
  }

  const handleSkillsChange = (value) => {
    const skills = value.split(',').map(skill => ({
      name: skill.trim(),
      years: null
    })).filter(skill => skill.name)
    setFormData(prev => ({ ...prev, skills }))
  }

  const handleLanguagesChange = (value) => {
    const languages = value.split(',').map(lang => lang.trim()).filter(lang => lang)
    setFormData(prev => ({ ...prev, languages }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-6">Edit Resume Data</h2>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Personal Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
          
          {/* Basic Information */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-800 mb-3">Basic Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={formData.personal_information?.basic_information?.first_name || ''}
                  onChange={(e) => handleInputChange('personal_information', 'basic_information', 'first_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={formData.personal_information?.basic_information?.last_name || ''}
                  onChange={(e) => handleInputChange('personal_information', 'basic_information', 'last_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  value={formData.personal_information?.basic_information?.gender || ''}
                  onChange={(e) => handleInputChange('personal_information', 'basic_information', 'gender', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-800 mb-3">Contact Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.personal_information?.contact_information?.email || ''}
                  onChange={(e) => handleInputChange('personal_information', 'contact_information', 'email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (include country code)</label>
                <input
                  type="tel"
                  placeholder="e.g., +1 (555) 123-4567"
                  value={formData.personal_information?.contact_information?.telephone || ''}
                  onChange={(e) => handleInputChange('personal_information', 'contact_information', 'telephone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-800 mb-3">Address</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.personal_information?.address?.address || ''}
                  onChange={(e) => handleInputChange('personal_information', 'address', 'address', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.personal_information?.address?.city || ''}
                  onChange={(e) => handleInputChange('personal_information', 'address', 'city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  value={formData.personal_information?.address?.state || ''}
                  onChange={(e) => handleInputChange('personal_information', 'address', 'state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
                <input
                  type="text"
                  value={formData.personal_information?.address?.zip_code || ''}
                  onChange={(e) => handleInputChange('personal_information', 'address', 'zip_code', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <select
                  value={formData.personal_information?.address?.country || ''}
                  onChange={(e) => handleInputChange('personal_information', 'address', 'country', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a country...</option>
                  {COUNTRIES.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Citizenship</label>
                <select
                  value={formData.personal_information?.address?.citizenship || ''}
                  onChange={(e) => handleInputChange('personal_information', 'address', 'citizenship', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select citizenship...</option>
                  {COUNTRIES.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Job Preferences */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Job Preferences</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
              <input
                type="url"
                value={formData.job_preferences?.linkedin_link || ''}
                onChange={(e) => handleInputChange('job_preferences', null, 'linkedin_link', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GitHub URL</label>
              <input
                type="url"
                value={formData.job_preferences?.github_link || ''}
                onChange={(e) => handleInputChange('job_preferences', null, 'github_link', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio URL</label>
              <input
                type="url"
                value={formData.job_preferences?.portfolio_link || ''}
                onChange={(e) => handleInputChange('job_preferences', null, 'portfolio_link', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Other URL</label>
              <input
                type="url"
                value={formData.job_preferences?.other_url || ''}
                onChange={(e) => handleInputChange('job_preferences', null, 'other_url', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Salary</label>
              <input
                type="text"
                placeholder="e.g., $75,000"
                value={formData.job_preferences?.current_salary || ''}
                onChange={(e) => handleInputChange('job_preferences', null, 'current_salary', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Salary</label>
              <input
                type="text"
                placeholder="e.g., $85,000"
                value={formData.job_preferences?.expected_salary || ''}
                onChange={(e) => handleInputChange('job_preferences', null, 'expected_salary', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notice Period</label>
              <input
                type="text"
                placeholder="e.g., 2 weeks, 1 month"
                value={formData.job_preferences?.notice_period || ''}
                onChange={(e) => handleInputChange('job_preferences', null, 'notice_period', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Work Experience</label>
              <input
                type="text"
                placeholder="e.g., 5 years"
                value={formData.job_preferences?.total_work_experience || ''}
                onChange={(e) => handleInputChange('job_preferences', null, 'total_work_experience', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Highest Education</label>
              <input
                type="text"
                placeholder="e.g., Bachelor's Degree"
                value={formData.job_preferences?.highest_education || ''}
                onChange={(e) => handleInputChange('job_preferences', null, 'highest_education', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Willing to Relocate</label>
              <select
                value={formData.job_preferences?.willing_to_relocate || ''}
                onChange={(e) => handleInputChange('job_preferences', null, 'willing_to_relocate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Option</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Maybe">Maybe</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Driving License</label>
              <select
                value={formData.job_preferences?.driving_license || ''}
                onChange={(e) => handleInputChange('job_preferences', null, 'driving_license', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Option</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Visa Sponsorship Required</label>
              <select
                value={formData.job_preferences?.visa_requirement || ''}
                onChange={(e) => handleInputChange('job_preferences', null, 'visa_requirement', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select visa status...</option>
                {VISA_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Veteran Status</label>
              <select
                value={formData.job_preferences?.veteran_status || ''}
                onChange={(e) => handleInputChange('job_preferences', null, 'veteran_status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Option</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Disability</label>
              <select
                value={formData.job_preferences?.disability || ''}
                onChange={(e) => handleInputChange('job_preferences', null, 'disability', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Option</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Race/Ethnicity</label>
              <input
                type="text"
                placeholder="Optional"
                value={formData.job_preferences?.race_ethnicity || ''}
                onChange={(e) => handleInputChange('job_preferences', null, 'race_ethnicity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Security Clearance</label>
              <input
                type="text"
                placeholder="e.g., Secret, Top Secret, None"
                value={formData.job_preferences?.security_clearance || ''}
                onChange={(e) => handleInputChange('job_preferences', null, 'security_clearance', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Skills */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Skills</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Skills (comma-separated)</label>
            <textarea
              value={formData.skills?.map(skill => typeof skill === 'object' ? skill.name : skill).join(', ') || ''}
              onChange={(e) => handleSkillsChange(e.target.value)}
              placeholder="e.g., JavaScript, Python, React, Node.js"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Languages */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Languages</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Languages (comma-separated)</label>
            <input
              type="text"
              value={formData.languages?.join(', ') || ''}
              onChange={(e) => handleLanguagesChange(e.target.value)}
              placeholder="e.g., English, Spanish, French"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}

export default EditableResumeForm