from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database.mongo import profiles_collection
from datetime import datetime

router = APIRouter(prefix="/progress", tags=["Progress"])


class SkillUpdateRequest(BaseModel):
    skill: str
    status: str  # "not_started" | "learning" | "completed"


@router.get("")
async def get_progress(user_id: str):
    """Fetch current progress for all skill gaps."""
    profile_doc = await profiles_collection.find_one({"user_id": user_id})

    if not profile_doc:
        raise HTTPException(status_code=404, detail="No profile found for this user.")

    skill_gap = profile_doc.get("skill_gap")
    if not skill_gap:
        raise HTTPException(
            status_code=404,
            detail="No skill gap found. Run GET /skills/gap first."
        )

    skill_gaps = skill_gap.get("skill_gaps", [])
    progress = profile_doc.get("progress", {})

    # Build progress report
    skills_report = []
    completed = 0
    learning = 0
    not_started = 0

    for gap in skill_gaps:
        skill_name = gap["skill"]
        status = progress.get(skill_name, "not_started")

        if status == "completed":
            completed += 1
        elif status == "learning":
            learning += 1
        else:
            not_started += 1

        skills_report.append({
            "skill": skill_name,
            "priority": gap.get("priority"),
            "status": status,
            "estimated_days": gap.get("estimated_days"),
            "resources": gap.get("resources", []),
            "reason": gap.get("reason", "")
        })

    total = len(skill_gaps)
    completion_percent = round((completed / total) * 100, 1) if total > 0 else 0

    return {
    "success": True,
    "user_id": user_id,
    "student_name": skill_gap.get("student_name"),
    "target_role": skill_gap.get("target_role"),
    "ai_summary": skill_gap.get("summary", ""),   # ← renamed key
    "summary": {                                   # ← stats object stays
        "total_skills": total,
        "completed": completed,
        "learning": learning,
        "not_started": not_started,
        "completion_percent": completion_percent,
        "total_estimated_days": skill_gap.get("total_estimated_days", 0)
    },
    "skills": skills_report,
    "last_updated": profile_doc.get("progress_updated_at")
}


@router.post("/update")
async def update_progress(user_id: str, body: SkillUpdateRequest):
    """Update status of a single skill."""
    allowed = ["not_started", "learning", "completed"]
    if body.status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {allowed}"
        )

    profile_doc = await profiles_collection.find_one({"user_id": user_id})
    if not profile_doc:
        raise HTTPException(status_code=404, detail="No profile found for this user.")

    if not profile_doc.get("skill_gap"):
        raise HTTPException(
            status_code=404,
            detail="No skill gap found. Run GET /skills/gap first."
        )

    # Update just this skill's status
    await profiles_collection.update_one(
        {"user_id": user_id},
        {"$set": {
            f"progress.{body.skill}": body.status,
            "progress_updated_at": datetime.utcnow()
        }}
    )

    return {
        "success": True,
        "user_id": user_id,
        "skill": body.skill,
        "status": body.status,
        "message": f"'{body.skill}' marked as {body.status}"
    }


@router.post("/reset")
async def reset_progress(user_id: str):
    """Reset all progress back to not_started."""
    profile_doc = await profiles_collection.find_one({"user_id": user_id})
    if not profile_doc:
        raise HTTPException(status_code=404, detail="No profile found.")

    await profiles_collection.update_one(
        {"user_id": user_id},
        {"$set": {
            "progress": {},
            "progress_updated_at": datetime.utcnow()
        }}
    )

    return {
        "success": True,
        "user_id": user_id,
        "message": "Progress reset successfully."
    }
