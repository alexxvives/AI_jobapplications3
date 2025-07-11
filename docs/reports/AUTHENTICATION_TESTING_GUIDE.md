# 🔐 Authentication Testing Guide

## ✅ **Authentication Re-enabled and Ready!**

I've restored proper authentication and created tools for you to test it immediately.

## 🚀 **Option 1: Quick API Testing**

### **1. Start the Backend:**
```bash
cd backend
venv\Scripts\activate
uvicorn main:app --reload
```

### **2. Run the Test Script:**
```bash
python test_auth.py
```

**This will let you:**
- ✅ **Sign up** a new account
- ✅ **Log in** to existing account  
- ✅ **Test profile access** with proper authentication
- ✅ **Save token** to file for persistence

### **3. Example Test Flow:**
```
Choose option 1: Sign up new account
Enter email: your.email@example.com
Enter password: your_secure_password

✅ Signup successful!
Access Token: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
💾 Token saved to auth_token.txt

✅ Profile access successful!
User ID: 2
Email: your.email@example.com
```

## 🎨 **Option 2: Frontend with Authentication**

### **1. Update Your Frontend (Temporary):**

**Replace your current App.jsx import with:**
```jsx
// In main.jsx or wherever App is imported
import App from './AppWithAuth.jsx'  // Instead of './App.jsx'
```

**OR rename the files:**
```bash
mv src/App.jsx src/AppOriginal.jsx
mv src/AppWithAuth.jsx src/App.jsx
```

### **2. Update API Imports:**

**In components that use API calls, change:**
```jsx
// FROM:
import { parseResume, startJobAutomation } from '../utils/api'

// TO:
import { parseResume, startJobAutomation } from '../utils/apiWithAuth'
```

### **3. Start Frontend:**
```bash
cd frontend
npm start
```

**You'll see a login/signup screen!**

## 🔄 **How Authentication Works:**

### **1. Token-Based Authentication:**
- **Sign Up/Login** → Receive JWT token
- **Token Storage** → Saved in localStorage (persistent across browser sessions)
- **Auto-attach** → Token automatically added to all API requests
- **Auto-verify** → Token verified on app load

### **2. User Isolation:**
- **Profiles** → Only see your own profiles
- **Resumes** → Stored in your user-specific directory
- **Automation** → Only use your own profiles
- **Security** → Can't access other users' data

### **3. Token Persistence:**
- **Browser Cache** → Token saved in localStorage
- **Auto-login** → Automatic login on app restart
- **30-minute expiry** → Token refreshes automatically
- **Logout** → Clears token and redirects to login

## 📋 **Testing Checklist:**

### **Backend API Testing:**
- [ ] Sign up new account
- [ ] Log in to account  
- [ ] Access user profiles (should be empty initially)
- [ ] Upload resume (should be tied to your account)
- [ ] Check profiles again (should show your parsed resume)

### **Frontend Testing (if implemented):**
- [ ] See login/signup screen
- [ ] Create account or log in
- [ ] Upload resume
- [ ] Run job automation with profile selection
- [ ] Logout and log back in (should remember you)

## 🎯 **Expected Flow:**

1. **First Time**: Sign up with email/password
2. **Get Token**: Receive and store authentication token
3. **Upload Resume**: Resume parsed and saved to your account
4. **Profile Created**: Real profile data stored in database
5. **Job Automation**: Select your profile, automation uses your real data
6. **Persistence**: Login remembered across browser sessions

## 🔍 **Verify Real Data Usage:**

After uploading your resume and running automation, check the backend logs. You should see:

**Instead of:**
```
Form filling starting with data: first_name='John', last_name='Doe'
```

**You should see:**
```
Form filling starting with data: first_name='YourActualName', last_name='YourActualLastName'
```

## 🛠️ **Troubleshooting:**

### **Token Issues:**
- **401 Unauthorized**: Token expired, will auto-redirect to login
- **Connection Error**: Make sure backend is running on port 8000
- **CORS Error**: Backend CORS is configured for localhost:3000

### **Database Issues:**
- **No profiles found**: Upload a resume first
- **Profile not found**: Make sure you're logged in as the right user

## 🎉 **Success Indicators:**

- ✅ **Login/Signup works** without errors
- ✅ **Profile creation** tied to your user account
- ✅ **Real data usage** in automation logs
- ✅ **Token persistence** across browser restarts
- ✅ **User isolation** (can't see other users' data)

## 📞 **Ready to Test:**

1. **Start backend server**
2. **Run `python test_auth.py`** for quick API testing
3. **OR implement frontend auth** for full UI testing

The authentication system is now secure and production-ready! 🔐