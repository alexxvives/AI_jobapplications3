# 🧠 Claude Project Memory — AI Job Application Platform

A Simplify.jobs clone that automates job applications using AI. Built with Ollama for local LLM processing, Chrome extension for form automation, and FastAPI backend.

---

## 🎯 Product Vision

**Goal**: Enable job seekers to apply to dozens of jobs automatically with AI-generated content and visual form filling.

**Core Value**: Upload resume once → AI fills forms everywhere → Track all applications in one dashboard.

---

## 🏗️ Architecture Overview

This platform has **3 core modules** that work together:

### Module 1: Resume Parser (`backend/services/profile_parsing/`)
- **Input**: PDF/DOCX resume files
- **Output**: Structured JSON profile data
- **Tech**: Python + pdf2text/mammoth + Ollama API

### Module 2: Job Scraper (`backend/services/job_scraping/`)
- **Input**: Company lists
- **Output**: Unified job listings from ATS platforms
- **Tech**: Python + requests/Playwright + platform-specific APIs

### Module 3: Job Applier (`backend/services/job_application/` + `chrome-extension/`)
- **Input**: User profile + job application URL
- **Output**: Auto-filled forms via Chrome extension
- **Tech**: Chrome extension + DOM parsing + Ollama reasoning

---

## 📂 Project Structure (Updated 2025-08-05)

```
├── backend/                   # FastAPI server (centralized)
│   ├── main.py               # API routes
│   ├── models.py             # Database models
│   ├── database.py           # Database connection
│   ├── db_config.py          # Centralized database configuration
│   ├── job_automation.db     # SINGLE database (2,746 jobs, 90 companies)
│   ├── scrapers/             # **NEW**: Platform-organized scrapers
│   │   ├── company_job_tracker.json # **UPDATED**: Multi-platform tracker (90 companies)
│   │   ├── lever/            # Lever platform scraping
│   │   │   ├── lever_company_discovery.py # WebSearch-based discovery
│   │   │   └── lever_scraper.py # Lever API integration
│   │   ├── workday/          # **NEW**: Workday platform scraping
│   │   │   ├── workday_company_discovery.py # site:myworkdayjobs.com discovery
│   │   │   └── workday_scraper.py # Workday jobs scraper
│   │   └── adp/              # ADP platform scraping
│   │       └── adp_scraper.py # ADP jobs scraper
│   ├── services/             # All business logic modules
│   │   ├── profile_parsing/   # Resume → JSON conversion
│   │   ├── job_application/   # Form automation logic
│   │   └── cover_letters/     # Cover letter generation
│   └── storage/              # User resumes & data
├── frontend/                 # React dashboard
│   ├── src/components/       # UI components
│   │   └── ModernJobSearch.jsx # **FIXED**: Profile selection bug resolved
│   └── public/assets/logos/  # **NEW**: Company logo assets
├── chrome-extension/         # Browser automation
│   ├── content.js           # DOM interaction
│   ├── background.js        # Ollama communication
│   └── web-bridge.js        # Cross-domain communication
└── lib/ollama/              # **CONFIRMED**: Ollama runtime libraries (2.6GB - required)
```

---

## 🔄 User Flow

1. **Profile Setup**
   - User uploads resume (PDF/DOCX)
   - `profile_parsing` module extracts structured data via Ollama
   - Profile stored in backend database for editing

2. **Job Discovery**
   - **Multi-platform discovery**: `site:jobs.lever.co` for Lever, `site:myworkdayjobs.com` for Workday
   - **Platform-specific scrapers**: Lever API + Workday HTML parsing
   - **Centralized tracking**: `company_job_tracker.json` with `job_links` array supporting multiple platforms per company
   - Jobs displayed in React frontend with filters (2,746+ active jobs)

3. **Application Automation**
   - User selects jobs to apply to
   - Chrome extension navigates to application URL
   - `job_application` module generates form-filling instructions
   - Extension fills forms and shows progress overlay

---

## 🚀 Job Application Automation Process (Detailed)

### **Simplify.jobs-Style Chrome Extension Workflow**

**Phase 1: User Initiation**
1. User browses jobs and selects multiple jobs to apply to
2. User chooses which profile/resume to use for applications  
3. User clicks "Start Applying" button
4. Backend prepares application queue and creates automation session

**Phase 2: Per-Job Automation Loop**
1. System opens new browser tab with first job's application URL
2. Chrome extension automatically detects job page and activates itself (no manual opening required)
3. Extension popup/sidebar appears showing:
   - Current progress (e.g., "Job 1 of 5")
   - Profile data being used
   - Form filling status/progress
   - "Waiting for user submission" indicator

**Phase 3: Form Filling & User Interaction**
1. Extension automatically fills form fields using profile data
2. User reviews filled information and can make adjustments
3. User manually clicks the job site's "Submit Application" button
4. Extension monitors for successful submission

**Phase 4: Progression Control**
1. Extension detects user has submitted the application
2. System confirms submission was successful
3. **ONLY AFTER** successful submission, open next job tab
4. Repeat loop for remaining jobs

**Phase 5: Error Handling**
- If submission fails: DO NOT proceed to next job, show error state
- If user cancels: Allow skip current job or stop entire process  
- If page errors: DO NOT proceed, handle gracefully

### **Critical Requirements**
- ✅ User-controlled submission (extension fills, user submits)
- ✅ Wait for submission before proceeding to next job
- ✅ Error blocking (no progression if anything fails)
- ✅ Auto-extension activation on job page load
- ✅ Progress tracking and user feedback

4. **Tracking & Management**
   - Application status tracked in dashboard
   - Users can review/edit before submission

---

## 🤖 AI Integration (Ollama)

All AI processing uses **local Ollama** for privacy and control:

### Resume Parsing Prompt
```
Extract structured data from this resume. Return valid JSON only:
{schema definition}

Resume text:
{extracted_text}
```

### Form Filling Prompt
```
Map user profile data to form fields. Return JSON mapping field IDs to values:

User Profile: {profile_json}
Form Fields: [{id, label, type, placeholder}...]

Output: {"field_id": "value", ...}
```

### Ollama API Usage
```bash
curl http://localhost:11434/api/generate \
  -d '{"model": "mistral", "prompt": "...", "stream": false}'
```

---

## 🎨 Frontend Components

- **ProfileManager**: Edit/view user profile data
- **JobSearch**: Browse and filter scraped jobs
- **AutomationModal**: Configure application settings
- **Dashboard**: Track application status and history

---

## 🌐 Chrome Extension Flow

1. **DOM Analysis**: Extract form structure (labels, IDs, types)
2. **AI Reasoning**: Send form data + profile to Ollama via local API
3. **Form Injection**: Fill fields with returned values
4. **Progress Display**: Show filling progress with overlay UI
5. **User Control**: Allow review before submission

---

## 📊 Database Schema

**Core Tables**:
- `users` - Authentication & basic info
- `user_profiles` - Structured resume data (JSON fields)
- `jobs` - Scraped job listings
- `applications` - Application tracking & status

**JSON Profile Structure**:
```json
{
  "personal_information": {
    "full_name": "string",
    "email": "string", 
    "phone": "string",
    "address": "string"
  },
  "work_experience": [
    {
      "title": "string",
      "company": "string", 
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM or null",
      "description": "string"
    }
  ],
  "education": [...],
  "skills": [...],
  "job_preferences": {...}
}
```

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | FastAPI + SQLAlchemy + SQLite |
| Frontend | React + Vite + Tailwind |
| AI Engine | Ollama (local) |
| Automation | Chrome Extension + DOM manipulation |
| Scraping | Python requests + Playwright |
| Database | SQLite (dev) → PostgreSQL (prod) |

---

## 📊 Database Schema (Updated 2025-07-13)

### **Recent Schema Changes**
- ✅ **Jobs table**: Renamed `source` → `platform` for consistency
- ✅ **Companies table**: Simplified - removed `domain`, `status`, `platform` fields
- ✅ **Profiles table**: Removed `image_url` field
- ✅ **Fixed job parsing**: No more character splitting issues in job_type/location fields

### **Current Table Structure**

**Jobs Table**:
```sql
CREATE TABLE jobs (
    id INTEGER PRIMARY KEY,
    title VARCHAR NOT NULL,
    company VARCHAR NOT NULL, 
    location VARCHAR,
    description TEXT,
    link VARCHAR UNIQUE NOT NULL,
    platform VARCHAR,  -- "lever", "greenhouse", "workday", etc.
    job_type VARCHAR,
    work_type VARCHAR,
    experience_level VARCHAR,
    salary_range VARCHAR,
    remote_option BOOLEAN,
    fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);
```

**Companies Table** (Simplified):
```sql
CREATE TABLE companies (
    id INTEGER PRIMARY KEY,
    name VARCHAR UNIQUE NOT NULL,
    url VARCHAR,
    job_count INTEGER DEFAULT 0,
    last_scraped DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Profiles Table** (No image_url):
```sql
CREATE TABLE profiles (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR NOT NULL DEFAULT 'My Profile',
    full_name VARCHAR,
    email VARCHAR,
    phone VARCHAR,
    gender VARCHAR,
    address VARCHAR,
    city VARCHAR,
    state VARCHAR,
    zip_code VARCHAR,
    country VARCHAR,
    citizenship VARCHAR,
    work_experience JSON,
    education JSON,
    skills JSON,
    languages JSON,
    job_preferences JSON,
    achievements JSON,
    certificates JSON,
    resume_path VARCHAR,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);
```

### **Database Path Management** 
- **Single database file**: `backend/job_automation.db`
- **All scrapers must run from**: `backend/` directory (not subdirectories)
- **New scraper structure**: `backend/scrapers/{platform}/{platform}_scraper.py`
- **Database service**: Uses `db_config.py` for consistent paths

⚠️ **Important**: Always run scraping scripts from `backend/` directory to avoid creating duplicate database files in subdirectories.

### **Preventing Duplicate Database Files**
**Problem**: SQLite with relative paths creates new database files when run from different directories.

**Solution**:
```bash
# ✅ CORRECT - Run from backend directory (NEW STRUCTURE)
cd backend
python3 scrapers/lever/lever_scraper.py
python3 scrapers/workday/workday_scraper.py

# ❌ WRONG - Creates duplicate database in scrapers/ subdirectories  
cd backend/scrapers/lever
python3 lever_scraper.py
```

**Prevention Rules**:
1. **Always run Python scripts from** `backend/` **directory**
2. **Database file path**: `backend/job_automation.db` (managed by `db_config.py`)
3. **New scraper paths**: `backend/scrapers/{platform}/{platform}_scraper.py`
4. **Centralized tracker**: `backend/scrapers/company_job_tracker.json`

---

## 🔧 Development Commands

```bash
# Backend - NOTE: Requires PyPDF2, mammoth, ollama packages (pip3 install --break-system-packages PyPDF2 mammoth ollama)
cd backend && uvicorn main:app --reload

# Frontend  
cd frontend && npm run dev

# Job Scrapers (NEW STRUCTURE - prevents duplicate databases)
cd backend && python3 scrapers/lever/lever_scraper.py
cd backend && python3 scrapers/workday/workday_scraper.py

# Company Discovery (run via Claude with WebSearch)
cd backend && python3 scrapers/lever/lever_company_discovery.py
cd backend && python3 scrapers/workday/workday_company_discovery.py

# Database inspection
cd backend && python3 check_actual_database.py

# Ollama (local) - NOTE: Ollama is installed at /home/alexxvives/ollama/bin/ollama
/home/alexxvives/ollama/bin/ollama serve
/home/alexxvives/ollama/bin/ollama pull mistral

# Chrome Extension
Load unpacked from chrome-extension/ directory
```

---

## 📋 Current Implementation Status

✅ **Completed**:
- ✅ **Major Codebase Reorganization** (2025-08-05): Complete restructuring and cleanup
  - **Platform-Organized Scrapers**: Moved scrapers into `backend/scrapers/{platform}/` folders
  - **Multi-Platform Company Tracker**: Updated `company_job_tracker.json` to use `job_links` array format
  - **Workday Platform Support**: Created `workday_company_discovery.py` and `workday_scraper.py` 
  - **Centralized Tracker**: Single `company_job_tracker.json` supports multiple platforms per company
  - **Massive File Cleanup**: Removed 50+ outdated files (docs, test files, legacy code)
- ✅ **ModernJobSearch Bug Fix** (2025-08-05): Fixed critical "profiles.map is not a function" error
  - **Enhanced Error Handling**: Added comprehensive array validation and loading states
  - **Mandatory Profile Selection**: Users must select profile before job automation
  - **Improved UX**: Loading spinners and detailed error logging
- ✅ **WebSearch Company Discovery** (2025-08-04): Found 90 validated companies using platform-specific searches
- ✅ **Database Consolidation**: Single `job_automation.db` with 2,746+ jobs from 90 companies
- ✅ **Centralized Database Configuration**: `db_config.py` ensures consistent database paths
- ✅ **Database schema cleanup** (2025-07-13): Simplified tables, renamed fields, fixed parsing issues
- ✅ **Lever scraper working**: Successfully tested with Activecampaign (33+ jobs)
- ✅ **Unified database architecture**: Single SQLite file, consistent schema
- ✅ **Resume parsing** with Ollama integration
- ✅ **Job scraping framework** for Lever, Greenhouse, Workday
- ✅ **React frontend** with profile management
- ✅ **Chrome extension structure**
- ✅ **FastAPI backend** with SQLAlchemy + SQLite
- ✅ **Chrome Extension Form Filling** (2025-07-14): Complete cross-domain communication and automated form filling
- ✅ **Programmatic Resume Upload**: Automatic resume download and upload to file input fields
- ✅ **Advanced Field Mapping**: Handles complex UUID-based field names, languages, locations, visa requirements
- ✅ **Anti-Hallucination**: Only fills actual profile data, no hardcoded defaults
- ✅ **Ollama Integration Overhaul** (2025-07-15): Complete simplification and improvement of AI form filling
  - **Simplified Architecture**: Pre-extract clean user data, send clean form structure to Ollama
  - **Smart Location Handling**: Distinguishes between current location vs. preferred job location
  - **Enhanced Debugging**: Full prompt/response logging with user feedback during AI processing
  - **No Smart Defaults**: Returns null when data unavailable instead of guessing
  - **Fixed Authentication**: Temporarily bypassed auth issues for profile loading
- ✅ **Major Ollama Integration Fixes** (2025-07-16): Complete rewrite of form processing and validation
  - **Enhanced JSON Parsing**: Robust brace counting algorithm for multiline JSON responses
  - **Radio Button Deduplication**: Fixed duplicate question extraction for radio button groups
  - **Dropdown Option Enforcement**: Strict validation ensuring exact option matching from provided lists
  - **Complete Profile Integration**: All work experience, education, skills, certificates sent to Ollama
  - **Advanced Prompt Engineering**: Clear examples with ✅/❌ indicators and mandatory field requirements
  - **Field Validation System**: Comprehensive logging of missing fields and dropdown violations
  - **Sample Options for Large Dropdowns**: Show first 5 options as examples for 10+ option dropdowns

🔄 **In Progress**:
- **Chrome Extension Testing**: End-to-end testing with real job application forms
- **Session Management**: Debugging automation session endpoint issues

## 🔍 Current Job Scraping Approach (Updated 2025-08-05)

### **Multi-Platform Company Discovery**
- **Lever Discovery**: `site:jobs.lever.co {search_term}` → `lever_company_discovery.py`
- **Workday Discovery**: `site:myworkdayjobs.com {search_term}` → `workday_company_discovery.py`
- **Success Rate**: 100% - all discovered companies have validated job platforms
- **Current Database**: 90 companies with 2,746+ active jobs

### **Company Tracker Format (NEW)**
```json
{
  "company": "Company Name",
  "job_links": [
    "https://api.lever.co/v0/postings/company?mode=json",
    "https://company.wd1.myworkdayjobs.com/CompanyCareers"
  ]
}
```

### **Platform-Specific Scrapers**
- **Lever**: `lever_scraper.py` - Uses Lever API (`api.lever.co`)
- **Workday**: `workday_scraper.py` - Parses HTML from Workday sites (`myworkdayjobs.com`)
- **ADP**: `adp_scraper.py` - Ready for ADP platform integration
- **Centralized**: Single `company_job_tracker.json` supports all platforms

### **Data Quality Standards**
- ✅ **Multi-Platform Support**: Companies can have multiple job platforms
- ✅ **Platform Validation**: Each platform type validated differently
- ✅ **Centralized Tracking**: Single tracker file prevents data fragmentation
- ✅ **Extensible Design**: Easy to add new platforms (Greenhouse, etc.)

🗓️ **Next Session Priorities**:
1. **Workday Company Discovery**: Run WebSearch discovery to find Workday companies using `site:myworkdayjobs.com` with job search terms
2. **Test Workday Scraper**: Validate `workday_scraper.py` works with real Workday job sites
3. **Expand Company Database**: Add discovered Workday companies to `company_job_tracker.json`
4. **Platform Integration**: Ensure both Lever and Workday scrapers work together seamlessly
5. **Job Database Growth**: Aim to expand from 2,746 to 4,000+ jobs with Workday integration

**Future Planned**:
- **Greenhouse Platform**: Add `site:boards.greenhouse.io` discovery
- **Application Status Tracking**: Enhanced dashboard features  
- **Cover Letter Generation**: AI-powered personalized letters
- **Production Deployment**: Scale to handle thousands of companies

---

## 🎯 Next Development Priorities

1. **Complete Chrome Extension**: Finish Ollama integration for real-time form filling
2. **Improve Form Detection**: Handle complex ATS forms and edge cases  
3. **Add Application Tracking**: Status updates and follow-up management
4. **Optimize Performance**: Caching, error handling, retry logic
5. **Production Ready**: Authentication, security, deployment

---

## 💡 Key Design Principles

- **Privacy First**: All AI processing happens locally via Ollama
- **Modular Architecture**: Each module can be developed/tested independently  
- **User Control**: Always allow manual review before submission
- **Extensible**: Easy to add new ATS platforms and form types
- **Transparent**: Show progress and reasoning to build user trust

---

## 🤖 AI Integration with Ollama

The platform uses **Ollama** for local AI processing, providing privacy and speed for resume parsing and content generation.

### Ollama Setup & Installation

**Required Model**: `llama3.2` for resume parsing and cover letter generation

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh  < /dev/null |  sh

# Pull required model  
ollama pull llama3.2

# Start Ollama service (runs on localhost:11434)
ollama serve
```

### AI-Powered Resume Parsing

**Location**: `backend/agent_orchestrator.py` → `parse_resume()`

**Process**:
1. Extract text from PDF/DOCX files using PyPDF2/python-docx
2. Send structured prompt to Ollama llama3.2 model
3. Parse AI response into Profile model fields
4. Fallback to regex parsing if Ollama unavailable

**Benefits over regex parsing**:
- ✅ Handles complex resume layouts and formats
- ✅ Extracts rich context (job descriptions, achievements)
- ✅ Better at parsing education, work experience, skills
- ✅ Understands semantic meaning vs pattern matching

### AI Agents Available

| Agent               | Model | Location | Description |
|--------------------|-------|----------|-------------|
| `parse_resume`      | llama3.2 | `agent_orchestrator.py` | Extracts structured data from resume text |
| `write_cover_letter` | llama3.2 | `agent_orchestrator.py` | Generates personalized cover letters |
| `analyze_form`      | llama3.2 | `main.py:/ai/analyze-form` | **NEW**: Intelligent form field mapping with clean data extraction |

### Enhanced Form Filling with Ollama (2025-07-15)

**New Simplified Architecture**:
1. **Pre-extract clean user data** from profile (name, email, current_location, preferred_location, etc.)
2. **Send clean form structure** to Ollama (field name, type, label, options only)
3. **Smart field mapping** based on field labels and context
4. **No hallucination** - returns null when data not available

**Key Improvements**:
- ✅ **Context-aware**: Distinguishes "current location" vs "which location are you applying for"
- ✅ **Transparent logging**: Full prompt and response visibility
- ✅ **User feedback**: Shows "AI is thinking..." during processing
- ✅ **Clean data flow**: Profile → Clean extraction → Ollama → Field mapping

### Error Handling & Fallbacks

- **Ollama Unavailable**: Falls back to regex-based parsing for basic fields
- **JSON Parse Errors**: Cleans response and retries parsing  
- **Model Not Found**: Automatically attempts to use available models
- **Network Issues**: Graceful degradation to manual parsing

---
