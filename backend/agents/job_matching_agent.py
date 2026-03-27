import os
import json
from vectorstore.qdrant_client import embed_and_store_jobs, embed_user_profile, search_matching_jobs
from database.mongo import get_ai_profile, get_jobs
from openai import OpenAI

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
openai_client = OpenAI(api_key=OPENAI_API_KEY)

async def run_job_matching_agent(user_id):
    print("[Job Matching Agent] Starting for user:", user_id)
    try:
        profile_doc = await get_ai_profile(user_id)
        if not profile_doc:
            return {"success": False, "error": "No profile found"}
        profile = profile_doc.get("profile", {})
        print("[Job Matching Agent] Profile loaded:", profile.get("name"))

        jobs = await get_jobs(user_id)
        if not jobs:
            return {"success": False, "error": "No jobs found. Run scraper first."}
        print("[Job Matching Agent] Jobs loaded:", len(jobs))

        print("[Job Matching Agent] Embedding jobs into Qdrant...")
        embed_and_store_jobs(jobs, user_id)

        print("[Job Matching Agent] Embedding profile into Qdrant...")
        embed_user_profile(profile, user_id)

        print("[Job Matching Agent] Searching for matches...")
        top_k = min(len(jobs), 30)
        matches = search_matching_jobs(user_id, profile, top_k=top_k)

        print("[Job Matching Agent] GPT-4o explaining matches...")
        enriched = explain_matches(profile, matches)

        print("[Job Matching Agent] Done. Matches:", len(enriched))
        return {
            "success": True,
            "total_jobs_scanned": len(jobs),
            "matches": enriched
        }

    except Exception as e:
        print("[Job Matching Agent] Error:", e)
        return {"success": False, "error": str(e)}


def explain_matches(profile, matches):
    if not matches:
        return matches
    try:
        prompt = (
            "You are a career advisor AI.\n"
            "User Profile:\n"
            "- Name: " + profile.get("name", "") + "\n"
            "- Domain: " + profile.get("domain", "") + "\n"
            "- Target Role: " + profile.get("target_role", "") + "\n"
            "- Experience: " + profile.get("experience_level", "") + "\n"
            "- Skills: " + ", ".join(profile.get("skills", [])[:15]) + "\n\n"
            "Job Matches:\n" + json.dumps([{
                "index": i,
                "title": m.get("title"),
                "company": m.get("company"),
                "skills_required": m.get("skills_required", []),
                "similarity_score": m.get("similarity_score")
            } for i, m in enumerate(matches)], indent=2) + "\n\n"
            "For each job return a JSON array. Return ONLY valid JSON, no markdown, no backticks.\n"
            "match_score MUST be an integer between 30 and 100. Never return 0.\n"
            "Format: [{\"index\": 0, \"match_score\": 85, \"why_this_fits\": \"...\", "
            "\"skill_overlap\": [\"React\"], \"missing_skills\": [\"Docker\"], "
            "\"skill_overlap_percent\": 70}]"
        )
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a JSON-only response bot. Never use markdown or backticks. match_score is always an integer 30-100."},
                {"role": "user", "content": prompt}
            ],
            temperature=0
        )
        raw = response.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        print("[Job Matching Agent] GPT-4o raw length:", len(raw))
        explanations = json.loads(raw)

        for match in matches:
            idx = matches.index(match)
            exp = next((e for e in explanations if e.get("index") == idx), {})

            # Normalize similarity_score to 0-100 range
            sim = match.get("similarity_score", 0)
            if isinstance(sim, float) and sim <= 1.0:
                sim = round(sim * 100)

            gpt_score = exp.get("match_score")
            match["match_score"] = gpt_score if (isinstance(gpt_score, (int, float)) and gpt_score > 0) else sim
            match["why_this_fits"] = exp.get("why_this_fits", "Good match based on your skills")
            match["skill_overlap"] = exp.get("skill_overlap", [])
            match["missing_skills"] = exp.get("missing_skills", [])
            match["skill_overlap_percent"] = exp.get("skill_overlap_percent", 0)

        return sorted(matches, key=lambda x: x.get("match_score", 0), reverse=True)

    except Exception as e:
        print("[Job Matching Agent] GPT-4o parse error:", e)
        for match in matches:
            sim = match.get("similarity_score", 0)
            if isinstance(sim, float) and sim <= 1.0:
                sim = round(sim * 100)
            match["match_score"] = sim if sim > 0 else 50
            match["why_this_fits"] = "Match based on vector similarity"
            match["skill_overlap"] = []
            match["missing_skills"] = []
            match["skill_overlap_percent"] = 0
        return sorted(matches, key=lambda x: x.get("match_score", 0), reverse=True)