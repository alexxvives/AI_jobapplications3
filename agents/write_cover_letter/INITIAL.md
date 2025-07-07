 # 🧪 INITIAL.md — write_cover_letter

## 🎯 Objective

This agent generates a personalized cover letter based on:

- A structured user profile (JSON, from resume or manual input)
- A plain text job description

Its goal is to make cover letters effortless for users, increasing their chances of landing interviews without manually writing a new letter every time.

---

## 🧠 Agent Role Summary

- Input: `profile` (JSON) and `job_description` (text)
- Output: human-readable, plain text cover letter
- Style: professional but not robotic
- Length: ~250–350 words, 3–5 short paragraphs

---

## ⚠️ Known Gotchas

- Do not assume details not in profile (e.g., company name, years of experience)
- Don’t just reword the resume — instead, emphasize motivation and fit
- Output must be **text-only** — no markdown, JSON, or extra notes
- Skip any section if input lacks data (e.g., education)
- Must handle incomplete or sparse profiles gracefully

---

## 📌 Examples Folder

Should include:

- `profile.json` → full structured user info
- `job_description.txt` → raw job listing text
- `generated_cover_letter.txt` → expected result (example)

---

## 🤖 Assistant Prompt Tips

- Highlight skills and experience that directly match the job
- Mention the user’s excitement for the role/company
- Close confidently (not overly eager)

---

## 🧱 Possible Future Enhancements

- Add support for tone customization (formal, casual, enthusiastic)
- Include optional company name injection
- Include analytics to measure effectiveness of cover letters
