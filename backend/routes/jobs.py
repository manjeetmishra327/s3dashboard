from fastapi import APIRouter

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("/match")
async def match_jobs(user_id: str):
    return {"message": "Job matching agent coming soon", "jobs": []}
