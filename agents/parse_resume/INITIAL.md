# 🧪 INITIAL.md — parse_resume Agent

## 🧠 Purpose

This agent transforms a plain-text resume (extracted from PDF or Word) into a structured JSON profile. The resulting format must follow the schema defined in `CLAUDE.md`, and is used throughout the platform to match jobs, write cover letters, and fill application forms.

---

## 🧩 Responsibilities

- Extract all relevant data sections: personal info, work experience, education, skills, languages, preferences, certificates, achievements.
- Ensure consistency and completeness even if some sections are missing.
- Return valid JSON that can be directly inserted into the user profile database.

---

## 📥 Input Considerations

- The raw input is plain text — not structured or formatted.
- Sections may appear in any order or may be incomplete.
- Bullet points should be preserved as `\\n` in output.
- The resume may include keywords like:
  - “Professional Experience”, “Work History”, “Employment”
  - “Education”, “Degrees”
  - “Skills”, “Certifications”, “Achievements”

---

## 📤 Output Schema

The output must match the canonical resume→profile JSON defined in `CLAUDE.md`.

- Every key must be present.
- Return `null` or empty arrays if information is missing.
- Normalize dates to `"YYYY-MM"` or `null`.

---

## ⚠️ Common Gotchas

- Don’t infer missing data (e.g., gender or city).
- Dates like “2022 – Present” must be handled as `"end_date": null`.
- Bullet lists should stay multiline, encoded as `\\n`.
- Input text may contain OCR errors, broken lines, or malformed headers — the model must be robust.

---

## 🛠 Used By

- `write_cover_letter` → Needs job-relevant info (skills, experience)
- `apply_to_jobs` → Uses personal info + experience to fill forms
- User dashboard → Profile building and editing

---

## 🧪 Test Scenarios (see examples folder)

1. Clean resume with all sections
2. Resume missing education
3. Resume with "Present" as end date
4. Resume with no bullet points
5. International resume (non-US date format, non-English names)
