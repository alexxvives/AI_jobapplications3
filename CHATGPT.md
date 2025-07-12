# CLAUDE.md — AI Job Application Platform (Simplify Clone)

## 🧠 Overview
This project is an MVP of a job automation platform inspired by Simplify.jobs. It leverages AI agents and DOM parsing to:

1. Parse resumes and build structured user profiles
2. Scrape job listings from ATS platforms (Lever, Greenhouse, Workday, etc.)
3. Auto-fill job application forms on external career websites

The system uses **Ollama** (running locally) as the core LLM engine to understand and map unstructured input into structured formats. The job application automation is handled via a **Chrome Extension**, enabling dynamic interaction with form fields and showing real-time progress to users.

---

## 📦 Module 1: Resume Parser

### 🎯 Goal
Enable users to upload their resume (PDF or DOCX), and extract structured data for a visual profile UI.

### 📥 Input
- Resume file uploaded by user (PDF or DOCX)

### 📤 Output JSON Schema
```json
{
  "personal_information": { ... },
  "work_experience": [ ... ],
  "education": [ ... ],
  "skills": [ ... ],
  "languages": [ "string" ],
  "job_preferences": { ... },
  "achievements": [ ... ],
  "certificates": [ ... ]
}
```

### 🛠️ Implementation
- Extract raw text using **pdf2text** or **mammoth.js** (DOCX)
- Build a prompt compatible with Ollama:

```txt
Extract job-seeking information from this resume. Return JSON matching the schema below:
{ ... [schema included here] ... }
Resume Text:
...raw text from resume...
```

- Send prompt to Ollama locally via CLI or API (e.g., `curl http://localhost:11434/api/generate`)
- Parse and validate JSON output
- Store result in PostgreSQL or local profile store for display/editing

---

## 🕸️ Module 2: Job Scraper

### 🎯 Goal
Scrape job listings from company pages hosted on known ATS platforms (Lever, Greenhouse, Workday).

### 📥 Input
- Long list of company names (e.g., Airbnb, Shopify, etc.)

### 📤 Output
- Structured job list with fields like:
```json
{
  "company": "string",
  "title": "string",
  "location": "string",
  "department": "string",
  "apply_url": "string",
  "platform": "lever | greenhouse | workday",
  "description": "HTML or text",
  "date_posted": "YYYY-MM-DD"
}
```

### 🔧 Implementation Steps
1. Use known URL patterns:
   - Lever: `https://jobs.lever.co/{company}` (JSON API available)
   - Greenhouse: `https://boards.greenhouse.io/{company}` (JSON with `?content=true`)
   - Workday: use Playwright to render SPA and extract listings dynamically

2. For each company:
   - Generate the URL and fetch data
   - Parse into unified format
   - De-duplicate and save

3. **Scheduler**: Use Node cron job or GitHub Actions to scrape daily

4. Store results in PostgreSQL with indexing for efficient querying in UI

---

## 🤖 Module 3: AI Job Applier

### 🎯 Goal
Automatically fill job application forms using DOM parsing + reasoning by Ollama. This is done within a **Chrome Extension** that interacts with the live page and provides visual feedback.

### 🧠 Architecture Overview
1. **Chrome Extension** injects a content script into job application pages
2. The script extracts structured input metadata:
   - Labels (via `label[for=...]` and text proximity)
   - Placeholders, input types, names, IDs
   - Contextual clues (e.g., headings or surrounding DOM nodes)

3. The extension sends this data + user profile to a local server that queries Ollama
4. Ollama returns `{ field_id: value }` JSON
5. The extension injects values and **displays a progress UI** (e.g. toast notifications or overlay)

### 🧩 DOM Extraction Example
```json
[
  {
    "id": "user_first_name",
    "label": "First Name",
    "placeholder": "e.g. John",
    "type": "text"
  },
  ...
]
```

### 📤 Prompt for Ollama
```txt
Given the user profile and a list of form fields, return a JSON mapping each input's ID to the correct value.

User Profile:
{ ...JSON user profile... }

Form Fields:
[ { id, label, placeholder, type }, ... ]

Return format:
{ "id": "value", ... }
```

### 🧠 Ollama Integration (Claude Code-ready)
```bash
curl http://localhost:11434/api/generate \
  -d '{
    "model": "mistral",  // or llama3, etc.
    "prompt": "...generated prompt...",
    "stream": false
  }'
```

### 💉 Form Injection
```js
for (const [id, value] of Object.entries(aiResponse)) {
  const el = document.getElementById(id);
  if (el) {
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
}
```

### 🪟 Progress Display in Chrome Extension
- Floating UI or toast that says:
  - ✅ "Filling field: First Name"
  - ✅ "Done filling 7 of 9 fields"
  - ❌ "Unsupported field detected: Upload Resume"
- Injected by `content.js` or popup UI via extension manifest

### 📂 Extension Files
```
/public
  └─ icon.png
/src
  ├─ content.js        // Main logic on job form pages
  ├─ popup.html + popup.js  // Optional user control panel
  └─ background.js     // Communicates with local Ollama server
/manifest.json         // Declares permissions and matches
```

---

## 🧱 Tech Stack
| Component         | Tech Choices                            |
|------------------|------------------------------------------|
| Frontend         | React + Tailwind + Next.js               |
| Backend          | Node.js Express or Vite + API routes     |
| Scraping         | Axios/Cheerio + Playwright               |
| LLM              | Ollama (local, via API or CLI)           |
| Chrome Extension | JS + DOM + Manifest V3                   |
| Database         | PostgreSQL (jobs, users, profiles)       |
| Hosting          | Local dev / Render / Docker              |
| Auth             | JWT-based or local token session         |

---

## 🔐 Security
- Resume files stored temporarily or encrypted
- CORS-limited access from extension
- Extension only runs on whitelisted domains (e.g. ATS URLs)

---

## 🚀 Future Enhancements
- Detect ATS platform via fingerprinting (URL patterns + DOM structure)
- Use embeddings to match user profile with job descriptions
- Full job-tracking dashboard (Applied, Interview, Offer, etc.)
- 1-click apply submission on supported platforms

---

## 📌 Conclusion
This Claude/Ollama-powered platform combines local LLM intelligence with real-time Chrome automation. It enables:
- Intelligent resume parsing
- Scalable job discovery
- Smart, visual autofill that adapts to different ATS forms

All while keeping control and privacy on the user's local machine.
