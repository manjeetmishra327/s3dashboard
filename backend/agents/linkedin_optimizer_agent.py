import os
import json
from openai import AsyncOpenAI
from database.mongo import db
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# ── Shared JSON parser — strips markdown fences from any GPT response ─────────
def parse_json_response(raw: str) -> dict:
    """Strip markdown fences and parse JSON from GPT response."""
    raw = raw.strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        # parts[1] is the content between first and second ```
        raw = parts[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


SECTION_SCORE_PROMPT = """You are a senior LinkedIn profile strategist and recruiter with 15+ years of experience.
Analyze this LinkedIn profile and return a JSON object with ONLY these fields:

{
  "overall_score": <0-100 int>,
  "headline_score": <0-100 int>,
  "about_score": <0-100 int>,
  "experience_score": <0-100 int>,
  "skills_score": <0-100 int>,
  "recruiter_searchability": <0-100 int>,
  "ats_compatibility": <0-100 int>,
  "strengths": ["<str>", "<str>", "<str>"],
  "critical_gaps": ["<str>", "<str>", "<str>"],
  "quick_wins": ["<str>", "<str>", "<str>"]
}

Be precise. Base scores on: keyword density, action verbs, quantified achievements, recruiter searchability, completeness.
Return ONLY valid JSON. No markdown, no explanation."""


KEYWORD_ANALYSIS_PROMPT = """You are an ATS and LinkedIn SEO expert.
Given the profile and target role, analyze keyword optimization.

Return ONLY this JSON:
{
  "target_role": "<str>",
  "missing_keywords": ["<keyword>", ...],
  "present_keywords": ["<keyword>", ...],
  "keyword_density_score": <0-100>,
  "top_recruiter_searches": ["<search term>", ...],
  "industry_buzzwords_missing": ["<word>", ...],
  "recommended_skills_to_add": ["<skill>", ...]
}

Return ONLY valid JSON."""


REWRITE_PROMPT = """You are a world-class LinkedIn copywriter who has helped 10,000+ professionals land jobs at FAANG companies.

Rewrite each section of this LinkedIn profile for maximum recruiter appeal and ATS searchability.
Target role: {target_role}

Return ONLY this JSON:
{{
  "headline": {{
    "original": "<original headline>",
    "optimized": "<rewritten headline - max 220 chars, keyword-rich, value proposition>",
    "explanation": "<why this works>"
  }},
  "about": {{
    "original": "<original about>",
    "optimized": "<rewritten about - 3 paragraphs: hook, value, CTA, ~2000 chars max>",
    "explanation": "<key improvements made>"
  }},
  "experience_bullets": [
    {{
      "original": "<original bullet>",
      "optimized": "<rewritten with strong verb + metric + impact>",
      "improvement": "<what changed>"
    }}
  ],
  "skills_to_highlight": ["<skill1>", "<skill2>", "<skill3>", "<skill4>", "<skill5>"],
  "banner_suggestion": "<describe an ideal LinkedIn banner for this person>",
  "connection_message_template": "<50-word personalized connection request template>"
}}

Rules for rewrites:
- Headline: Role | Value proposition | Unique differentiator
- About: Start with a bold hook, not "I am a..."
- Bullets: Start with power verbs (Led, Built, Drove, Engineered, Scaled), include metrics
- Never use: "responsible for", "helped with", "worked on"

Return ONLY valid JSON."""


async def run_linkedin_optimizer_agent(user_id: str, profile_text: str, target_role: str) -> dict:
    """
    Multi-pass LinkedIn profile optimizer.
    Pass 1: Score all sections
    Pass 2: Keyword gap analysis
    Pass 3: Full AI rewrite of all sections
    """
    score_raw = keyword_raw = rewrite_raw = ""

    try:
        # ── Pass 1: Section scoring ──────────────────────────────────────────
        score_response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SECTION_SCORE_PROMPT},
                {
                    "role": "user",
                    "content": f"Target Role: {target_role}\n\nProfile:\n{profile_text}",
                },
            ],
            temperature=0.2,
            max_tokens=800,
        )
        score_raw = score_response.choices[0].message.content.strip()
        score_data = parse_json_response(score_raw)

        # ── Pass 2: Keyword analysis ─────────────────────────────────────────
        keyword_response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": KEYWORD_ANALYSIS_PROMPT},
                {
                    "role": "user",
                    "content": f"Target Role: {target_role}\n\nProfile:\n{profile_text}",
                },
            ],
            temperature=0.2,
            max_tokens=600,
        )
        keyword_raw = keyword_response.choices[0].message.content.strip()
        keyword_data = parse_json_response(keyword_raw)

        # ── Pass 3: Full rewrite ─────────────────────────────────────────────
        rewrite_response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": REWRITE_PROMPT.format(target_role=target_role),
                },
                {
                    "role": "user",
                    "content": f"Profile to rewrite:\n{profile_text}",
                },
            ],
            temperature=0.4,
            max_tokens=2500,
        )
        rewrite_raw = rewrite_response.choices[0].message.content.strip()
        rewrite_data = parse_json_response(rewrite_raw)

        # ── Persist to MongoDB ────────────────────────────────────────────────
        result_doc = {
            "user_id": user_id,
            "target_role": target_role,
            "profile_text": profile_text,
            "scores": score_data,
            "keywords": keyword_data,
            "rewrites": rewrite_data,
            "created_at": datetime.utcnow(),
        }
        await db["linkedin_optimizations"].insert_one(result_doc)

        return {
            "success": True,
            "data": {
                "scores": score_data,
                "keywords": keyword_data,
                "rewrites": rewrite_data,
            },
        }

    except json.JSONDecodeError as e:
        # Log which pass failed and what the raw response looked like
        print(f"[LinkedIn Agent] JSON parse error: {e}")
        if not score_raw:
            failed_at = "Pass 1 (scoring)"
            raw = score_raw
        elif not keyword_raw:
            failed_at = "Pass 2 (keywords)"
            raw = keyword_raw
        else:
            failed_at = "Pass 3 (rewrite)"
            raw = rewrite_raw
        print(f"[LinkedIn Agent] Failed at: {failed_at}")
        print(f"[LinkedIn Agent] Raw response:\n{repr(raw)}")
        return {"success": False, "error": f"JSON parse error in AI response: {str(e)}"}

    except Exception as e:
        print(f"[LinkedIn Agent] Unexpected error: {e}")
        return {"success": False, "error": str(e)}


async def get_linkedin_history(user_id: str) -> dict:
    """Fetch past optimization runs for a user."""
    try:
        cursor = db["linkedin_optimizations"].find(
            {"user_id": user_id},
            {"_id": 0, "profile_text": 0},
            sort=[("created_at", -1)],
            limit=5,
        )
        history = await cursor.to_list(length=5)
        return {"success": True, "data": history}
    except Exception as e:
        return {"success": False, "error": str(e)}