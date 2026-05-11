import os
from fastapi import APIRouter, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel
from typing import Optional

from scrapers.jsearch import fetch_jobs_jsearch
from database.mongo import save_jobs, get_jobs, get_ai_profile
from agents.job_matching_agent import run_job_matching_agent

router = APIRouter(prefix="/jobs", tags=["Jobs"])

_mongo    = AsyncIOMotorClient(os.environ.get("MONGODB_URI"))
_db       = _mongo[os.environ.get("MONGODB_DB_NAME", "s3_dashboard")]
_profiles = _db["ai_profiles"]
_apps     = _db["job_applications"]   # NEW


# ══════════════════════════════════════════════════════════════════════════════
#  EXISTING ENDPOINTS (unchanged)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/test-jsearch")
async def test_jsearch(keywords: str = Query(default="software developer")):
    jobs = await fetch_jobs_jsearch(keywords)
    return {"total": len(jobs), "sample": jobs[:2]}


@router.post("/scrape")
async def scrape_jobs(user_id: str = Query(...)):
    profile_doc = await get_ai_profile(user_id)
    if not profile_doc:
        raise HTTPException(404, "No profile found. Upload resume first.")
    profile  = profile_doc.get("profile", {})
    keywords = profile.get("target_role") or profile.get("domain", "software developer")
    jobs     = await fetch_jobs_jsearch(keywords)
    if not jobs:
        raise HTTPException(500, "No jobs found")
    await save_jobs(user_id, jobs)
    return {"success": True, "total_jobs": len(jobs), "keywords_used": keywords}


@router.get("/cached")
async def get_cached_jobs(user_id: str = Query(...)):
    doc = await _profiles.find_one({"user_id": user_id})
    if not doc:
        raise HTTPException(404, "No profile found.")
    cached = doc.get("job_matches")
    if not cached:
        raise HTTPException(404, "No job matches yet.")
    return {
        "user_id":       user_id,
        "total_scraped": doc.get("job_matches_total_scraped", len(cached)),
        "matches":       cached,
        "cached_at":     doc.get("job_matches_at"),
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
    await _profiles.update_one(
        {"user_id": user_id},
        {"$set": {
            "job_matches":               matches,
            "job_matches_total_scraped": result.get("total_jobs_scanned", 0),
            "job_matches_at":            datetime.utcnow(),
        }}
    )
    try:
        from vectorstore.chat_store import ingest_jobs
        ingest_jobs(user_id, matches)
    except Exception as e:
        print(f"[Jobs] RAG ingestion failed: {e}")
    return result


@router.post("/scrape-and-match")
async def scrape_and_match(user_id: str = Query(...)):
    profile_doc = await get_ai_profile(user_id)
    if not profile_doc:
        raise HTTPException(404, "No profile found. Upload resume first.")
    profile  = profile_doc.get("profile", {})
    keywords = profile.get("target_role") or profile.get("domain", "software developer")

    jobs = await fetch_jobs_jsearch(keywords)
    if not jobs:
        raise HTTPException(500, "No jobs found")
    await save_jobs(user_id, jobs)

    result  = await run_job_matching_agent(user_id)
    if not result["success"]:
        raise HTTPException(500, result.get("error", "Matching failed"))
    matches = result.get("matches", [])

    await _profiles.update_one(
        {"user_id": user_id},
        {"$set": {
            "job_matches":               matches,
            "job_matches_total_scraped": len(jobs),
            "job_matches_at":            datetime.utcnow(),
        }}
    )
    try:
        from vectorstore.chat_store import ingest_jobs
        ingest_jobs(user_id, matches)
    except Exception as e:
        print(f"[Jobs] RAG ingestion failed: {e}")

    return {"success": True, "total_scraped": len(jobs), "matches": matches}


# ══════════════════════════════════════════════════════════════════════════════
#  NEW — JOB APPLICATIONS (KANBAN)
# ══════════════════════════════════════════════════════════════════════════════

VALID_STATUSES = {"saved", "applied", "interviewing", "offer", "rejected"}


class ApplicationCreate(BaseModel):
    user_id:     str
    title:       str
    company:     str
    url:         Optional[str]   = ""
    match_score: Optional[int]   = 0
    job_type:    Optional[str]   = "fulltime"
    location:    Optional[str]   = ""
    salary:      Optional[str]   = ""
    notes:       Optional[str]   = ""
    status:      Optional[str]   = "saved"


class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    notes:  Optional[str] = None


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    if "added_at" in doc and doc["added_at"]:
        doc["added_at"] = doc["added_at"].isoformat()
    if "updated_at" in doc and doc["updated_at"]:
        doc["updated_at"] = doc["updated_at"].isoformat()
    return doc


@router.post("/applications")
async def save_application(body: ApplicationCreate):
    """Save a job to the Kanban tracker."""
    if body.status not in VALID_STATUSES:
        raise HTTPException(400, f"Invalid status. Use: {VALID_STATUSES}")

    # Prevent duplicates (same user + title + company)
    existing = await _apps.find_one({
        "user_id": body.user_id,
        "title":   body.title,
        "company": body.company,
    })
    if existing:
        return {"success": True, "id": str(existing["_id"]), "duplicate": True}

    doc = {
        **body.dict(),
        "added_at":   datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await _apps.insert_one(doc)
    return {"success": True, "id": str(result.inserted_id)}


@router.get("/applications")
async def get_applications(user_id: str = Query(...)):
    """Fetch all Kanban cards for a user."""
    cursor = _apps.find({"user_id": user_id}, {"_id": 1, "title": 1, "company": 1,
        "url": 1, "match_score": 1, "job_type": 1, "location": 1, "salary": 1,
        "notes": 1, "status": 1, "added_at": 1, "updated_at": 1})
    docs = await cursor.to_list(length=500)
    return {"success": True, "applications": [_serialize(d) for d in docs]}


@router.patch("/applications/{app_id}")
async def update_application(app_id: str, body: ApplicationUpdate, user_id: str = Query(...)):
    """Update status (drag-drop) or notes."""
    if body.status and body.status not in VALID_STATUSES:
        raise HTTPException(400, f"Invalid status. Use: {VALID_STATUSES}")

    update_data = {"updated_at": datetime.utcnow()}
    if body.status:
        update_data["status"] = body.status
    if body.notes is not None:
        update_data["notes"] = body.notes

    res = await _apps.update_one(
        {"_id": ObjectId(app_id), "user_id": user_id},
        {"$set": update_data}
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Application not found.")
    return {"success": True}


@router.delete("/applications/{app_id}")
async def delete_application(app_id: str, user_id: str = Query(...)):
    """Remove a card from the Kanban."""
    res = await _apps.delete_one({"_id": ObjectId(app_id), "user_id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Application not found.")
    return {"success": True}


@router.get("/applications/stats")
async def application_stats(user_id: str = Query(...)):
    """Funnel stats for dashboard header."""
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    cursor = _apps.aggregate(pipeline)
    rows   = await cursor.to_list(length=20)
    stats  = {r["_id"]: r["count"] for r in rows}
    total  = sum(stats.values())
    return {
        "total":        total,
        "saved":        stats.get("saved", 0),
        "applied":      stats.get("applied", 0),
        "interviewing": stats.get("interviewing", 0),
        "offer":        stats.get("offer", 0),
        "rejected":     stats.get("rejected", 0),
        "response_rate": round(
            (stats.get("interviewing", 0) + stats.get("offer", 0)) /
            max(stats.get("applied", 1), 1) * 100
        ),
    }