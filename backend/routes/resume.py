from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from agents.resume_agent import run_resume_agent
from database.mongo import get_ai_profile

router = APIRouter(prefix="/resume", tags=["Resume"])

ALLOWED_TYPES = ["application/pdf"]
MAX_SIZE = 5 * 1024 * 1024


@router.post("/parse")
async def parse_resume(
    file: UploadFile = File(...),
    user_id: str = Query(..., description="User ID from auth"),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Only PDF files are supported")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_SIZE:
        raise HTTPException(400, "File too large. Maximum size is 5MB")

    result = await run_resume_agent(file_bytes, user_id)

    if not result["success"]:
        raise HTTPException(500, result.get("error", "Parsing failed"))

    # ── Auto-ingest resume into RAG vector store ──────────────────────────────
    try:
        from vectorstore.chat_store import ingest_resume
        ingest_resume(user_id, result["profile"])
        print(f"[Resume] RAG ingestion complete for user: {user_id}")
    except Exception as e:
        print(f"[Resume] RAG ingestion failed (non-fatal): {e}")
    # ─────────────────────────────────────────────────────────────────────────

    return result


@router.get("/profile/{user_id}")
async def get_profile(user_id: str):
    profile = await get_ai_profile(user_id)
    if not profile:
        raise HTTPException(404, "No profile found. Please upload your resume first.")
    return profile


@router.get("/score/{user_id}")
async def get_score(user_id: str):
    profile = await get_ai_profile(user_id)
    if not profile:
        raise HTTPException(404, "No profile found")

    return {
        "score": profile.get("ai_profile_score", 0),
        "breakdown": profile.get("profile", {}).get("score_breakdown", {}),
    }