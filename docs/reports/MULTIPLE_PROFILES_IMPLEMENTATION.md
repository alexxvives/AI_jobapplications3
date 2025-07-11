# 🎯 Multiple Profiles Implementation

## ✅ Backend Changes Complete

I've implemented the backend support for multiple profiles. Here's what's been added:

### **New API Endpoints:**

#### 1. **Get All Profiles**
```
GET /user/profiles
```
**Response:**
```json
{
  "profiles": [
    {
      "id": 1,
      "title": "Software Engineer Profile",
      "full_name": "John Smith",
      "email": "john@example.com",
      "phone": "555-1234",
      "created_at": "2025-07-10T17:30:00",
      "updated_at": "2025-07-10T17:30:00",
      "has_resume": true
    },
    {
      "id": 2,
      "title": "Data Scientist Profile", 
      "full_name": "John Smith",
      "email": "john.smith.data@example.com",
      "phone": "555-1234",
      "has_resume": true
    }
  ]
}
```

#### 2. **Get Specific Profile**
```
GET /user/profile/{profile_id}
```
**Response:** Full profile data including work experience, education, skills, etc.

#### 3. **Updated Resume Parsing**
```
POST /agents/parse-resume
```
- Now saves resume file permanently in `/saved_resumes/` directory
- Stores resume file path with the profile in database
- Each profile has its own resume file

#### 4. **Updated Automation Start**
```
POST /automation/start
```
**New Required Parameter:**
```json
{
  "jobs": [...],
  "profile_id": 1  // NEW: Select which profile to use
}
```

### **Database Changes:**
- **Resume Storage**: Each profile now stores its resume file path
- **Multiple Profiles**: Users can have unlimited profiles
- **Profile Metadata**: Title, creation date, update date tracked

## 🎨 Frontend Changes Needed

### **1. Profile Selection in Job Search**

**Location:** `JobSearch.jsx` - in the automation modal

**Add Before Resume Upload:**
```jsx
// Add profile selection dropdown
const [selectedProfile, setSelectedProfile] = useState(null);
const [availableProfiles, setAvailableProfiles] = useState([]);

useEffect(() => {
  // Fetch available profiles when modal opens
  if (isOpen) {
    fetchAvailableProfiles();
  }
}, [isOpen]);

const fetchAvailableProfiles = async () => {
  try {
    const response = await fetch('/api/user/profiles');
    const data = await response.json();
    setAvailableProfiles(data.profiles || []);
  } catch (error) {
    console.error('Failed to fetch profiles:', error);
  }
};

// Profile selection UI
<div className="mb-4">
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Select Profile *
  </label>
  <select
    value={selectedProfile?.id || ''}
    onChange={(e) => {
      const profile = availableProfiles.find(p => p.id === parseInt(e.target.value));
      setSelectedProfile(profile);
    }}
    className="w-full px-3 py-2 border border-gray-300 rounded-md"
    required
  >
    <option value="">Choose a profile...</option>
    {availableProfiles.map(profile => (
      <option key={profile.id} value={profile.id}>
        {profile.title} ({profile.full_name})
        {profile.has_resume ? ' ✓' : ' ⚠️ No Resume'}
      </option>
    ))}
  </select>
  
  {selectedProfile && !selectedProfile.has_resume && (
    <p className="text-red-600 text-sm mt-1">
      This profile doesn't have a resume file. Please upload one first.
    </p>
  )}
</div>
```

### **2. Update Automation Start Call**

**Change this:**
```jsx
const response = await startJobAutomation({
  job: currentJob,
  profile: userProfile,
  resumeFile: resumeFile
});
```

**To this:**
```jsx
const response = await startJobAutomation({
  jobs: selectedJobs,
  profile_id: selectedProfile.id  // Use selected profile ID
});
```

### **3. Profile Management Page**

**Location:** New component or existing Profile tab

```jsx
const ProfileList = () => {
  const [profiles, setProfiles] = useState([]);
  
  useEffect(() => {
    fetchProfiles();
  }, []);
  
  const fetchProfiles = async () => {
    const response = await fetch('/api/user/profiles');
    const data = await response.json();
    setProfiles(data.profiles || []);
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Your Profiles</h3>
      
      {profiles.map(profile => (
        <div key={profile.id} className="border rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-medium">{profile.title}</h4>
              <p className="text-gray-600">{profile.full_name}</p>
              <p className="text-sm text-gray-500">{profile.email}</p>
              <p className="text-sm text-gray-500">
                Resume: {profile.has_resume ? '✓ Available' : '❌ Missing'}
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => editProfile(profile.id)}
                className="text-blue-600 hover:text-blue-800"
              >
                Edit
              </button>
              <button 
                onClick={() => deleteProfile(profile.id)}
                className="text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
      
      <button 
        onClick={() => setShowUploadModal(true)}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
      >
        + Create New Profile
      </button>
    </div>
  );
};
```

### **4. Update API Helper Functions**

**Add to `api.js`:**
```jsx
export const fetchUserProfiles = async () => {
  const response = await fetch('/api/user/profiles');
  return response.json();
};

export const fetchProfileById = async (profileId) => {
  const response = await fetch(`/api/user/profile/${profileId}`);
  return response.json();
};
```

## 🎯 User Experience Flow

1. **First Time:** User uploads resume → Creates first profile
2. **Multiple Profiles:** User can upload different resumes for different job types
3. **Job Application:** User selects which profile to use for automation
4. **Smart Selection:** System uses the resume file from selected profile

## 🔍 Benefits

- ✅ **Multiple Resumes**: Different resumes for different job types
- ✅ **Profile Switching**: Easy switching between profiles during job search
- ✅ **Data Integrity**: Each profile has its own resume and data
- ✅ **User Control**: Users choose which profile to use for each application
- ✅ **No Manual Upload**: Resume automatically used from selected profile

## 🚀 Ready to Test

Once frontend changes are made:
1. Upload a resume → Profile automatically created and saved
2. Select that profile during job automation
3. System will use the real profile data and resume file
4. No more "John Doe" mock data!

The backend is fully ready - just need the frontend profile selection UI! 🎉