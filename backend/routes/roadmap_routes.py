from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from agents.career_roadmap_agent import (
    run_career_roadmap_agent,
    complete_roadmap_task,
    run_ai_coach,
    load_user_context,
)
from database.mongo import get_db

router = APIRouter(prefix="/roadmap", tags=["Career Roadmap"])


# ─── POST /roadmap/generate ───────────────────────────────────────────────────
class GenerateRequest(BaseModel):
    user_id: str

@router.post("/generate")
async def generate_roadmap(req: GenerateRequest):
    """Generate a personalized 3-month career roadmap using live market data."""
    result = await run_career_roadmap_agent(req.user_id)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error"))
    return result


# ─── GET /roadmap/{user_id} ───────────────────────────────────────────────────
@router.get("/{user_id}")
async def get_roadmap(user_id: str):
    """Fetch saved roadmap for a user."""
    db      = await get_db()
    roadmap = await db.career_roadmaps.find_one({"user_id": user_id}, {"_id": 0})
    if not roadmap:
        return {"success": True, "data": None}
    return {"success": True, "data": roadmap}


# ─── PATCH /roadmap/complete-task ─────────────────────────────────────────────
class TaskCompleteRequest(BaseModel):
    user_id:   str
    task_id:   str
    completed: bool

@router.patch("/complete-task")
async def complete_task(req: TaskCompleteRequest):
    """Mark a task complete or incomplete. Recalculates all progress."""
    result = await complete_roadmap_task(req.user_id, req.task_id, req.completed)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error"))
    return result


# ─── POST /roadmap/coach ──────────────────────────────────────────────────────
class CoachRequest(BaseModel):
    user_id:          str
    task_title:       str
    task_description: str
    user_question:    str

@router.post("/coach")
async def ai_coach(req: CoachRequest):
    """AI Coach: context-aware Q&A for any roadmap task."""
    ctx    = await load_user_context(req.user_id)
    result = await run_ai_coach(
        task_title=req.task_title,
        task_description=req.task_description,
        user_question=req.user_question,
        target_role=ctx.get("target_role", "Software Engineer"),
        current_skills=ctx.get("current_skills", []),
        experience_level=ctx.get("experience_level", "junior"),
    )
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error"))
    return result


# ─── Register in main.py ──────────────────────────────────────────────────────
# from routes.roadmap_routes import router as roadmap_router
# app.include_router(roadmap_router)