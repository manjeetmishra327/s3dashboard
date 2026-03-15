from fastapi import APIRouter, HTTPException, Query
from scrapers.jsearch import fetch_jobs_jsearch

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.get("/test-jsearch")
async def test_jsearch(keywords: str = Query(default="software developer")):
    """Test JSearch API connection"""
    jobs = await fetch_jobs_jsearch(keywords)
    return {
        "total": len(jobs),
        "sample": jobs[:2]  # show first 2 only
    }