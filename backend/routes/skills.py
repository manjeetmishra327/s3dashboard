from fastapi import APIRouter

router = APIRouter(prefix="/skills", tags=["Skills"])


@router.get("/gaps")
async def skill_gaps(user_id: str):
    return {"message": "Skill gap agent coming soon", "gaps": []}
