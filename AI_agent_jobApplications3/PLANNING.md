# 🧭 PLANNING.md — Architecture & Dev Strategy

This document defines the architecture, naming conventions, agent design, and workflow plan for the AI Job Application Assistant.

It is used by both AI agents (Claude Code) and human developers as a shared blueprint.

---

## 🎯 Product Goal

Build a modular platform that enables B2C job seekers to:

- Create structured profiles (via resume or manual input)
- Search for jobs from multiple platforms
- Apply visually to selected jobs using agents
- Track job applications and statuses
- Eventually follow up with recruiters

---

## 🧱 Architecture Overview

Claude Agents ── LangChain ── Core Backend ── SQLite
│ │
│ └───> Crawlfire API (job sync)
└───> Prompts & Tools └───> Selenium (visual apply)


---

## 🧠 Agents

Agents live in `/agents/{agent_name}/`, each with:

- `prp.md` — Prompt definition
- `INITIAL.md` — Design rationale + rules
- `examples/` — I/O sample files

| Agent               | Purpose                                      |
|--------------------|----------------------------------------------|
| `parse_resume`      | Resume (plain text) → structured profile JSON |
| `write_cover_letter`| Generate cover letter from profile + job     |
| `apply_to_jobs`     | Visually apply to selected jobs              |
| *(Planned)*         | Follow-up email to recruiters                |

Agents are triggered via the UI or CLI (`claude-code prp agent_name`) and orchestrated with LangChain if needed.

---

## 📦 Folder Structure

├── .claude/ # Claude settings + optional local config
│ └── settings.local.json
├── agents/
│ └── parse_resume/
│ ├── prp.md
│ ├── INITIAL.md
│ └── examples/
│ └── ...
├── core/
│ ├── db/
│ │ └── models.py # SQLAlchemy models
│ ├── job_search/
│ │ └── fetch_jobs.py # Crawlfire + filtering logic
│ ├── job_application/
│ │ └── automation.py # Selenium application logic
│ └── profile/
│ ├── schema.py # Resume → profile schema
│ └── utils.py
├── commands/ # CLI tools to run agents or sync jobs
├── tests/ # Pytest unit tests
├── CLAUDE.md # Global memory for Claude agents
├── PLANNING.md # (This file) architecture + conventions
├── TASK.md # Task tracker + status
├── README.md # Project overview for GitHub
├── .env # Local secrets + API keys


---

## 🧩 Dev Conventions

| Category        | Convention                          |
|----------------|--------------------------------------|
| Imports         | Relative inside `core/` and `agents/` |
| Formatting      | Use `black`, PEP8, and type hints   |
| Validation      | Use `pydantic` where applicable     |
| Docstrings      | Google style                        |
| File size       | Keep files < 500 LOC                |
| Claude output   | Only raw JSON or plain text — no markdown, no comments |

---

## 🔁 Full User Flow

1. **User creates a profile**
   - Manually enters data or uploads resume
   - Resume → JSON via `parse_resume`

2. **Jobs synced from Crawlfire (daily)**
   - Stored in SQLite
   - Includes platform, link, location, description, etc.

3. **User searches jobs**
   - Filtered by title, location, work type, salary, etc.
   - Optional ranking via cosine similarity

4. **User selects jobs to apply**
   - Triggers `apply_to_jobs`
   - Agent fills application forms visually using Selenium
   - Can also call `write_cover_letter` if job requires one

5. **Track status**
   - Dashboard stores job + status + applied date

6. *(Planned)*: Auto-email follow-ups to recruiters

---

## ⚙️ Tech Stack

| Area                | Tool                        |
|---------------------|-----------------------------|
| LLMs                | Claude (prod), Ollama (dev) |
| Agent Orchestration | LangChain                   |
| DB                  | SQLite + SQLAlchemy         |
| Job Data            | Crawlfire API               |
| Browser Automation  | Selenium                    |
| Environment Config  | Python-dotenv               |
| Testing             | Pytest                      |

---

## 📌 Claude Agent Behavior Rules

- `CLAUDE.md` is loaded as **global memory**
- All agents must:
  - Output **strictly valid JSON or plain text**
  - Follow resume → profile schema exactly
  - Use empty strings, `null`, or `[]` as appropriate
  - Ask for clarification if required fields are missing
  - Never invent function names, paths, or packages

---

## ✅ Task Behavior

- All active tasks live in `TASK.md`
- Completed tasks must be marked immediately
- New subtasks discovered during dev go in “Discovered During Work”
- If any ambiguity arises, agent should request clarification

---

## 🛠️ Testing Guidelines

- Mirror `core/` and `agents/` in `tests/`
- Use `pytest` only
- Minimum of:
  - 1 success test
  - 1 edge case
  - 1 failure path
- Include CLI test if `commands/` contains custom logic

---

## 🔭 Future Features (Backlog)

- Postgres migration for multi-user scaling
- Automatic recruiter email generator
- Cover letter customization slider (tone, length)
- Job scoring engine with cosine similarity or semantic search
- CI pipeline to validate PRPs, schema integrity


