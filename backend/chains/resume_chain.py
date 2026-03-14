from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from dotenv import load_dotenv

load_dotenv()

llm = ChatOpenAI(model="gpt-4o", temperature=0)

RESUME_PROMPT = """
You are a world-class resume parser and career analyst.
Extract ALL information from the resume text below.
Be extremely thorough — do not miss any skill, tool, or detail.

Resume Text:
{resume_text}

Return ONLY a valid JSON object — no markdown, no backticks, no extra text.
Use this exact structure:

{{
  "name": "string",
  "email": "string",
  "phone": "string",
  "linkedin": "string or null",
  "github": "string or null",
  "summary": "2-3 sentence professional summary",
  "experience_level": "fresher | junior | mid | senior",
  "total_experience_years": number,
  "domain": "primary domain eg: fullstack | AI/ML | backend | frontend | devops | data science",
  "target_role": "most suitable role based on resume",
  "skills": ["every technical skill mentioned"],
  "tools": ["every tool mentioned eg: Git, Docker, Postman"],
  "languages": ["programming languages only"],
  "frameworks": ["all frameworks eg: React, FastAPI, Spring"],
  "databases": ["all databases eg: MongoDB, PostgreSQL"],
  "cloud": ["cloud platforms eg: AWS, GCP, Azure"],
  "projects": [
    {{
      "name": "project name",
      "description": "what it does",
      "tech_stack": ["tech1", "tech2"],
      "github_url": "string or null",
      "live_url": "string or null",
      "impact": "what this project achieved or demonstrated"
    }}
  ],
  "experience": [
    {{
      "company": "company name",
      "role": "job title",
      "duration": "eg: Jan 2023 - Dec 2023",
      "responsibilities": ["what they did"],
      "technologies_used": ["tech used in this role"]
    }}
  ],
  "education": [
    {{
      "degree": "eg: B.Tech Computer Science",
      "institution": "college/university name",
      "year": "graduation year",
      "cgpa": "string or null"
    }}
  ],
  "certifications": ["list all certifications"],
  "achievements": ["academic or professional achievements"],
  "strengths": ["top 3-5 professional strengths"],
  "improvement_areas": ["top 3 areas to improve for better jobs"],
  "ai_profile_score": number,
  "score_breakdown": {{
    "skills_score": number,
    "projects_score": number,
    "experience_score": number,
    "education_score": number,
    "completeness_score": number
  }}
}}

Scoring rules for ai_profile_score (0-100):
- Skills listed (10+ skills)     → 20 points
- Projects with descriptions     → 25 points
- Work experience present        → 20 points
- Education complete             → 15 points
- GitHub/LinkedIn links          → 10 points
- Certifications present         → 10 points

Rules:
- Extract EVERY skill mentioned anywhere in the resume
- If data missing use null for strings, [] for arrays, 0 for numbers
- experience_level: 0 yrs=fresher, 1-2=junior, 3-5=mid, 5+=senior
- Be specific and thorough in all descriptions
"""

resume_chain = PromptTemplate.from_template(RESUME_PROMPT) | llm | JsonOutputParser()
