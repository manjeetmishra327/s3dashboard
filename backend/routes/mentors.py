from fastapi import APIRouter

router = APIRouter(prefix="/mentors", tags=["Mentors"])


@router.get("/match")
async def match_mentors(user_id: str):
    return {"message": "Mentor matching agent coming soon", "mentors": []}
