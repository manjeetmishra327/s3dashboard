from fastapi import APIRouter, HTTPException
from agents.skill_gap_agent import run_skill_gap_agent
from database.mongo import get_ai_profile
from datetime import datetime

router = APIRouter(prefix="/skills", tags=["Skills"])


@router.get("/gap")
async def skill_gap(user_id: str):
    """Run skill gap analysis and save result."""
    result = await run_skill_gap_agent(user_id)

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error"))

    # Save skill gap result into ai_profiles collection
    from database.mongo import profiles_collection
    await profiles_collection.update_one(
        {"user_id": user_id},
        {"$set": {
            "skill_gap": result["data"],
            "skill_gap_updated_at": datetime.utcnow()
        }}
    )

    # ── Auto-ingest skill gaps into RAG vector store ──────────────────────────
    try:
        from vectorstore.chat_store import ingest_skill_gaps
        data = result["data"]
        # Handle both list and dict shapes from skill_gap_agent
        if isinstance(data, list):
            gaps_list = data
        else:
            gaps_list = (
                data.get("gaps")
                or data.get("skill_gaps")
                or data.get("skills")
                or []
            )
        ingest_skill_gaps(user_id, gaps_list)
        print(f"[Skills] RAG ingestion complete for user: {user_id}")
    except Exception as e:
        print(f"[Skills] RAG ingestion failed (non-fatal): {e}")
    # ─────────────────────────────────────────────────────────────────────────

    return {
        "success": True,
        "user_id": user_id,
        "data": result["data"]
    }


@router.get("/gap/result")
async def skill_gap_result(user_id: str):
    """Fetch saved skill gap result from MongoDB."""
    profile_doc = await get_ai_profile(user_id)

    if not profile_doc:
        raise HTTPException(status_code=404, detail="No profile found for this user.")

    skill_gap = profile_doc.get("skill_gap")
    if not skill_gap:
        raise HTTPException(
            status_code=404,
            detail="No skill gap analysis found. Run GET /skills/gap first."
        )

    return {
        "success": True,
        "user_id": user_id,
        "data": skill_gap,
        "last_updated": profile_doc.get("skill_gap_updated_at")
    }