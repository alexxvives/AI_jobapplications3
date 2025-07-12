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

## 🔧 Development Commands

```bash
# Backend
cd backend && uvicorn main:app --reload

# Frontend  
cd frontend && npm run dev

# Ollama (local)
ollama serve
ollama pull mistral

# Chrome Extension
Load unpacked from chrome-extension/ directory
```

---

## 📋 Current Implementation Status

✅ **Completed**:
- Resume parsing with Ollama integration
- Job scraping for Lever, Greenhouse, Workday
- React frontend with profile management
- Chrome extension structure
- FastAPI backend with SQLite

🔄 **In Progress**:
- Chrome extension ↔ Ollama integration
- Advanced form field detection
- Application status tracking

🗓️ **Planned**:
- Cover letter generation
- Email follow-ups
- Advanced job matching
- Production deployment

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