from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import jwt
import os
from agents.linkedin_optimizer_agent import run_linkedin_optimizer_agent, get_linkedin_history

router = APIRouter(prefix="/api/linkedin", tags=["LinkedIn Optimizer"])
security = HTTPBearer()


# ── Auth helper (same pattern as your other routes) ──────────────────────────
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, os.getenv("JWT_SECRET"), algorithms=["HS256"])
        user_id = payload.get("userId") or payload.get("user_id") or payload.get("sub") or payload.get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return str(user_id)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ── Request / Response models ─────────────────────────────────────────────────
class LinkedInOptimizeRequest(BaseModel):
    profile_text: str       # paste of full LinkedIn profile
    target_role: str        # e.g. "Senior Software Engineer at FAANG"


# ── Routes ───────────────────────────────────────────────────────────────────
@router.post("/optimize")
async def optimize_linkedin_profile(
    body: LinkedInOptimizeRequest,
    user_id: str = Depends(get_current_user),
):
    """
    Multi-pass LinkedIn optimizer:
    - Pass 1: Section scores (headline, about, experience, skills)
    - Pass 2: Keyword & ATS gap analysis
    - Pass 3: Full AI rewrite of every section
    """
    if not body.profile_text.strip():
        raise HTTPException(status_code=400, detail="Profile text cannot be empty")
    if len(body.profile_text) > 15000:
        raise HTTPException(status_code=400, detail="Profile text too long (max 15000 chars)")
    if not body.target_role.strip():
        raise HTTPException(status_code=400, detail="Target role is required")

    result = await run_linkedin_optimizer_agent(
        user_id=user_id,
        profile_text=body.profile_text,
        target_role=body.target_role,
    )

    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])

    return result["data"]


@router.get("/history")
async def get_optimization_history(user_id: str = Depends(get_current_user)):
    """Return last 5 optimization runs for the current user."""
    result = await get_linkedin_history(user_id)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    return result["data"]