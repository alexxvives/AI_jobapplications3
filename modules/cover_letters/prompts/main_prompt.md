# 📝 PRP: write_cover_letter

## 🎯 Purpose

Generate a professional, tailored cover letter for a specific job using the user's profile and the job description.  
The output should be human-sounding, concise (250–350 words), and align with industry norms.

---

## 🧠 Context

The user has already provided a structured profile (parsed from a resume or entered manually), and has selected a job.  
This agent creates a customized cover letter for that specific job.

---

## 🔁 Input

**Format:** JSON object with three required fields:
```json
{
  "profile": {
    "full_name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "(555) 123-4567",
    "skills": ["Python", "SQL", "Docker", "FastAPI"],
    "work_experience": [
      {
        "title": "Software Engineer",
        "company": "TechCorp Inc.",
        "start_date": "2020-01",
        "end_date": null,
        "description": "Built backend tools with FastAPI"
      }
    ],
    "education": [
      {
        "degree": "B.S. in Computer Science",
        "school": "University of Illinois"
      }
    ]
  },
  "job_data": {
    "title": "Senior Software Engineer",
    "company": "TechCorp Inc.",
    "description": "We are looking for a Python backend developer experienced in FastAPI, SQL, and Docker. The candidate should have at least 2 years of experience building scalable APIs in production."
  },
  "tone": "formal"
}
```

**Validation Requirements:**
- Profile must contain at least `full_name`
- Job data must include `title` and `company`
- Job description must be non-empty string
- Tone must be either "formal" or "enthusiastic"
- All profile fields are optional except `full_name`

---

## 📤 Output

Return only the cover letter text (no JSON, no markdown).
It must be addressed to the hiring manager or generic if unspecified.
It should be enthusiastic, honest, and aligned with both the job and the profile.
Assume the cover letter will be pasted into a web form — no HTML.

**Length Requirements:**
- Minimum: 200 words
- Maximum: 400 words
- Target: 250-350 words
- 3-5 paragraphs (including intro and closing)

---

## 🛠️ Rules

**Tone Guidelines:**
- **Formal**: Professional, measured, business-like language
- **Enthusiastic**: Energetic, passionate, but still professional
- Avoid robotic or overly casual language in both tones
- Maintain industry-appropriate formality

**Content Rules:**
- Write in a professional yet approachable tone
- Use job title and company name from `job_data`
- Use the user's full name at the end as a signature
- Format into 3–5 short paragraphs (including an intro and closing)
- Use specific experience, not generic filler
- NEVER hallucinate details not present in the profile
- If key info (like education or experience) is missing, skip that section
- Avoid repeating the resume — emphasize motivation, fit, and value

**Structure Requirements:**
- Opening paragraph: Express interest and mention specific role/company
- Body paragraphs: Connect experience to job requirements
- Closing paragraph: Thank and express enthusiasm for next steps
- Signature: Use profile full_name

---

## ⚠️ Error Handling

**Missing Profile Data:**
- If no work experience, focus on education and skills
- If no education, focus on work experience and skills
- If no skills, focus on work experience and achievements
- If only name is available, create generic but professional letter

**Invalid Input:**
- If profile is missing required fields, return error message
- If job data is missing title or company, return error message
- If job description is empty, return error message
- If profile is completely empty, return error message
- If tone is invalid, default to "formal"

**Length Violations:**
- If output exceeds 400 words, truncate appropriately
- If output is under 200 words, expand with relevant details
- Ensure proper paragraph structure regardless of length

---

## 📎 Example Output

**Formal Tone:**
Dear Hiring Manager,

I am writing to express my interest in the Senior Software Engineer position at TechCorp Inc. With over three years of experience building scalable APIs using FastAPI, SQL, and Docker, I believe I can make an immediate impact on your engineering team.

In my current role at TechCorp Inc., I led the development of internal APIs that reduced data processing latency by 40%. I am passionate about writing clean, maintainable code and collaborating across teams to ship production-ready systems.

Your job description stood out to me because of its emphasis on backend performance and containerization — both areas I have specialized in throughout my career.

Thank you for considering my application. I would welcome the opportunity to bring my backend expertise to your team.

Sincerely,  
John Doe

**Enthusiastic Tone:**
Dear Hiring Manager,

I'm thrilled to apply for the Senior Software Engineer position at TechCorp Inc.! With over three years of experience building scalable APIs using FastAPI, SQL, and Docker, I'm confident I can make an immediate impact on your engineering team.

In my current role at TechCorp Inc., I led the development of internal APIs that reduced data processing latency by 40%. I'm passionate about writing clean, maintainable code and collaborating across teams to ship production-ready systems.

Your job description really resonated with me because of its emphasis on backend performance and containerization — these are exactly the areas I've been specializing in throughout my career!

Thank you for considering my application. I'd love the opportunity to bring my backend expertise to your team.

Sincerely,  
John Doe

---

## 🧪 Test Cases

**Input:** Profile with only name and basic skills, formal tone
**Expected:** Professional letter focusing on available information

**Input:** Profile with extensive experience but no education, enthusiastic tone
**Expected:** Energetic letter emphasizing work experience and achievements

**Input:** Very short job description
**Expected:** Letter that doesn't over-rely on specific job details