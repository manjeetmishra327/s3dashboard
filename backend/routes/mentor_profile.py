from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
from database.mongo import (
    save_mentor_profile, get_mentor_profile,
    save_session_request, get_sessions_for_mentor,
    get_sessions_for_student, update_session_status
)
import os
import base64
import httpx
from qdrant_client import QdrantClient
from openai import OpenAI
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/mentor", tags=["Mentor Profile"])

# ── Clients ───────────────────────────────────────────
_mongo = AsyncIOMotorClient(os.environ.get("MONGODB_URI"))
_db = _mongo[os.environ.get("MONGODB_DB_NAME", "s3_dashboard")]
_sessions = _db["sessions"]

qdrant = QdrantClient(
    url=os.environ.get("QDRANT_URL"),
    api_key=os.environ.get("QDRANT_API_KEY")
)
openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# ── Cloudinary config ─────────────────────────────────
CLOUDINARY_CLOUD = os.environ.get("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET")


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


# ── Models ────────────────────────────────────────────
class MentorProfileSetup(BaseModel):
    name: str
    domain: str
    skills: List[str]
    expertise: List[str]
    current_role: str
    current_company: str
    years_experience: int
    bio: str
    availability: List[dict]
    # Social + photo fields
    linkedin: Optional[str] = None
    twitter: Optional[str] = None
    github: Optional[str] = None
    website: Optional[str] = None
    photo: Optional[str] = None  # Cloudinary URL


class SessionRequest(BaseModel):
    mentor_id: str
    mentor_user_id: Optional[str] = None
    mentor_name: str
    student_id: str
    student_name: str
    day: str
    time_slot: str
    topic: str
    student_profile: Optional[dict] = None


class SessionResponse(BaseModel):
    session_id: str
    status: str
    meeting_link: Optional[str] = None


# ── Upload photo to Cloudinary ────────────────────────
@router.post("/upload-photo")
async def upload_photo(
    user_id: str = Query(...),
    file: UploadFile = File(...)
):
    if not CLOUDINARY_CLOUD:
        raise HTTPException(500, "Cloudinary not configured. Add CLOUDINARY_CLOUD_NAME to .env")

    allowed = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed:
        raise HTTPException(400, "Only JPG, PNG, or WebP images allowed")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(400, "Image too large. Max 5MB.")

    # Encode to base64 data URI
    b64 = base64.b64encode(contents).decode()
    data_uri = f"data:{file.content_type};base64,{b64}"

    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD}/image/upload",
            data={
                "file": data_uri,
                "upload_preset": "mentor_photos",
                "public_id": f"mentor_{user_id}",
                "overwrite": "true",
            },
            auth=(CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET),
            timeout=30
        )

    if res.status_code != 200:
        print(f"[Cloudinary] Upload failed: {res.text}")
        raise HTTPException(500, f"Cloudinary upload failed: {res.text}")

    photo_url = res.json().get("secure_url")
    print(f"[Mentor] Photo uploaded for user {user_id}: {photo_url}")
    return {"success": True, "photo_url": photo_url}


# ── Setup / update mentor profile ────────────────────
@router.post("/setup")
async def setup_mentor_profile(
    user_id: str = Query(...),
    profile: MentorProfileSetup = None
):
    data = profile.dict()
    data["is_active"] = True
    await save_mentor_profile(user_id, data)
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
    session_data = req.dict()
    if not session_data.get("mentor_user_id"):
        session_data["mentor_user_id"] = session_data["mentor_id"]
    session_id = await save_session_request(session_data)
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
    status: str = Query(...),
    meeting_link: Optional[str] = Query(None)
):
    if status not in ["accepted", "declined"]:
        raise HTTPException(400, "Status must be accepted or declined")
    await update_session_status(session_id, status, meeting_link)
    return {"success": True, "status": status}


# ── Cancel a session (student OR mentor) ─────────────
@router.delete("/session/cancel")
async def cancel_session(
    session_id: str = Query(...),
    user_id: str = Query(...),
):
    try:
        obj_id = ObjectId(session_id)
    except Exception:
        raise HTTPException(400, "Invalid session_id format")

    session = await _sessions.find_one({"_id": obj_id})
    if not session:
        raise HTTPException(404, "Session not found")

    # Verify requester is part of this session
    if (
        str(session.get("student_id")) != user_id and
        str(session.get("mentor_id")) != user_id and
        str(session.get("mentor_user_id")) != user_id
    ):
        raise HTTPException(403, "Not authorized to cancel this session")

    if session.get("status") == "declined":
        raise HTTPException(400, "Session is already declined")

    if session.get("status") == "cancelled":
        raise HTTPException(400, "Session is already cancelled")

    await _sessions.update_one(
        {"_id": obj_id},
        {"$set": {
            "status": "cancelled",
            "cancelled_by": user_id,
            "cancelled_at": datetime.utcnow()
        }}
    )

    return {"success": True, "message": "Session cancelled"}