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

## 📂 Project Structure

```
├── backend/                   # FastAPI server (centralized)
│   ├── main.py               # API routes
│   ├── models.py             # Database models
│   ├── database.py           # Database connection
│   ├── job_automation.db     # Main database
│   ├── multi_platform_jobs.db # Job scraping data
│   ├── services/             # All business logic modules
│   │   ├── profile_parsing/   # Resume → JSON conversion
│   │   │   ├── ai_parser.py   # Ollama integration
│   │   │   ├── file_extractor.py # PDF/DOCX text extraction
│   │   │   ├── schema.py      # Profile data structure
│   │   │   └── prompts/       # Ollama prompts + examples
│   │   ├── job_scraping/      # ATS platform scraping
│   │   │   └── scrapers/      # Platform-specific scrapers
│   │   ├── job_application/   # Form automation logic
│   │   │   ├── instruction_generator.py # Profile → form mapping
│   │   │   ├── intelligent_form_filler.py
│   │   │   └── prompts/       # Form filling prompts
│   │   └── cover_letters/     # Cover letter generation
│   ├── data/                 # Company lists & aliases
│   └── storage/              # User resumes & data
├── frontend/                 # React dashboard
│   └── src/components/       # UI components
├── chrome-extension/         # Browser automation
│   ├── content.js           # DOM interaction
│   ├── background.js        # Ollama communication
│   └── popup.js             # User controls
├── shared/                   # Common utilities
└── docs/                     # Essential documentation
```

---

## 🔄 User Flow

1. **Profile Setup**
   - User uploads resume (PDF/DOCX)
   - `profile_parsing` module extracts structured data via Ollama
   - Profile stored in backend database for editing

2. **Job Discovery**
   - `job_scraping` runs daily to fetch from Lever, Greenhouse, Workday
   - Jobs displayed in React frontend with filters

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
- **All scrapers must run from**: `backend/` directory (not `backend/services/job_scraping/scrapers/`)
- **Database service**: Uses relative path `./job_automation.db`

⚠️ **Important**: Always run scraping scripts from `backend/` directory to avoid creating duplicate database files in subdirectories.

### **Preventing Duplicate Database Files**
**Problem**: SQLite with relative paths creates new database files when run from different directories.

**Solution**:
```bash
# ✅ CORRECT - Run from backend directory
cd backend
python3 -c "from services.job_scraping.scrapers.lever_scraper import LeverScraper; ..."

# ❌ WRONG - Creates duplicate database in scrapers/ directory  
cd backend/services/job_scraping/scrapers
python3 lever_scraper.py
```

**Prevention Rules**:
1. **Always run Python scripts from** `backend/` **directory**
2. **Database file path**: `backend/job_automation.db` (relative: `./job_automation.db`)
3. **Import scrapers with**: `from services.job_scraping.scrapers.xxx import ...`
4. **Before scraping**: Check you're in `backend/` directory with `pwd`

---

## 🔧 Development Commands

```bash
# Backend
cd backend && uvicorn main:app --reload

# Frontend  
cd frontend && npm run dev

# Job Scrapers (prevents duplicate databases)
cd backend && python3 run_scraper.py

# Manual scraper testing
cd backend
python3 -c "from services.job_scraping.scrapers.lever_scraper import LeverScraper; ..."

# Database inspection
cd backend && python3 temp_db_inspection.py

# Ollama (local)
ollama serve
ollama pull mistral

# Chrome Extension
Load unpacked from chrome-extension/ directory
```

---

## 📋 Current Implementation Status

✅ **Completed**:
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

🔄 **In Progress**:
- **Job scraping scale-up**: Test more Lever companies, fix other platform scrapers
- **Form filling edge cases**: Final debugging of specific field types and dropdown matching

🗓️ **Planned**:
- **Application status tracking**
- **Cover letter generation**
- **Email follow-ups** 
- **Advanced job matching**
- **Production deployment**

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
| `apply_to_jobs`     | llama3.2 | `agent_orchestrator.py` | Creates form-filling instructions |

### Error Handling & Fallbacks

- **Ollama Unavailable**: Falls back to regex-based parsing for basic fields
- **JSON Parse Errors**: Cleans response and retries parsing  
- **Model Not Found**: Automatically attempts to use available models
- **Network Issues**: Graceful degradation to manual parsing

---
