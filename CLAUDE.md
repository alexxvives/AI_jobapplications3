# 🧠 Claude Project Memory — AI Job Application Assistant

This is a Claude-powered SaaS platform that helps B2C job seekers apply to jobs at scale without manually re-entering the same info. Users create structured profiles (manually or via resume upload), search for jobs, and trigger agents to apply automatically via visual browser automation.

This file is loaded as **global memory** for all Claude agents.

---

## 🎯 Product Vision

Help job seekers apply to dozens of jobs in just a few clicks — with AI-generated content, visual form filling, and centralized application tracking.

---

## 👤 User Flow

1. **Create Profile**
   - Manually enter data or upload resume
   - Resume is parsed into structured JSON (`parse_resume` agent)
   - Data is stored in user_profiles table with JSON fields

2. **Search for Jobs**
   - Uses Crawlfire API to pull from job platforms
   - Results stored in SQLite and filtered client-side

3. **Select & Apply**
   - Jobs selected by user trigger `apply_to_jobs` agent
   - Forms filled via Selenium with user profile data
   - User can review & submit or let the agent submit

4. **Track Outcomes**
   - Applications and statuses are saved and viewable in a dashboard

5. *(Planned)* Send follow-up emails to recruiters using an optional email agent

---

## 🤖 Available Agents

Each agent lives in `/agents/{agent_name}/` with:

- `prp.md` — Main prompt (used by Claude)
- `INITIAL.md` — Design rationale, constraints, edge cases
- `examples/` — I/O test samples

| Agent               | Description                                      |
|--------------------|--------------------------------------------------|
| `parse_resume`      | Turns plain-text resumes into structured JSON    |
| `write_cover_letter` | Generates cover letters per job+profile          |
| `apply_to_jobs`     | Fills job forms using profile data (via Selenium)|
| *(planned)* `send_followup_email` | Drafts follow-up emails after applying     |

---

## ⚙️ Tech Stack

| Area                  | Tool                    |
|-----------------------|-------------------------|
| LLM (Dev)             | Ollama (local)          |
| LLM (Prod)            | Claude (via Cursor)     |
| Orchestration         | LangChain               |
| Job Data              | Crawlfire API           |
| Form Automation       | Selenium                |
| Database              | SQLite + SQLAlchemy     |
| Environment Config    | `python-dotenv`         |

---

## 📂 Project Folder Conventions

- All agents use `/agents/{name}/prp.md`, `INITIAL.md`, and `examples/`
- Core logic is in `/core/` (e.g. profile, job_search, job_application)
- DB schema lives in `/core/profile/schema.sql`
- Claude-specific config lives in `.claude/`
- `TASK.md` is your roadmap. Always consult + update it.

---

## 🧠 Prompt Engineering Rules

All Claude agents must follow these rules strictly:

- ✅ **Input/Output Formats**
  - Output **only raw JSON or plain text** — never include markdown, explanations, or extra content
  - Bullet points must be separated with `\n`
  - Normalize any "Present" date into `null`

- ✅ **Data Handling**
  - Return all required keys, even if data is missing
  - Use empty strings, `null`, or empty arrays as needed
  - Validate JSON using the schema below

- ✅ **Resume Parsing**
  - Must match the profile schema exactly
  - Resume parsing is not summarization — extract all structured data
  - Output will be stored in user_profiles table with JSON fields

- ✅ **Behavior**
  - Never hallucinate functions or imports
  - Ask for missing input rather than guessing
  - Validate logic before submitting output

---

## ⚠️ Error Handling Guidelines

### **Input Validation**
- **Required Fields**: Each agent has specific required input fields
- **Data Types**: Validate JSON structure and data types
- **URL Validation**: Ensure valid HTTP/HTTPS URLs for job applications
- **Empty Inputs**: Handle gracefully with appropriate error messages

### **Output Validation**
- **JSON Syntax**: All JSON outputs must be valid syntax
- **Schema Compliance**: Outputs must match expected schemas exactly
- **Required Keys**: All required keys must be present (even if null)
- **Data Types**: Arrays must be arrays, objects must be objects

### **Error Responses**
- **Invalid Input**: Return clear error message with specific issue
- **Missing Data**: Use null/empty values rather than failing
- **Processing Errors**: Provide actionable error messages
- **Timeout Handling**: Include timeout considerations for automation

---

## 🔄 Agent Integration Patterns

### **Data Flow Between Agents**
```
parse_resume → write_cover_letter → apply_to_jobs
     ↓              ↓                    ↓
Profile JSON → Cover Letter → Selenium Instructions
```

### **Error Propagation**
- **Upstream Errors**: If parse_resume fails, downstream agents should handle gracefully
- **Partial Data**: Agents should work with incomplete data when possible
- **Fallback Values**: Use sensible defaults for missing critical data

### **Validation Chain**
- **Input Validation**: Each agent validates its own inputs
- **Output Validation**: Each agent ensures its outputs match expected format
- **Cross-Agent Validation**: Downstream agents validate upstream outputs

---

## ⏱️ Performance & Timeout Guidelines

### **Agent Timeout Limits**
- **parse_resume**: 60 seconds for large resumes
- **write_cover_letter**: 30 seconds for generation
- **apply_to_jobs**: 45 seconds for instruction generation
- **Overall pipeline**: 5 minutes maximum

### **Progress Feedback**
- **parse_resume**: "Processing resume sections...", "Extracting contact info...", "Parsing work experience..."
- **write_cover_letter**: "Analyzing job requirements...", "Generating cover letter...", "Finalizing content..."
- **apply_to_jobs**: "Mapping profile data...", "Generating instructions...", "Adding form fields..."

### **Rate Limiting Considerations**
- **API Calls**: Limit to 10 requests per minute per user
- **Automation**: Maximum 5 concurrent applications per user
- **Database**: Implement connection pooling for high concurrency
- **Error Recovery**: Exponential backoff for failed requests

---

## 📋 Resume → Profile Schema

Used by the `parse_resume` agent. Output will be stored in user_profiles table with JSON fields.

```json
{
  "personal_information": {
    "full_name": "string",
    "email": "string",
    "phone": "string",
    "gender": "string or null",
    "address": "string or null",
    "city": "string or null",
    "state": "string or null",
    "zip_code": "string or null",
    "country": "string or null",
    "citizenship": "string or null"
  },
  "work_experience": [
    {
      "title": "string",
      "company": "string",
      "location": "string",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM or null (use null if 'Present')",
      "description": "string (use \\n for bullets)"
    }
  ],
  "education": [
    {
      "degree": "string",
      "school": "string",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM or null",
      "gpa": "string or null"
    }
  ],
  "skills": [
    {
      "name": "string",
      "years": "integer or null"
    }
  ],
  "languages": ["string", "string", "..."],
  "job_preferences": {
    "linkedin": "string",
    "twitter": "string",
    "github": "string",
    "portfolio": "string",
    "other_url": "string",
    "notice_period": "string",
    "total_experience": "string",
    "default_experience": "string",
    "highest_education": "string",
    "companies_to_exclude": "string",
    "willing_to_relocate": "string",
    "driving_license": "string",
    "visa_requirement": "string",
    "race_ethnicity": "string"
  },
  "achievements": [
    {
      "title": "string",
      "issuer": "string or null",
      "date": "string or null",
      "description": "string or null"
    }
  ],
  "certificates": [
    {
      "name": "string",
      "organization": "string or null",
      "issue_date": "string or null",
      "expiry_date": "string or null",
      "credential_id": "string or null",
      "credential_url": "string or null"
    }
  ]
}

```

**Database Storage:**
- `personal_information` fields → Individual columns in `user_profiles`
- `work_experience` → JSON field in `user_profiles`
- `education` → JSON field in `user_profiles`
- `skills` → JSON field in `user_profiles`
- `languages` → JSON field in `user_profiles`
- `job_preferences` fields → Individual columns in `user_profiles`
- `achievements` → JSON field in `user_profiles`
- `certificates` → JSON field in `user_profiles`

---

## 🧪 Testing & Validation

### **Agent Testing Strategy**
- **Unit Tests**: Each agent has example inputs/outputs in `/examples/`
- **Integration Tests**: Test data flow between agents
- **Edge Case Testing**: Handle malformed inputs gracefully
- **Performance Testing**: Ensure reasonable response times

### **Validation Checklist**
- [ ] All required schema keys are present
- [ ] Date formats are consistent (YYYY-MM)
- [ ] JSON syntax is valid
- [ ] No hallucinated data included
- [ ] Error handling is comprehensive
- [ ] Output format matches expectations
- [ ] Timeout limits are respected
- [ ] Progress feedback is provided
- [ ] Database compatibility is maintained
