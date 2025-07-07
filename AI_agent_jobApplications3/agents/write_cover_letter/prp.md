 # 📝 PRP: write_cover_letter

## 🎯 Purpose

Generate a professional, tailored cover letter for a specific job using the user’s profile and the job description.  
The output should be human-sounding, concise (250–350 words), and align with industry norms.

---

## 🧠 Context

The user has already provided a structured profile (parsed from a resume or entered manually), and has selected a job.  
This agent creates a customized cover letter for that specific job.

---

## 🔁 Input

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
  "job_description": "We are looking for a Python backend developer experienced in FastAPI, SQL, and Docker. The candidate should have at least 2 years of experience building scalable APIs in production."
}

## 📤 Output
Return only the cover letter text (no JSON, no markdown).
It must be addressed to the hiring manager or generic if unspecified.
It should be enthusiastic, honest, and aligned with both the job and the profile.
Assume the cover letter will be pasted into a web form — no HTML.

## 🛠️ Rules
Write in a professional yet approachable tone

Mention the company name only if it's included in the job description

Use the user’s full name at the end as a signature

Format into 3–5 short paragraphs (including an intro and closing)

Use specific experience, not generic filler

NEVER hallucinate details not present in the profile

If key info (like education or experience) is missing, skip that section

Avoid repeating the resume — emphasize motivation, fit, and value

## 📎 Example Output

Dear Hiring Manager,

I’m excited to apply for the Python Backend Developer position. With over three years of experience building scalable APIs using FastAPI, SQL, and Docker, I believe I can make an immediate impact on your engineering team.

In my current role at TechCorp Inc., I led the development of internal APIs that reduced data processing latency by 40%. I’m passionate about writing clean, maintainable code and collaborating across teams to ship production-ready systems.

Your job description stood out to me because of its emphasis on backend performance and containerization — both areas I’ve specialized in throughout my career.

Thank you for considering my application. I’d love the opportunity to bring my backend expertise to your team.

Sincerely,  
John Doe