import os
from fastapi import APIRouter, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from scrapers.jsearch import fetch_jobs_jsearch
from database.mongo import save_jobs, get_jobs, get_ai_profile
from agents.job_matching_agent import run_job_matching_agent

router = APIRouter(prefix="/jobs", tags=["Jobs"])

# Direct Mongo access for saving/reading cached matches
_mongo = AsyncIOMotorClient(os.environ.get("MONGODB_URI"))
_db = _mongo[os.environ.get("MONGODB_DB_NAME", "s3_dashboard")]
_profiles = _db["ai_profiles"]


@router.get("/test-jsearch")
async def test_jsearch(keywords: str = Query(default="software developer")):
    jobs = await fetch_jobs_jsearch(keywords)
    return {"total": len(jobs), "sample": jobs[:2]}


@router.post("/scrape")
async def scrape_jobs(user_id: str = Query(...)):
    profile_doc = await get_ai_profile(user_id)
    if not profile_doc:
        raise HTTPException(404, "No profile found. Upload resume first.")
    profile = profile_doc.get("profile", {})
    keywords = profile.get("target_role") or profile.get("domain", "software developer")
    print("[Jobs] Scraping for:", keywords)
    jobs = await fetch_jobs_jsearch(keywords)
    if not jobs:
        raise HTTPException(500, "No jobs found")
    await save_jobs(user_id, jobs)
    return {
        "success": True,
        "total_jobs": len(jobs),
        "keywords_used": keywords,
        "message": f"Scraped and saved {len(jobs)} jobs"
    }


# ── FAST: reads saved match results, no agent runs ──────────────────────
@router.get("/cached")
async def get_cached_jobs(user_id: str = Query(...)):
    doc = await _profiles.find_one({"user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="No profile found.")

    cached = doc.get("job_matches")
    if not cached:
        raise HTTPException(
            status_code=404,
            detail="No job matches yet. Click 'Find My Job Matches' to run matching."
        )

    return {
        "user_id": user_id,
        "total_scraped": doc.get("job_matches_total_scraped", len(cached)),
        "matches": cached,
        "cached_at": doc.get("job_matches_at")
    }


@router.get("/list")
async def list_jobs(user_id: str = Query(...)):
    jobs = await get_jobs(user_id)
    return {"total": len(jobs), "jobs": jobs}


@router.get("/match")
async def match_jobs(user_id: str = Query(...)):
    result = await run_job_matching_agent(user_id)
    if not result["success"]:
        raise HTTPException(500, result.get("error", "Matching failed"))

    matches = result.get("matches", [])

    # Save matches to MongoDB
    await _profiles.update_one(
        {"user_id": user_id},
        {"$set": {
            "job_matches": matches,
            "job_matches_total_scraped": result.get("total_jobs_scanned", 0),
            "job_matches_at": datetime.utcnow()
        }}
    )

    # ── Auto-ingest job matches into RAG vector store ─────────────────────────
    try:
        from vectorstore.chat_store import ingest_jobs
        ingest_jobs(user_id, matches)
        print(f"[Jobs] RAG ingestion complete for user: {user_id}")
    except Exception as e:
        print(f"[Jobs] RAG ingestion failed (non-fatal): {e}")
    # ─────────────────────────────────────────────────────────────────────────

    return result


@router.post("/scrape-and-match")
async def scrape_and_match(user_id: str = Query(...)):
    profile_doc = await get_ai_profile(user_id)
    if not profile_doc:
        raise HTTPException(404, "No profile found. Upload resume first.")
    profile = profile_doc.get("profile", {})
    keywords = profile.get("target_role") or profile.get("domain", "software developer")

    jobs = await fetch_jobs_jsearch(keywords)
    if not jobs:
        raise HTTPException(500, "No jobs found")
    await save_jobs(user_id, jobs)

    result = await run_job_matching_agent(user_id)
    print("[DEBUG] Agent result success:", result.get("success"), "| matches:", len(result.get("matches", [])))
    if not result["success"]:
        raise HTTPException(500, result.get("error", "Matching failed"))

    matches = result.get("matches", [])

    # Save matches to MongoDB so /cached works next visit
    await _profiles.update_one(
        {"user_id": user_id},
        {"$set": {
            "job_matches": matches,
            "job_matches_total_scraped": len(jobs),
            "job_matches_at": datetime.utcnow()
        }}
    )
    print(f"[Jobs] Saved {len(matches)} matches to MongoDB for user: {user_id}")

    # ── Auto-ingest job matches into RAG vector store ─────────────────────────
    try:
        from vectorstore.chat_store import ingest_jobs
        ingest_jobs(user_id, matches)
        print(f"[Jobs] RAG ingestion complete for user: {user_id}")
    except Exception as e:
        print(f"[Jobs] RAG ingestion failed (non-fatal): {e}")
    # ─────────────────────────────────────────────────────────────────────────

    return {
        "success": True,
        "total_scraped": len(jobs),
        "matches": matches
    }