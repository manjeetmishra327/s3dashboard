import os
from dotenv import load_dotenv

from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser

load_dotenv()

OPENAI_KEY = os.getenv("OPENAI_API_KEY")

print(f"[Resume Chain] Key check: {'✅' if OPENAI_KEY else '❌ NOT FOUND'}")

# ── IMPORTANT: All literal {{ }} in the JSON schema are ESCAPED ───────────────
# LangChain PromptTemplate treats single {var} as variables.
# To include literal braces in the prompt, use {{ and }} everywhere
# except the actual variable {resume_text}.

RESUME_PROMPT = """You are a world-class Senior Technical Recruiter and Career Coach with 15+ years of experience evaluating resumes across top tech companies (Google, Microsoft, Amazon, startups).

Your job is to perform a DEEP, HONEST, CRITICAL analysis of the resume below. Do NOT give inflated scores. Be brutally accurate.

Resume Text:
{resume_text}

Perform the following analysis steps in order:

STEP 1 — EXTRACT all information accurately.
STEP 2 — SCORE each section based on real industry benchmarks. A fresher with 2 projects should NOT score above 65. Only exceptional resumes score 85+.
STEP 3 — IDENTIFY specific, actionable improvement suggestions for each weak area.
STEP 4 — ANALYZE keyword gaps vs current job market demand for their target role.
STEP 5 — PROVIDE rewrite suggestions for weak sections.

Return ONLY a valid JSON object. No explanation outside the JSON. No markdown.

{{
  "name": "full name from resume",
  "email": "email address",
  "phone": "phone number",
  "linkedin": "linkedin URL or null",
  "github": "github URL or null",

  "summary": "2-3 sentence professional summary you would write for this person based on their resume",
  "experience_level": "fresher | junior | mid | senior",
  "total_experience_years": 0,
  "domain": "primary technical domain e.g. Full Stack, Backend, Data Science",
  "target_role": "most suitable job role based on their skills and experience",

  "skills": ["list of technical skills explicitly mentioned"],
  "tools": ["dev tools, IDEs, version control etc"],
  "languages": ["programming languages"],
  "frameworks": ["frameworks and libraries"],
  "databases": ["databases mentioned"],
  "cloud": ["cloud platforms and services"],

  "projects": [
    {{
      "name": "project name",
      "description": "what it does",
      "tech_stack": ["technologies used"],
      "impact": "measurable impact or outcome if mentioned, else null",
      "quality_score": 0
    }}
  ],

  "experience": [
    {{
      "company": "company name",
      "role": "job title",
      "duration": "duration string",
      "responsibilities": ["key responsibilities"],
      "achievements": ["quantified achievements if any"]
    }}
  ],

  "education": [
    {{
      "degree": "degree name",
      "institution": "institution name",
      "year": "graduation year",
      "score": "GPA or percentage if mentioned"
    }}
  ],

  "certifications": ["list of certifications with issuer"],
  "achievements": ["awards, hackathons, publications etc"],

  "strengths": [
    "specific strength with evidence from resume e.g. Strong React experience with 3 projects demonstrating component architecture"
  ],

  "improvement_areas": [
    "specific weakness e.g. No quantified achievements — all bullet points describe tasks not impact"
  ],

  "missing_keywords": [
    "important keywords missing for their target role that recruiters search for e.g. System Design, CI/CD, Docker"
  ],

  "section_rewrites": {{
    "summary": "improved summary they should use",
    "top_bullet_rewrite": "take their weakest experience bullet and rewrite it with impact e.g. Reduced API response time by 40% by implementing Redis caching"
  }},

  "ats_analysis": {{
    "ats_friendly": true,
    "issues": ["specific ATS issues e.g. Tables detected which break ATS parsers", "Missing action verbs in bullet points"],
    "keyword_density_score": 0
  }},

  "ai_profile_score": 0,

  "score_breakdown": {{
    "skills_score": 0,
    "projects_score": 0,
    "experience_score": 0,
    "education_score": 0,
    "completeness_score": 0,
    "impact_score": 0,
    "ats_score": 0
  }},

  "score_reasoning": {{
    "skills_reasoning": "why this score e.g. Lists 8 skills but no evidence of depth or projects using them",
    "projects_reasoning": "why this score",
    "experience_reasoning": "why this score",
    "education_reasoning": "why this score",
    "completeness_reasoning": "why this score",
    "impact_reasoning": "why this score e.g. Zero quantified achievements across all 4 experience entries",
    "ats_reasoning": "why this score"
  }},

  "overall_verdict": "2-3 sentence honest verdict a senior recruiter would give e.g. Solid foundation for a fresher but lacks quantified impact and depth in projects. Would not pass initial ATS screening for mid-level roles."
}}

SCORING GUIDE — follow strictly:
- ai_profile_score is weighted average: skills(20%) + projects(20%) + experience(20%) + education(10%) + completeness(10%) + impact(15%) + ats(5%)
- Fresher with 1-2 basic projects: 45-60
- Fresher with strong projects + internship: 60-72
- Junior with 1yr exp + good projects: 65-75
- Mid-level with 2-4yr exp + measurable impact: 72-85
- Senior with 5yr+ exp + leadership + impact: 82-95
- Perfect resume (rare): 95-100
- NEVER give 90+ unless the resume has quantified impact, strong projects, good experience AND good ATS optimization
"""


def get_resume_chain():
    if not OPENAI_KEY:
        raise ValueError("OPENAI_API_KEY not found. Please set it in .env")

    llm = ChatOpenAI(
        model="gpt-4o",
        temperature=0,
        api_key=OPENAI_KEY
    )

    chain = (
        PromptTemplate.from_template(RESUME_PROMPT)
        | llm
        | JsonOutputParser()
    )

    return chain