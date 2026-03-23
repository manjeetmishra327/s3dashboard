from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from database.mongo import (
    save_mentor_profile, get_mentor_profile,
    save_session_request, get_sessions_for_mentor,
    get_sessions_for_student, update_session_status
)
import os
from qdrant_client import QdrantClient
from openai import OpenAI

router = APIRouter(prefix="/mentor", tags=["Mentor Profile"])

qdrant = QdrantClient(
    url=os.environ.get("QDRANT_URL"),
    api_key=os.environ.get("QDRANT_API_KEY")
)
openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def get_embedding(text: str) -> list:
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

def embed_mentor_to_qdrant(user_id: str, profile: dict):
    text = f"""
    Name: {profile.get('name')}
    Domain: {profile.get('domain')}
    Skills: {', '.join(profile.get('skills', []))}
    Expertise: {', '.join(profile.get('expertise', []))}
    Role: {profile.get('current_role')} at {profile.get('current_company')}
    Bio: {profile.get('bio')}
    Years: {profile.get('years_experience')}
    """
    vector = get_embedding(text)
    from qdrant_client.models import PointStruct
    qdrant.upsert(
        collection_name="mentors",
        points=[PointStruct(
            id=abs(hash(user_id)) % (2**32),
            vector=vector,
            payload={**profile, "user_id": user_id}
        )]
    )

class MentorProfileSetup(BaseModel):
    name: str
    domain: str
    skills: List[str]
    expertise: List[str]
    current_role: str
    current_company: str
    years_experience: int
    bio: str
    availability: List[dict]  # [{day: "Monday", slots: ["10:00", "14:00"]}]

class SessionRequest(BaseModel):
    mentor_id: str
    mentor_name: str
    student_id: str
    student_name: str
    day: str
    time_slot: str
    topic: str

class SessionResponse(BaseModel):
    session_id: str
    status: str
    meeting_link: Optional[str] = None

# ── Setup mentor profile ──────────────────────────────
@router.post("/setup")
async def setup_mentor_profile(
    user_id: str = Query(...),
    profile: MentorProfileSetup = None
):
    data = profile.dict()
    data["is_active"] = True
    await save_mentor_profile(user_id, data)
    # Embed into Qdrant so students can match
    try:
        embed_mentor_to_qdrant(user_id, data)
        print(f"[Mentor] Embedded {data['name']} into Qdrant")
    except Exception as e:
        print(f"[Mentor] Qdrant embed failed: {e}")
    return {"success": True, "message": "Profile saved and embedded"}

# ── Get mentor profile ────────────────────────────────
@router.get("/profile")
async def get_profile(user_id: str = Query(...)):
    profile = await get_mentor_profile(user_id)
    if not profile:
        raise HTTPException(404, "No mentor profile found")
    return profile

# ── Book a session (student → mentor) ────────────────
@router.post("/session/request")
async def request_session(req: SessionRequest):
    session_id = await save_session_request(req.dict())
    return {"success": True, "session_id": session_id}

# ── Get sessions for mentor ───────────────────────────
@router.get("/sessions/incoming")
async def get_incoming_sessions(mentor_id: str = Query(...)):
    sessions = await get_sessions_for_mentor(mentor_id)
    return {"sessions": sessions}

# ── Get sessions for student ──────────────────────────
@router.get("/sessions/my")
async def get_my_sessions(student_id: str = Query(...)):
    sessions = await get_sessions_for_student(student_id)
    return {"sessions": sessions}

# ── Accept / decline session ──────────────────────────
@router.post("/session/respond")
async def respond_to_session(
    session_id: str = Query(...),
    status: str = Query(...),  # "accepted" or "declined"
    meeting_link: Optional[str] = Query(None)
):
    if status not in ["accepted", "declined"]:
        raise HTTPException(400, "Status must be accepted or declined")
    await update_session_status(session_id, status, meeting_link)
    return {"success": True, "status": status}