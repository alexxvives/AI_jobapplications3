# ✅ TASK.md — Project Tasks & Progress

This file tracks the current development plan. All Claude agents and devs should check this file before starting work.

---

## 🟢 Phase 1 — Core Setup

- [x] Set up project structure and folders
- [x] Define resume → profile schema
- [x] Write global memory in `CLAUDE.md`
- [x] Set up planning file (`PLANNING.md`)
- [x] Configure LangChain + Claude CLI locally
- [x] Create SQLite models in `core/db/models.py`

---

## 🟡 Phase 2 — Agents & Logic

- [ ] `parse_resume` agent: Extract JSON profile from plain-text resume
- [ ] `write_cover_letter` agent: Use profile + job to generate letter
- [ ] `apply_to_jobs` agent: Fill job forms visually using Selenium
- [ ] Add agent examples in each `/examples/` folder
- [ ] Add `schema.py` and validators in `core/profile/`

---

## 🟡 Phase 3 — Job Search & Ranking

- [ ] `fetch_jobs.py`: Pull jobs from Crawlfire daily
- [ ] Store jobs in SQLite (`jobs` table)
- [ ] Implement search filters: title, location, salary, etc.
- [ ] Add optional ranking by cosine similarity to profile

---

## 🔜 Phase 4 — UI & Dashboard

- [ ] Build user dashboard: show job status, history
- [ ] Connect profile forms (manual + upload)
- [ ] Let user choose profile + jobs to apply
- [ ] Show real-time Selenium form filling
- [ ] Let user choose between auto or manual submission

---

## 🔮 Phase 5 — Advanced Features

- [ ] Auto-send follow-up emails to recruiters
- [ ] Cover letter customization (tone, length, etc.)
- [ ] Switch to Postgres for multi-user support
- [ ] CI pipeline for validating agents and schema
- [ ] Claude fine-tuning for better output consistency

---

## 🧠 Discovered During Work

- [ ] Add `CLAUDE.md` project behavior rules section
- [ ] Store job descriptions as plain text (1 column)
- [ ] Profiles may contain multiple entries per user
- [ ] Link resume parser directly to DB profile builder

---

## 🗂️ Completed Tasks

- [x] Claude runs locally via CLI (Ollama / dev mode)
- [x] GitHub repo initialized and SSH key added
- [x] Project memory file written
- [x] Planning strategy aligned between agent and human flows
