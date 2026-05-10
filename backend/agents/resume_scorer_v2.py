import os
import json
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ─── System Prompt ─────────────────────────────────────────────────────────────
SCORER_SYSTEM = """You are an elite resume analyst and former FAANG technical recruiter with 15 years of experience.

CRITICAL SCORING RULES — follow these EXACTLY:
- Use the FULL range 0–100. Never default to 60–70.
- 90–100 → Exceptional (top 5%, rare)
- 75–89  → Strong (above average, competitive)
- 55–74  → Average (needs improvement)
- 35–54  → Weak (significant gaps)
- 0–34   → Poor (major rewrites needed)

Base every score on ACTUAL content observed in the resume. Count real numbers."""

# ─── Scoring Prompt ────────────────────────────────────────────────────────────
SCORER_PROMPT = """Analyze this resume thoroughly and return ONLY valid JSON.

RESUME TEXT:
{resume_text}

{jd_block}

=== SCORING RUBRICS (apply strictly) ===

contact_info (5% weight):
  +20 each for: email present, phone present, LinkedIn URL, GitHub/portfolio, location
  Score = sum of points (max 100)

professional_summary (10% weight):
  0  → no summary section
  30 → generic "hardworking professional" filler
  55 → decent but not tailored
  75 → role-specific with value proposition
  90 → compelling, quantified, tailored to industry

work_experience (35% weight):
  Start at 40. Then:
  +15 if 3+ relevant positions
  +20 if 50%+ bullets contain numbers/percentages/dollar amounts
  +10 if bullets start with strong action verbs (Led, Built, Reduced, Grew, etc.)
  -15 if 30%+ bullets use weak phrases (responsible for, assisted, helped, worked on)
  -10 if bullets are just task lists with no outcomes
  Cap at 100, floor at 0.

skills_section (15% weight):
  0  → no skills section
  30 → 1–4 skills listed
  50 → 5–9 skills, not organized
  65 → 10–15 skills
  80 → 15–25 skills, some categorization
  95 → 25+ skills, well-categorized (Technical/Tools/Languages etc.)

education (10% weight):
  0  → not mentioned
  50 → degree name only
  65 → degree + institution
  75 → degree + institution + graduation year
  85 → above + GPA (3.5+) or honors
  95 → above + relevant coursework or projects

ats_optimization (25% weight):
  Start at 100. Deduct:
  -25 if tables or columns detected (common cause of ATS failure)
  -20 if no standard section headers (Work Experience, Education, Skills)
  -15 if inconsistent date formats
  -10 if graphics, icons, or images detected
  -10 if very long lines or dense paragraphs

=== RETURN THIS JSON (no markdown, no extra text) ===
{{
  "dimensions": {{
    "contact_info": {{
      "score": 0,
      "has_email": false,
      "has_phone": false,
      "has_linkedin": false,
      "has_github_portfolio": false,
      "has_location": false,
      "feedback": "specific observation"
    }},
    "professional_summary": {{
      "score": 0,
      "exists": false,
      "word_count": 0,
      "quality": "missing|generic|decent|strong|exceptional",
      "feedback": "specific observation"
    }},
    "work_experience": {{
      "score": 0,
      "jobs_count": 0,
      "total_bullets": 0,
      "bullets_with_metrics": 0,
      "weak_phrase_count": 0,
      "strong_verbs_found": [],
      "best_bullet": "best bullet found or empty string",
      "worst_bullet": "worst bullet found or empty string",
      "feedback": "specific observation"
    }},
    "skills_section": {{
      "score": 0,
      "skills_count": 0,
      "has_categories": false,
      "top_skills": [],
      "feedback": "specific observation"
    }},
    "education": {{
      "score": 0,
      "degree_present": false,
      "institution_present": false,
      "year_present": false,
      "gpa_or_honors": false,
      "feedback": "specific observation"
    }},
    "ats_optimization": {{
      "score": 0,
      "no_tables": true,
      "standard_headers": true,
      "consistent_dates": true,
      "no_graphics": true,
      "keywords_found": [],
      "feedback": "specific observation"
    }}
  }},
  "sections": [
    {{
      "name": "Section Name",
      "raw_content": "first 300 chars of this section",
      "score": 0,
      "issues": ["specific issue 1", "specific issue 2"],
      "quick_wins": ["actionable fix 1", "actionable fix 2"]
    }}
  ],
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "critical_fixes": ["most impactful fix 1", "fix 2", "fix 3"],
  "target_role": "detected target role",
  "experience_years": 0,
  "ats_score": 0,
  "jd_match": null,
  "jd_matched_keywords": [],
  "jd_missing_keywords": []
}}"""


# ─── Weighted Score Calculator (NOT from GPT — eliminates anchoring bias) ──────
def calculate_overall_score(dimensions: dict) -> int:
    weights = {
        "contact_info":       0.05,
        "professional_summary": 0.10,
        "work_experience":    0.35,
        "skills_section":     0.15,
        "education":          0.10,
        "ats_optimization":   0.25,
    }
    total = 0.0
    for key, weight in weights.items():
        score = dimensions.get(key, {}).get("score", 50)
        total += score * weight
    return round(total)


def score_label(score: int) -> dict:
    if score >= 85:
        return {"label": "Exceptional", "color": "#10b981", "ring": "#10b981"}
    elif score >= 70:
        return {"label": "Strong", "color": "#00e5cb", "ring": "#00e5cb"}
    elif score >= 55:
        return {"label": "Average", "color": "#f59e0b", "ring": "#f59e0b"}
    elif score >= 40:
        return {"label": "Needs Work", "color": "#f97316", "ring": "#f97316"}
    else:
        return {"label": "Critical Issues", "color": "#f43f5e", "ring": "#f43f5e"}


# ─── Main Agent ────────────────────────────────────────────────────────────────
async def run_resume_scorer_v2(
    resume_text: str,
    user_id: str,
    job_description: str = None
) -> dict:
    """
    Resume Scorer v2 — Multi-dimensional, rubric-based scoring.
    Fixes the 68-forever bug by:
      1. Explicit rubrics per dimension (not "rate this 0-100")
      2. Programmatic weighted average (not GPT-generated overall)
      3. temperature=0.2 (light variability, not frozen at 0)
    """
    try:
        jd_block = ""
        if job_description and len(job_description.strip()) > 50:
            jd_block = (
                f"\nJOB DESCRIPTION (match resume against this):\n"
                f"{job_description[:2500]}\n\n"
                f"For jd_match: percentage of JD's key skills/technologies found in resume (0–100).\n"
                f"List matched and missing keywords."
            )

        prompt = SCORER_PROMPT.format(
            resume_text=resume_text[:4500],
            jd_block=jd_block
        )

        response = await client.chat.completions.create(
            model="gpt-4o",
            temperature=0.2,
            messages=[
                {"role": "system", "content": SCORER_SYSTEM},
                {"role": "user",   "content": prompt}
            ],
            response_format={"type": "json_object"},
            max_tokens=3500
        )

        raw  = response.choices[0].message.content
        data = json.loads(raw)

        # Programmatic overall score
        overall        = calculate_overall_score(data.get("dimensions", {}))
        label_info     = score_label(overall)
        data["overall_score"] = overall
        data["label"]         = label_info["label"]
        data["label_color"]   = label_info["color"]
        data["ring_color"]    = label_info["ring"]
        data["user_id"]       = user_id

        return {"success": True, "data": data}

    except json.JSONDecodeError as e:
        return {"success": False, "error": f"GPT returned invalid JSON: {str(e)}"}
    except Exception as e:
        return {"success": False, "error": str(e)}