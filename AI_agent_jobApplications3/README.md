# 🧠 AI Job Application Assistant

A Claude-powered SaaS platform that helps job seekers apply to dozens of jobs in just a few clicks — with structured profiles, AI-generated cover letters, and visual (human-like) form-filling using Selenium.

> Built with LangChain · Claude/Ollama · Crawlfire · SQLAlchemy · Selenium

---

## 🚀 Features

- 🔍 Search jobs from platforms like Indeed, Dice, Glassdoor (via Crawlfire)
- 📄 Upload your resume → auto-parsed into structured profile
- ✍️ Generate personalized cover letters using Claude
- 🤖 Automatically fill job forms (visually) via Selenium
- 📊 Track application history and job statuses
- 🔁 (Upcoming) Send follow-up emails to recruiters

---

## 🧠 Powered By Claude Agents

Each task is modularized as a Claude PRP agent:

| Agent               | Description                              |
|--------------------|------------------------------------------|
| `parse_resume`      | Resume text → structured JSON profile     |
| `write_cover_letter`| Profile + job → tailored cover letter     |
| `apply_to_jobs`     | Fills job forms visually using Selenium   |

Agents follow strict schema and formatting rules defined in [`CLAUDE.md`](./CLAUDE.md).

---

## 🛠️ Tech Stack

| Layer         | Tool                        |
|---------------|-----------------------------|
| LLMs          | Claude (prod), Ollama (dev) |
| Agent Runtime | LangChain                   |
| DB            | SQLite + SQLAlchemy         |
| Job Data      | Crawlfire API               |
| Automation    | Selenium (visual filling)   |
| CLI           | Python scripts              |
| Env Config    | dotenv                      |

---

## 🧱 Folder Structure

├── agents/ # Claude PRP agents
│ └── parse_resume/
│ ├── prp.md
│ ├── INITIAL.md
│ └── examples/
├── core/ # Core logic (DB, profile, job app)
│ ├── db/
│ │ └── models.py
│ ├── job_search/
│ │ └── fetch_jobs.py
│ ├── job_application/
│ │ └── automation.py
│ └── profile/
│ ├── schema.py
│ └── utils.py
├── .claude/ # Claude Code settings
│ └── settings.local.json
├── commands/ # CLI utilities
├── tests/ # Unit tests
├── CLAUDE.md # Global memory for Claude agents
├── PLANNING.md # Architecture + conventions
├── TASK.md # Development tracker
├── .env # Environment variables
└── README.md # You are here


---

## 🧪 Running Locally

```bash
# 1. Clone repo & enter directory
git clone git@github.com:your-username/job-agent.git
cd job-agent

# 2. Set up virtualenv
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set environment variables
cp .env.example .env

# 5. Run an agent
claude-code prp parse_resume
