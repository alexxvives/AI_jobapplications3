# 🧠 PRP — parse_resume Agent

## 🎯 Purpose

Convert resume content (extracted from a PDF or Word document) into a structured JSON profile that follows the schema defined in `CLAUDE.md`.

This allows downstream agents to work with consistent, structured user data.

---

## 🛠 Input

Plain text extracted from a `.pdf` or `.docx` resume. No formatting will be preserved. The input may include sections like:

- Personal Info
- Work Experience
- Education
- Skills
- Languages
- Certifications
- Achievements

---

## 🧾 Output

A valid JSON object matching the `Resume → Profile Schema` in `CLAUDE.md`. All required keys must be present, even if fields are empty or null.

---

## 📌 Constraints

- Follow the schema exactly.
- If a section is missing, include an empty list or `null` for that section.
- Use `"\\n"` for bullet points in any `description` field.
- Format all dates as `"YYYY-MM"`.
- If a role is marked as “Present” or “Current,” set `"end_date": null`.
- Do not guess values. Leave fields empty or `null` if unsure.
- Output only JSON — no Markdown, no comments, no extra text.

---

## 💡 Example Use Case

A user uploads a resume as a PDF or Word document. After converting the file to plain text, this agent is called to convert the resume into structured profile data that can be stored in the database or used for downstream agents.
