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
        matches = search_matching_jobs(user_id, profile, top_k=10)

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
        "For each job return a JSON array:\n"
        "[{\n"
        "  \"index\": number,\n"
        "  \"match_score\": number 0-100,\n"
        "  \"why_this_fits\": \"2 sentence explanation\",\n"
        "  \"skill_overlap\": [\"skill1\", \"skill2\"],\n"
        "  \"missing_skills\": [\"skill1\"],\n"
        "  \"skill_overlap_percent\": number\n"
        "}]\n"
        "Return ONLY the JSON array, no extra text."
    )
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )
    try:
        explanations = json.loads(response.choices[0].message.content)
        for match in matches:
            idx = matches.index(match)
            explanation = next((e for e in explanations if e.get("index") == idx), {})
            match["match_score"] = explanation.get("match_score", match.get("similarity_score", 0))
            match["why_this_fits"] = explanation.get("why_this_fits", "")
            match["skill_overlap"] = explanation.get("skill_overlap", [])
            match["missing_skills"] = explanation.get("missing_skills", [])
            match["skill_overlap_percent"] = explanation.get("skill_overlap_percent", 0)
        return sorted(matches, key=lambda x: x.get("match_score", 0), reverse=True)
    except Exception as e:
        print("[Job Matching Agent] GPT-4o parse error:", e)
        return matches
