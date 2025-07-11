# Modules Overview

This directory contains the core business logic modules for the AI Job Application Assistant platform.

## Module Structure

### 1. Profile Parsing (`profile_parsing/`)
**Purpose**: Convert uploaded resumes into structured user profiles
- **Input**: PDF, DOC, DOCX, TXT files
- **Output**: Structured JSON profile data
- **Key Components**:
  - `ai_parser.py` - Ollama integration for AI parsing
  - `file_extractor.py` - Text extraction from various file formats
  - `schema.py` - Profile data structure definitions
  - `prompts/` - AI prompts and examples

### 2. Job Scraping (`job_scraping/`)
**Purpose**: Discover and collect job postings from various ATS platforms
- **Input**: Company domains and platform configurations
- **Output**: Structured job data in databases
- **Key Components**:
  - `scrapers/` - Platform-specific scrapers (Workday, Lever, ADP)
  - `company_data/` - Company lists and configurations
  - `databases/` - Job storage databases
  - `browser_tools/` - Chrome/browser binaries

### 3. Job Application (`job_application/`)
**Purpose**: Automate job application form filling with visual feedback
- **Input**: User profile + job application URL
- **Output**: Completed job application
- **Key Components**:
  - `form_filler.py` - Selenium-based form automation
  - `instruction_generator.py` - AI-generated automation steps
  - `visual_monitor.py` - Real-time user feedback
  - `browser_automation.py` - Browser control logic

### 4. Cover Letters (`cover_letters/`)
**Purpose**: Generate personalized cover letters for job applications
- **Input**: User profile + job description
- **Output**: Customized cover letter text
- **Key Components**:
  - `generator.py` - AI-powered cover letter creation
  - `prompts/` - Cover letter generation prompts
  - `templates/` - Cover letter templates

## Integration Flow

```
User Upload → Profile Parsing → Job Scraping → Job Application + Cover Letters
    ↓              ↓               ↓              ↓
  Resume File → JSON Profile → Job Database → Automated Applications
```

## Shared Dependencies

- **Backend API**: Provides REST endpoints for each module
- **Frontend UI**: Interfaces for user interaction with all modules
- **Shared Utils**: Common utilities used across modules
- **Database**: Centralized data storage for profiles and jobs

## Development Guidelines

1. **Modularity**: Each module should be self-contained with clear interfaces
2. **Testing**: Each module should have comprehensive unit tests
3. **Documentation**: All public functions should be documented
4. **Error Handling**: Graceful degradation and clear error messages
5. **Performance**: Optimize for speed and resource usage

## Configuration

Each module can be configured through:
- Environment variables (via `.env`)
- Module-specific config files
- Runtime parameters passed through the API

## Getting Started

1. **Set up dependencies**: Each module has its own requirements
2. **Configure environment**: Set up `.env` file with required variables
3. **Initialize databases**: Run database setup scripts
4. **Start services**: Backend API and any required services (Ollama, etc.)
5. **Run tests**: Ensure all modules are working correctly