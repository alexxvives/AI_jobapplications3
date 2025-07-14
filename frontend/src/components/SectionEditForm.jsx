import { useState } from 'react'
import { COUNTRIES, VISA_OPTIONS } from '../utils/countries'

function SectionEditForm({ section, data, onSave, onCancel }) {
  const [formData, setFormData] = useState(data)

  const handleInputChange = (path, value) => {
    const newData = { ...formData }
    
    // Navigate to the correct nested property
    const keys = path.split('.')
    let current = newData
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {}
      }
      current = current[keys[i]]
    }
    
    current[keys[keys.length - 1]] = value
    setFormData(newData)
  }

  const handleArrayChange = (arrayPath, index, field, value) => {
    const newData = { ...formData }
    const keys = arrayPath.split('.')
    let current = newData
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]]
    }
    
    const array = current[keys[keys.length - 1]]
    if (array && array[index]) {
      array[index] = { ...array[index], [field]: value }
    }
    
    setFormData(newData)
  }

  const addArrayItem = (arrayPath, newItem) => {
    const newData = { ...formData }
    const keys = arrayPath.split('.')
    let current = newData
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]]
    }
    
    if (!current[keys[keys.length - 1]]) {
      current[keys[keys.length - 1]] = []
    }
    
    current[keys[keys.length - 1]].push(newItem)
    setFormData(newData)
  }

  const removeArrayItem = (arrayPath, index) => {
    const newData = { ...formData }
    const keys = arrayPath.split('.')
    let current = newData
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]]
    }
    
    current[keys[keys.length - 1]].splice(index, 1)
    setFormData(newData)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  const renderPersonalSection = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Edit Personal Information</h3>
      
      {/* Basic Information */}
      <div>
        <h4 className="text-md font-medium text-gray-800 mb-3">Basic Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              value={formData.personal_information?.basic_information?.first_name || ''}
              onChange={(e) => handleInputChange('personal_information.basic_information.first_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              value={formData.personal_information?.basic_information?.last_name || ''}
              onChange={(e) => handleInputChange('personal_information.basic_information.last_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              value={formData.personal_information?.basic_information?.gender || ''}
              onChange={(e) => handleInputChange('personal_information.basic_information.gender', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div>
        <h4 className="text-md font-medium text-gray-800 mb-3">Contact Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.personal_information?.contact_information?.email || ''}
              onChange={(e) => handleInputChange('personal_information.contact_information.email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (include country code)</label>
            <input
              type="tel"
              placeholder="e.g., +1 (555) 123-4567"
              value={formData.personal_information?.contact_information?.telephone || ''}
              onChange={(e) => handleInputChange('personal_information.contact_information.telephone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div>
        <h4 className="text-md font-medium text-gray-800 mb-3">Address</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
            <input
              type="text"
              value={formData.personal_information?.address?.address || ''}
              onChange={(e) => handleInputChange('personal_information.address.address', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              value={formData.personal_information?.address?.city || ''}
              onChange={(e) => handleInputChange('personal_information.address.city', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input
              type="text"
              value={formData.personal_information?.address?.state || ''}
              onChange={(e) => handleInputChange('personal_information.address.state', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
            <input
              type="text"
              value={formData.personal_information?.address?.zip_code || ''}
              onChange={(e) => handleInputChange('personal_information.address.zip_code', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <select
              value={formData.personal_information?.address?.country || ''}
              onChange={(e) => handleInputChange('personal_information.address.country', e.target.value)}
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
              onChange={(e) => handleInputChange('personal_information.address.citizenship', e.target.value)}
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
  )

  const renderWorkSection = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Edit Work Experience</h3>
      
      {formData.work_experience?.map((exp, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-medium text-gray-800">Position {index + 1}</h4>
            <button
              type="button"
              onClick={() => removeArrayItem('work_experience', index)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Remove
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
              <input
                type="text"
                value={exp.title || ''}
                onChange={(e) => handleArrayChange('work_experience', index, 'title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                value={exp.company || ''}
                onChange={(e) => handleArrayChange('work_experience', index, 'company', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={exp.location || ''}
                onChange={(e) => handleArrayChange('work_experience', index, 'location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="month"
                value={exp.start_date || ''}
                onChange={(e) => handleArrayChange('work_experience', index, 'start_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="month"
                value={exp.end_date || ''}
                onChange={(e) => handleArrayChange('work_experience', index, 'end_date', e.target.value)}
                placeholder="Leave blank if current"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={exp.description || ''}
              onChange={(e) => handleArrayChange('work_experience', index, 'description', e.target.value)}
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      ))}
      
      <button
        type="button"
        onClick={() => addArrayItem('work_experience', {
          title: '',
          company: '',
          location: '',
          start_date: '',
          end_date: '',
          description: ''
        })}
        className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
      >
        Add Work Experience
      </button>
    </div>
  )

  const renderEducationSection = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Edit Education</h3>
      
      {formData.education?.map((edu, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-medium text-gray-800">Education {index + 1}</h4>
            <button
              type="button"
              onClick={() => removeArrayItem('education', index)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Remove
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Degree</label>
              <input
                type="text"
                value={edu.degree || ''}
                onChange={(e) => handleArrayChange('education', index, 'degree', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
              <input
                type="text"
                value={edu.school || ''}
                onChange={(e) => handleArrayChange('education', index, 'school', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="month"
                value={edu.start_date || ''}
                onChange={(e) => handleArrayChange('education', index, 'start_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="month"
                value={edu.end_date || ''}
                onChange={(e) => handleArrayChange('education', index, 'end_date', e.target.value)}
                placeholder="Leave blank if current"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GPA</label>
              <input
                type="text"
                value={edu.gpa || ''}
                onChange={(e) => handleArrayChange('education', index, 'gpa', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      ))}
      
      <button
        type="button"
        onClick={() => addArrayItem('education', {
          degree: '',
          school: '',
          start_date: '',
          end_date: '',
          gpa: ''
        })}
        className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
      >
        Add Education
      </button>
    </div>
  )

  const renderSkillsSection = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Edit Skills</h3>
      
      {formData.skills?.map((skill, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-medium text-gray-800">Skill {index + 1}</h4>
            <button
              type="button"
              onClick={() => removeArrayItem('skills', index)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Remove
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skill Name</label>
              <input
                type="text"
                value={skill.name || ''}
                onChange={(e) => handleArrayChange('skills', index, 'name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
              <input
                type="number"
                value={skill.years || ''}
                onChange={(e) => handleArrayChange('skills', index, 'years', parseInt(e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      ))}
      
      <button
        type="button"
        onClick={() => addArrayItem('skills', {
          name: '',
          years: null
        })}
        className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
      >
        Add Skill
      </button>
    </div>
  )

  const renderPreferencesSection = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Edit Job Preferences</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
          <input
            type="url"
            value={formData.job_preferences?.linkedin_link || ''}
            onChange={(e) => handleInputChange('job_preferences.linkedin_link', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GitHub URL</label>
          <input
            type="url"
            value={formData.job_preferences?.github_link || ''}
            onChange={(e) => handleInputChange('job_preferences.github_link', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio URL</label>
          <input
            type="url"
            value={formData.job_preferences?.portfolio_link || ''}
            onChange={(e) => handleInputChange('job_preferences.portfolio_link', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Other URL</label>
          <input
            type="url"
            value={formData.job_preferences?.other_url || ''}
            onChange={(e) => handleInputChange('job_preferences.other_url', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Salary</label>
          <input
            type="text"
            value={formData.job_preferences?.current_salary || ''}
            onChange={(e) => handleInputChange('job_preferences.current_salary', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expected Salary</label>
          <input
            type="text"
            value={formData.job_preferences?.expected_salary || ''}
            onChange={(e) => handleInputChange('job_preferences.expected_salary', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notice Period</label>
          <input
            type="text"
            value={formData.job_preferences?.notice_period || ''}
            onChange={(e) => handleInputChange('job_preferences.notice_period', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Total Work Experience</label>
          <input
            type="text"
            value={formData.job_preferences?.total_work_experience || ''}
            onChange={(e) => handleInputChange('job_preferences.total_work_experience', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Highest Education</label>
          <input
            type="text"
            value={formData.job_preferences?.highest_education || ''}
            onChange={(e) => handleInputChange('job_preferences.highest_education', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Willing to Relocate</label>
          <select
            value={formData.job_preferences?.willing_to_relocate || ''}
            onChange={(e) => handleInputChange('job_preferences.willing_to_relocate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
            <option value="Maybe">Maybe</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Driving License</label>
          <select
            value={formData.job_preferences?.driving_license || ''}
            onChange={(e) => handleInputChange('job_preferences.driving_license', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Visa Sponsorship Required</label>
          <select
            value={formData.job_preferences?.visa_requirement || ''}
            onChange={(e) => handleInputChange('job_preferences.visa_requirement', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select visa status...</option>
            {VISA_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )

  const renderSection = () => {
    switch (section) {
      case 'personal':
        return renderPersonalSection()
      case 'work':
        return renderWorkSection()
      case 'education':
        return renderEducationSection()
      case 'skills':
        return renderSkillsSection()
      case 'preferences':
        return renderPreferencesSection()
      default:
        return <div>Unknown section</div>
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {renderSection()}
        
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}

export default SectionEditForm