import os
import json
from openai import OpenAI
from database.mongo import get_ai_profile, get_jobs

openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


async def run_skill_gap_agent(user_id: str):
    print(f"[Skill Gap Agent] Starting for user: {user_id}")

    # Step 1 — Load student profile
    profile_doc = await get_ai_profile(user_id)
    if not profile_doc:
        return {"success": False, "error": "No profile found. Upload resume first."}

    ai_profile = profile_doc.get("profile", {})
    student_skills = ai_profile.get("skills", [])

    if not student_skills:
        return {"success": False, "error": "No skills found in profile."}

    print(f"[Skill Gap Agent] Student skills: {student_skills}")

    # Step 2 — Load matched jobs and extract required skills
    jobs = await get_jobs(user_id)
    if not jobs:
        return {"success": False, "error": "No jobs found. Run job scraper first."}

    # Take top 5 jobs by similarity_score if available, else just first 5
    top_jobs = sorted(jobs, key=lambda x: x.get("similarity_score", 0), reverse=True)[:5]

    job_skills = []
    job_titles = []
    for job in top_jobs:
        job_titles.append(job.get("title", ""))
        skills = job.get("skills_required", [])
        job_skills.extend(skills)

    # Deduplicate
    job_skills = list(set(job_skills))
    print(f"[Skill Gap Agent] Job skills collected: {len(job_skills)}")

    # Step 3 — Run GPT-4o skill gap analysis
    result = analyze_skill_gap(
        student_skills=student_skills,
        job_skills=job_skills,
        job_titles=job_titles,
        ai_profile=ai_profile
    )

    print(f"[Skill Gap Agent] Done. Missing skills: {len(result.get('skill_gaps', []))}")
    return {"success": True, "data": result}


def analyze_skill_gap(student_skills, job_skills, job_titles, ai_profile):
    prompt = f"""
You are an expert career coach and technical skill advisor.

Student Profile:
- Name: {ai_profile.get("name", "Student")}
- Domain: {ai_profile.get("domain", "")}
- Target Role: {ai_profile.get("target_role", "")}
- Experience Level: {ai_profile.get("experience_level", "Fresher")}
- Current Skills: {", ".join(student_skills)}

Top Matched Job Titles:
{", ".join(job_titles)}

Skills Required Across These Jobs:
{", ".join(job_skills)}

Your Task:
1. Compare student's current skills with job requirements
2. Identify missing/weak skills that matter most
3. For each missing skill provide:
   - priority (1 = most urgent)
   - reason why it's important
   - 2 specific course recommendations with platform and URL
   - estimated_days to learn it

Return ONLY a valid JSON object. No markdown, no backticks.

Format:
{{
  "student_name": "...",
  "target_role": "...",
  "current_skills": [...],
  "strong_skills": [...],
  "skill_gaps": [
    {{
      "skill": "Docker",
      "priority": 1,
      "reason": "Required in most matched jobs for containerization",
      "resources": [
        {{
          "title": "Docker for Beginners",
          "platform": "FreeCodeCamp",
          "url": "https://www.youtube.com/watch?v=fqMOX6JJhGo"
        }},
        {{
          "title": "Docker & Kubernetes: The Complete Guide",
          "platform": "Udemy",
          "url": "https://www.udemy.com/course/docker-and-kubernetes-the-complete-guide/"
        }}
      ],
      "estimated_days": 14
    }}
  ],
  "total_estimated_days": 90,
  "summary": "2-3 sentence motivating summary of what to focus on"
}}
"""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a JSON-only response bot. Never use markdown or backticks."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )

        raw = response.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        result = json.loads(raw)
        print("[Skill Gap Agent] GPT-4o response parsed successfully")
        return result

    except Exception as e:
        print(f"[Skill Gap Agent] GPT-4o error: {e}")
        return {
            "student_name": ai_profile.get("name", "Student"),
            "target_role": ai_profile.get("target_role", ""),
            "current_skills": student_skills,
            "strong_skills": [],
            "skill_gaps": [],
            "total_estimated_days": 0,
            "summary": "Could not analyze skill gap. Please try again.",
            "error": str(e)
        }