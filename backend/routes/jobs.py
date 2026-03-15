from fastapi import APIRouter, HTTPException, Query
from scrapers.jsearch import fetch_jobs_jsearch
from database.mongo import save_jobs, get_jobs, get_ai_profile
from agents.job_matching_agent import run_job_matching_agent

router = APIRouter(prefix="/jobs", tags=["Jobs"])

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
        "message": "Scraped and saved " + str(len(jobs)) + " jobs"
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
    return {
        "success": True,
        "total_scraped": len(jobs),
        "matches": result.get("matches", [])
    }
