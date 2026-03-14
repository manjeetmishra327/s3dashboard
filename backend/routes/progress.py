from fastapi import APIRouter

router = APIRouter(prefix="/progress", tags=["Progress"])


@router.get("/{user_id}")
async def get_progress(user_id: str):
    return {"message": "Progress tracker coming soon", "progress": []}
