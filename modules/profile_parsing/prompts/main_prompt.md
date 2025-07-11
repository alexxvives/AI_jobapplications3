# 🧠 PRP — parse_resume Agent

## 🎯 Purpose

Convert resume content (extracted from a PDF or Word document) into a structured JSON profile that follows the schema defined in `CLAUDE.md`.

This allows downstream agents to work with consistent, structured user data.

---

## 🛠 Input

**Format:** Plain text string extracted from a `.pdf` or `.docx` resume. No formatting will be preserved.

**Content:** The input may include sections like:
- Personal Info (name, contact, address)
- Work Experience (title, company, dates, descriptions)
- Education (degree, school, dates, GPA)
- Skills (technical and soft skills)
- Languages (spoken languages)
- Certifications (name, issuer, dates)
- Achievements (awards, honors)
- Social Media Links (LinkedIn, GitHub, portfolio, etc.)

**Edge Cases:**
- OCR errors or malformed text
- Missing sections or incomplete data
- Non-standard date formats
- International resumes (non-US format)
- Social media links in various formats

---

## 🧾 Output

A valid JSON object matching the `Resume → Profile Schema` in `CLAUDE.md`. All required keys must be present, even if fields are empty or null.

**Validation Requirements:**
- Must be valid JSON (no syntax errors)
- All schema keys must be present
- Date formats must be "YYYY-MM" or null
- Arrays must be arrays, objects must be objects
- No extra keys outside the schema
- Social media links should be normalized URLs

**Database Compatibility:**
- Output will be used to populate normalized database tables
- Personal information fields map to `user_profiles` table
- Work experience maps to `work_experience` table
- Education maps to `education` table
- Skills map to `skills` table
- Languages map to `languages` table
- Achievements map to `achievements` table
- Certificates map to `certificates` table

---

## 📌 Constraints

- Follow the schema exactly.
- If a section is missing, include an empty list or `null` for that section.
- Use `"\\n"` for bullet points in any `description` field.
- Format all dates as `"YYYY-MM"`.
- If a role is marked as "Present" or "Current," set `"end_date": null`.
- Do not guess values. Leave fields empty or `null` if unsure.
- Output only JSON — no Markdown, no comments, no extra text.
- Handle OCR errors gracefully (best guess for obvious typos).
- Normalize phone numbers to consistent format.
- Extract email addresses even if malformed.
- Extract and normalize social media links.

---

## 🔗 Social Media Extraction

**Look for these patterns in the resume:**
- **LinkedIn**: "linkedin.com/in/", "LinkedIn:", "linkedin.com/company/"
- **GitHub**: "github.com/", "GitHub:", "github.io/"
- **Portfolio**: "portfolio", "website", "personal site", custom domains
- **Twitter**: "twitter.com/", "Twitter:", "@username"
- **Other URLs**: Personal websites, blogs, etc.

**Normalization Rules:**
- Ensure URLs start with "https://" or "http://"
- Remove trailing slashes
- Validate basic URL format
- Store in `job_preferences` section of schema

---

## ⚠️ Error Handling

**Missing Data:**
- If personal info is incomplete, extract what's available
- If work experience lacks dates, use null for missing dates
- If education is missing, return empty array
- If skills are listed as text, parse into individual skills
- If social media links are missing, leave as null

**Malformed Input:**
- Handle broken line breaks and formatting
- Correct obvious OCR errors (e.g., "0" vs "o")
- Parse dates in various formats (MM/YYYY, YYYY, etc.)
- Extract contact info even if poorly formatted
- Extract social media links even if malformed

**Validation Failures:**
- If JSON output is invalid, return error message
- If required fields are missing, include them as null
- If date parsing fails, use null for problematic dates
- If social media URL parsing fails, leave as null

---

## 💡 Example Use Case

A user uploads a resume as a PDF or Word document. After converting the file to plain text, this agent is called to convert the resume into structured profile data that can be stored in the database or used for downstream agents.

---

## 🧪 Test Cases

**Input:** "John Doe\nSoftware Engineer at TechCorp\n2020-Present\nLinkedIn: linkedin.com/in/johndoe"
**Expected:** Valid JSON with work_experience array and job_preferences.linkedin populated

**Input:** "Skills: Python, Java, SQL\nGitHub: github.com/johndoe"
**Expected:** skills array with three entries and job_preferences.github populated

**Input:** "Education: BS Computer Science, University of Illinois, 2018\nPortfolio: johndoe.dev"
**Expected:** education array with one entry and job_preferences.portfolio populated

**Input:** "John Doe\nEmail: john@example.com\nLinkedIn: john-doe"
**Expected:** personal_information.email populated and job_preferences.linkedin as "https://linkedin.com/in/john-doe"
