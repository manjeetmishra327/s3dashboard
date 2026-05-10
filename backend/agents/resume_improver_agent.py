import os
import json
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ─── System Prompt ─────────────────────────────────────────────────────────────
IMPROVER_SYSTEM = """You are a world-class resume writer who has placed 10,000+ candidates at FAANG companies, 
top startups, and Fortune 500 firms. Your rewrites are precise, powerful, and measurably better.

Rules for every rewrite:
1. NEVER add fake metrics — only improve what's already there or make reasonable statements
2. Every bullet must start with a strong past-tense action verb
3. Remove "responsible for", "assisted with", "helped", "worked on"
4. Add specificity: tools, scale, outcomes
5. Keep the same truthful facts — only reframe and strengthen"""

# ─── Improver Prompt ───────────────────────────────────────────────────────────
IMPROVER_PROMPT = """Rewrite this resume section in 3 distinct professional styles.

SECTION TO IMPROVE: {section_name}
CURRENT CONTENT:
---
{section_content}
---
TARGET ROLE: {target_role}
{jd_block}

Return ONLY this JSON (no markdown, no preamble):
{{
  "original_issues": [
    "specific issue 1 observed in the text",
    "specific issue 2",
    "specific issue 3"
  ],
  "pro_tip": "one expert insight specific to this section type",
  "variations": [
    {{
      "id": "polished",
      "label": "Polished & Safe",
      "tagline": "ATS-optimized, zero risk",
      "icon": "shield",
      "accent": "#00e5cb",
      "content": "The rewritten section content here — clean, strong, ATS-safe",
      "what_changed": [
        "Replaced weak verbs with action verbs",
        "Tightened language",
        "Added industry keywords"
      ],
      "ats_boost": "+8–12 ATS score",
      "best_for": "Traditional companies, enterprise roles"
    }},
    {{
      "id": "impact",
      "label": "Maximum Impact",
      "tagline": "Results-first, achievement-focused",
      "icon": "zap",
      "accent": "#f59e0b",
      "content": "The rewritten section content — metrics foregrounded, strong verbs, outcome-first structure",
      "what_changed": [
        "Metrics and outcomes moved to front of bullets",
        "Quantified scope and scale",
        "Eliminated all passive phrases"
      ],
      "ats_boost": "+15–20 ATS score",
      "best_for": "Startups, growth companies, competitive roles"
    }},
    {{
      "id": "executive",
      "label": "Executive Edge",
      "tagline": "Senior-level positioning",
      "icon": "crown",
      "accent": "#a78bfa",
      "content": "The rewritten section content — strategic language, leadership narrative, business impact",
      "what_changed": [
        "Reframed individual tasks as strategic initiatives",
        "Added business context and impact",
        "Language positioned at senior/lead level"
      ],
      "ats_boost": "+12–16 ATS score",
      "best_for": "Senior roles, management tracks, leadership positions"
    }}
  ],
  "keywords_to_add": ["keyword1", "keyword2", "keyword3"],
  "power_verbs_suggested": ["Led", "Architected", "Drove", "Reduced", "Grew"]
}}"""


# ─── Main Agent ────────────────────────────────────────────────────────────────
async def run_resume_improver(
    section_name: str,
    section_content: str,
    target_role: str = "Professional",
    job_description: str = None,
    user_id: str = None
) -> dict:
    """
    Resume Improver Agent — generates 3 professional rewrite variations.
    Each variation has a different strategic angle:
      1. Polished & Safe     → ATS-optimized, conservative
      2. Maximum Impact      → Metrics-first, achievement-focused
      3. Executive Edge      → Strategic framing, senior positioning
    """
    try:
        jd_block = ""
        if job_description and len(job_description.strip()) > 50:
            jd_block = (
                f"\nJOB DESCRIPTION (weave in these keywords naturally):\n"
                f"{job_description[:1800]}"
            )

        prompt = IMPROVER_PROMPT.format(
            section_name=section_name,
            section_content=section_content[:2000],
            target_role=target_role,
            jd_block=jd_block
        )

        response = await client.chat.completions.create(
            model="gpt-4o",
            temperature=0.75,
            messages=[
                {"role": "system", "content": IMPROVER_SYSTEM},
                {"role": "user",   "content": prompt}
            ],
            response_format={"type": "json_object"},
            max_tokens=3000
        )

        raw  = response.choices[0].message.content
        data = json.loads(raw)

        return {
            "success": True,
            "data": data,
            "section_name": section_name,
            "target_role": target_role
        }

    except json.JSONDecodeError as e:
        return {"success": False, "error": f"GPT returned invalid JSON: {str(e)}"}
    except Exception as e:
        return {"success": False, "error": str(e)}