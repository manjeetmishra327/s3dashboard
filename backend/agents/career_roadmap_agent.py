import os
import json
import httpx
from openai import AsyncOpenAI
from database.mongo import get_db
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
client      = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
JSEARCH_KEY = os.getenv("JSEARCH_API_KEY")

# ─── Verified Resource Map (zero hallucinated URLs) ───────────────────────────
RESOURCES = {
    "javascript":    {"name": "JavaScript.info",            "url": "https://javascript.info"},
    "typescript":    {"name": "TypeScript Handbook",        "url": "https://www.typescriptlang.org/docs/handbook/intro.html"},
    "react":         {"name": "React Official Docs",        "url": "https://react.dev/learn"},
    "nextjs":        {"name": "Next.js Docs",               "url": "https://nextjs.org/docs"},
    "vue":           {"name": "Vue.js Guide",               "url": "https://vuejs.org/guide/introduction.html"},
    "angular":       {"name": "Angular Docs",               "url": "https://angular.io/docs"},
    "css":           {"name": "CSS – MDN Web Docs",         "url": "https://developer.mozilla.org/en-US/docs/Web/CSS"},
    "tailwind":      {"name": "Tailwind CSS Docs",          "url": "https://tailwindcss.com/docs"},
    "python":        {"name": "Python Official Tutorial",   "url": "https://docs.python.org/3/tutorial/"},
    "fastapi":       {"name": "FastAPI Docs",               "url": "https://fastapi.tiangolo.com/tutorial/"},
    "django":        {"name": "Django Tutorial",            "url": "https://docs.djangoproject.com/en/stable/intro/tutorial01/"},
    "flask":         {"name": "Flask Docs",                 "url": "https://flask.palletsprojects.com/quickstart/"},
    "nodejs":        {"name": "Node.js Guides",             "url": "https://nodejs.org/en/docs/guides"},
    "express":       {"name": "Express.js Guide",           "url": "https://expressjs.com/en/guide/routing.html"},
    "mongodb":       {"name": "MongoDB University",         "url": "https://learn.mongodb.com"},
    "postgresql":    {"name": "PostgreSQL Tutorial",        "url": "https://www.postgresqltutorial.com"},
    "sql":           {"name": "SQLZoo",                     "url": "https://sqlzoo.net/wiki/SQL_Tutorial"},
    "redis":         {"name": "Redis University",           "url": "https://university.redis.com"},
    "docker":        {"name": "Docker Get Started",         "url": "https://docs.docker.com/get-started/"},
    "kubernetes":    {"name": "Kubernetes Basics",          "url": "https://kubernetes.io/docs/tutorials/kubernetes-basics/"},
    "aws":           {"name": "AWS Getting Started",        "url": "https://aws.amazon.com/getting-started/"},
    "gcp":           {"name": "Google Cloud Skills Boost",  "url": "https://cloudskillsboost.google"},
    "git":           {"name": "Pro Git Book (Free)",        "url": "https://git-scm.com/book/en/v2"},
    "cicd":          {"name": "GitHub Actions Docs",        "url": "https://docs.github.com/en/actions"},
    "dsa":           {"name": "NeetCode Roadmap",           "url": "https://neetcode.io/roadmap"},
    "system_design": {"name": "System Design Primer",       "url": "https://github.com/donnemartin/system-design-primer"},
    "ml":            {"name": "fast.ai Practical ML",       "url": "https://course.fast.ai"},
    "langchain":     {"name": "LangChain Docs",             "url": "https://python.langchain.com/docs/get_started/introduction"},
    "openai_api":    {"name": "OpenAI Cookbook",            "url": "https://cookbook.openai.com"},
    "interview":     {"name": "LeetCode Study Plans",       "url": "https://leetcode.com/study-plan/"},
    "linkedin":      {"name": "LinkedIn Profile Tips",      "url": "https://www.linkedin.com/help/linkedin/answer/15493"},
    "networking":    {"name": "LinkedIn",                   "url": "https://www.linkedin.com"},
    "project":       {"name": "GitHub",                     "url": "https://github.com"},
    "practice":      {"name": "freeCodeCamp",               "url": "https://www.freecodecamp.org"},
    "default":       {"name": "freeCodeCamp",               "url": "https://www.freecodecamp.org"},
}

def get_resource(key: str) -> dict:
    k = key.lower().strip().replace(" ", "_").replace(".", "").replace("-", "_")
    return RESOURCES.get(k, RESOURCES["default"])


# ─── Step 1: Fetch real market demand via JSearch ────────────────────────────
async def fetch_market_skills(target_role: str) -> dict:
    """
    Hits JSearch API to find top 20 real job postings for target role.
    Counts keyword frequency to rank skills by actual market demand.
    Returns: { "skill": demand_score (0-100), ... }
    """
    if not JSEARCH_KEY:
        return {}

    skill_keywords = [
        "python","javascript","typescript","react","nextjs","node","express","fastapi",
        "django","flask","mongodb","postgresql","mysql","redis","docker","kubernetes",
        "aws","gcp","azure","git","graphql","rest api","microservices","system design",
        "machine learning","langchain","openai","tailwind","vue","angular"
    ]

    try:
        async with httpx.AsyncClient(timeout=10) as http:
            resp = await http.get(
                "https://jsearch.p.rapidapi.com/search",
                params={"query": target_role, "num_pages": "2", "date_posted": "month"},
                headers={
                    "X-RapidAPI-Key":  JSEARCH_KEY,
                    "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
                }
            )
        if resp.status_code != 200:
            return {}

        jobs = resp.json().get("data", [])
        if not jobs:
            return {}

        # Count skill mentions across all job descriptions
        combined_text = " ".join([
            (j.get("job_description", "") + " " + j.get("job_title", "")).lower()
            for j in jobs[:20]
        ])

        counts = {}
        for skill in skill_keywords:
            counts[skill] = combined_text.count(skill.lower())

        if not counts or max(counts.values()) == 0:
            return {}

        max_count = max(counts.values())
        demand = {
            skill: round((count / max_count) * 100)
            for skill, count in counts.items()
            if count > 0
        }
        return dict(sorted(demand.items(), key=lambda x: -x[1])[:15])

    except Exception:
        return {}


# ─── Step 2: Load full user context from MongoDB ──────────────────────────────
async def load_user_context(user_id: str) -> dict:
    db = await get_db()

    profile   = await db.ai_profiles.find_one({"user_id": user_id}) or {}
    skill_gap = await db.skill_gap_results.find_one({"user_id": user_id}) or {}

    gaps = []
    if skill_gap.get("gaps"):
        gaps = [g.get("skill", "") for g in skill_gap["gaps"][:8] if g.get("skill")]
    elif profile.get("missing_keywords"):
        gaps = profile["missing_keywords"][:8]

    return {
        "name":             profile.get("name", "User"),
        "target_role":      profile.get("target_role") or skill_gap.get("target_role", "Software Engineer"),
        "experience_level": profile.get("experience_level", "junior"),
        "experience_years": profile.get("total_experience_years", 0),
        "current_skills":   profile.get("skills", [])[:20],
        "skill_gaps":       gaps,
        "resume_score":     profile.get("ai_profile_score", 0),
        "strengths":        profile.get("strengths", [])[:3],
    }


# ─── Step 3: Generate roadmap with GPT-4o ─────────────────────────────────────
ROADMAP_SYSTEM = """You are a world-class career coach who creates precise, 
personalized 3-month tech career roadmaps. You understand skill dependencies 
(learn JavaScript before React), realistic time estimates, and what hiring 
managers actually look for. Your roadmaps are specific, actionable, and sequenced 
perfectly — not generic advice."""

ROADMAP_PROMPT = """Create a highly personalized 3-month career roadmap.

PERSON'S PROFILE:
- Name: {name}
- Target Role: {target_role}  
- Experience Level: {experience_level} ({experience_years} years)
- Current Skills: {current_skills}
- Critical Skill Gaps: {skill_gaps}
- Resume Score: {resume_score}/100

REAL MARKET DEMAND (from live job postings for {target_role}):
{market_demand}

ROADMAP PHILOSOPHY:
- Month 1 "Foundation": Fill the most critical gaps. Build confidence. Learn by doing small exercises.
- Month 2 "Building": Apply skills in 1-2 real portfolio projects. Make GitHub active.
- Month 3 "Launch": DSA/interview prep, polish resume, apply aggressively, network.
- Week focus should be hyper-specific (not "learn React" → "Build a React todo app with hooks and local storage")
- Task titles must be actionable ("Complete TypeScript exercises 1-20 on TS Playground" not "Learn TypeScript")
- Prioritize skills with highest market demand score above
- Respect prerequisites: JavaScript before React, Python before FastAPI, etc.

For resource_key, use ONLY these exact strings: javascript, typescript, react, nextjs, vue, 
angular, css, tailwind, python, fastapi, django, flask, nodejs, express, mongodb, postgresql, 
sql, redis, docker, kubernetes, aws, gcp, git, cicd, dsa, system_design, ml, langchain, 
openai_api, interview, linkedin, networking, project, practice

Return ONLY valid JSON (no markdown):
{{
  "target_role": "{target_role}",
  "experience_level": "{experience_level}",
  "total_tasks": 0,
  "months": [
    {{
      "month": 1,
      "title": "Foundation",
      "theme": "one punchy motivating line e.g. Close the gaps, build the base",
      "color": "#6366f1",
      "milestone_title": "short achievement name e.g. Core Skills Locked In",
      "milestone_description": "What they'll have built/learned after completing this month",
      "weeks": [
        {{
          "week": 1,
          "focus": "specific topic e.g. TypeScript + Modern JavaScript Patterns",
          "tasks": [
            {{
              "id": "m1w1t1",
              "title": "specific actionable task title (not vague)",
              "description": "exactly what to do, what to build or study, and why it matters for {target_role}",
              "category": "learn",
              "estimated_hours": 4,
              "resource_key": "typescript",
              "market_priority": "high"
            }}
          ]
        }},
        {{ "week": 2, "focus": "...", "tasks": [...] }},
        {{ "week": 3, "focus": "...", "tasks": [...] }},
        {{ "week": 4, "focus": "...", "tasks": [...] }}
      ]
    }},
    {{
      "month": 2,
      "title": "Building",
      "theme": "...",
      "color": "#0ea5e9",
      "milestone_title": "...",
      "milestone_description": "...",
      "weeks": [ 4 weeks with 4-5 tasks each ]
    }},
    {{
      "month": 3,
      "title": "Launch",
      "theme": "...",
      "color": "#10b981",
      "milestone_title": "...",
      "milestone_description": "...",
      "weeks": [ 4 weeks with 4-5 tasks each ]
    }}
  ],
  "success_metrics": [
    "specific measurable outcome after 3 months e.g. 2 deployed projects on GitHub",
    "metric 2",
    "metric 3"
  ],
  "weekly_commitment_hours": 15
}}"""


# ─── Step 4: AI Coach (context-aware per task) ────────────────────────────────
COACH_SYSTEM = """You are an expert technical career coach. You give highly specific, 
actionable guidance for exactly what the person is asking about. You know their background 
and give personalized advice — not generic tips."""

async def run_ai_coach(
    task_title: str,
    task_description: str,
    user_question: str,
    target_role: str,
    current_skills: list,
    experience_level: str,
) -> dict:
    """
    AI Coach: context-aware assistant for any roadmap task.
    Answers user questions about a specific task with full context.
    """
    try:
        prompt = f"""Person is working on this career roadmap task:

TASK: {task_title}
TASK DESCRIPTION: {task_description}
TARGET ROLE: {target_role}
THEIR EXPERIENCE: {experience_level}
THEIR CURRENT SKILLS: {', '.join(current_skills[:10])}

THEIR QUESTION: {user_question}

Give a specific, actionable answer (3-5 sentences max). 
If they're asking what to build, give an exact project idea.
If they're stuck, give step-by-step guidance.
If they want more context, explain why this task matters for {target_role}.
Be direct, practical, encouraging."""

        response = await client.chat.completions.create(
            model="gpt-4o",
            temperature=0.5,
            messages=[
                {"role": "system", "content": COACH_SYSTEM},
                {"role": "user",   "content": prompt}
            ],
            max_tokens=400
        )
        return {
            "success": True,
            "answer": response.choices[0].message.content.strip()
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


# ─── Main Agent ────────────────────────────────────────────────────────────────
async def run_career_roadmap_agent(user_id: str) -> dict:
    """
    Career Roadmap Agent:
    1. Load user profile + skill gaps from MongoDB
    2. Fetch real market demand from JSearch
    3. Generate personalized roadmap with GPT-4o
    4. Inject verified resource URLs
    5. Save to MongoDB & return
    """
    try:
        # 1. Load user context
        ctx = await load_user_context(user_id)
        if not ctx["target_role"]:
            return {"success": False, "error": "No target role found. Please complete your profile first."}

        # 2. Real market demand
        market_demand = await fetch_market_skills(ctx["target_role"])
        market_str = (
            "\n".join([f"  - {skill}: {score}% demand" for skill, score in list(market_demand.items())[:10]])
            if market_demand else "  (Market data unavailable — using profile-based priorities)"
        )

        # 3. Generate roadmap
        prompt = ROADMAP_PROMPT.format(
            name=ctx["name"],
            target_role=ctx["target_role"],
            experience_level=ctx["experience_level"],
            experience_years=ctx["experience_years"],
            current_skills=", ".join(ctx["current_skills"]) or "Not specified",
            skill_gaps=", ".join(ctx["skill_gaps"]) or "None identified",
            resume_score=ctx["resume_score"],
            market_demand=market_str,
        )

        response = await client.chat.completions.create(
            model="gpt-4o",
            temperature=0.3,
            messages=[
                {"role": "system", "content": ROADMAP_SYSTEM},
                {"role": "user",   "content": prompt}
            ],
            response_format={"type": "json_object"},
            max_tokens=4000
        )

        roadmap = json.loads(response.choices[0].message.content)

        # 4. Inject verified resource URLs + completion state
        total_tasks = 0
        for month in roadmap.get("months", []):
            for week in month.get("weeks", []):
                for task in week.get("tasks", []):
                    res = get_resource(task.get("resource_key", "default"))
                    task["resource_name"] = res["name"]
                    task["resource_url"]  = res["url"]
                    task["completed"]     = False
                    task["completed_at"]  = None
                    total_tasks += 1

        roadmap["total_tasks"]      = total_tasks
        roadmap["completed_tasks"]  = 0
        roadmap["overall_progress"] = 0
        roadmap["user_id"]          = user_id
        roadmap["generated_at"]     = datetime.utcnow().isoformat()
        roadmap["market_demand"]    = market_demand
        roadmap["user_context"]     = ctx

        # 5. Save to MongoDB
        db = await get_db()
        await db.career_roadmaps.update_one(
            {"user_id": user_id},
            {"$set": roadmap},
            upsert=True
        )

        return {"success": True, "data": roadmap}

    except json.JSONDecodeError as e:
        return {"success": False, "error": f"GPT returned invalid JSON: {str(e)}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ─── Task Completion ───────────────────────────────────────────────────────────
async def complete_roadmap_task(user_id: str, task_id: str, completed: bool) -> dict:
    """Mark a task as complete/incomplete and recalculate progress."""
    try:
        db      = await get_db()
        roadmap = await db.career_roadmaps.find_one({"user_id": user_id})
        if not roadmap:
            return {"success": False, "error": "No roadmap found"}

        total     = 0
        completed_count = 0

        for month in roadmap.get("months", []):
            for week in month.get("weeks", []):
                for task in week.get("tasks", []):
                    total += 1
                    if task["id"] == task_id:
                        task["completed"]    = completed
                        task["completed_at"] = datetime.utcnow().isoformat() if completed else None
                    if task["completed"]:
                        completed_count += 1

        overall = round((completed_count / total) * 100) if total > 0 else 0

        # Month-level progress
        for month in roadmap.get("months", []):
            month_total = sum(len(w["tasks"]) for w in month.get("weeks", []))
            month_done  = sum(
                sum(1 for t in w["tasks"] if t["completed"])
                for w in month.get("weeks", [])
            )
            month["progress"]          = round((month_done / month_total) * 100) if month_total > 0 else 0
            month["milestone_achieved"] = month["progress"] == 100

        roadmap["completed_tasks"]  = completed_count
        roadmap["overall_progress"] = overall

        await db.career_roadmaps.update_one(
            {"user_id": user_id},
            {"$set": roadmap}
        )

        return {
            "success":          True,
            "overall_progress": overall,
            "completed_tasks":  completed_count,
            "total_tasks":      total,
            "months_progress":  [
                {"month": m["month"], "progress": m.get("progress", 0)}
                for m in roadmap.get("months", [])
            ]
        }
    except Exception as e:
        return {"success": False, "error": str(e)}