import os
from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from qdrant_client import QdrantClient
from openai import OpenAI
from datetime import datetime

router = APIRouter()

mongo_client = AsyncIOMotorClient(os.environ.get("MONGODB_URI"))
db = mongo_client[os.environ.get("MONGODB_DB_NAME", "s3_dashboard")]
ai_profiles_collection = db["ai_profiles"]

qdrant = QdrantClient(
    url=os.environ.get("QDRANT_URL"),
    api_key=os.environ.get("QDRANT_API_KEY")
)
openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
COLLECTION_NAME = "mentors"


def get_embedding(text: str) -> list[float]:
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding


def build_student_query_text(ai_profile: dict) -> str:
    skills = ", ".join(ai_profile.get("skills", []))
    interests = ", ".join(ai_profile.get("interests", []))
    goals = ai_profile.get("career_goals", "")
    experience = ai_profile.get("experience_level", "")
    summary = ai_profile.get("summary", "")
    return f"""
    Student Summary: {summary}
    Skills: {skills}
    Interests: {interests}
    Career Goals: {goals}
    Experience Level: {experience}
    """.strip()


def explain_mentor_match(student_profile: dict, mentor: dict) -> str:
    prompt = f"""
You are a career mentor matching assistant.

Student Profile:
- Skills: {", ".join(student_profile.get("skills", []))}
- Career Goals: {student_profile.get("career_goals", "Not specified")}
- Experience Level: {student_profile.get("experience_level", "Fresher")}
- Interests: {", ".join(student_profile.get("interests", []))}

Mentor Profile:
- Name: {mentor["name"]}
- Domain: {mentor["domain"]}
- Skills: {", ".join(mentor["skills"])}
- Expertise: {", ".join(mentor["expertise"])}
- Current Role: {mentor["current_role"]} at {mentor["current_company"]}
- Years of Experience: {mentor["years_experience"]}
- Bio: {mentor["bio"]}

In 2-3 sentences, explain specifically why this mentor is a great match for this student.
Be specific about overlapping skills, domain alignment, and career growth potential.
Keep it encouraging and professional.
    """
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=150,
        temperature=0.7
    )
    return response.choices[0].message.content.strip()


# ── FAST: reads saved results from MongoDB ─────────────────────────────
@router.get("/mentors/cached")
async def get_cached_mentors(user_id: str):
    student_doc = await ai_profiles_collection.find_one({"user_id": user_id})
    if not student_doc:
        raise HTTPException(status_code=404, detail="No profile found.")

    cached = student_doc.get("mentor_matches")
    if not cached:
        raise HTTPException(
            status_code=404,
            detail="No mentor matches yet. Click 'Find Mentors' to run matching."
        )

    return {
        "user_id": user_id,
        "total_matches": len(cached),
        "mentors": cached,
        "cached_at": student_doc.get("mentor_matches_at")
    }


# ── SLOW: runs full Qdrant + GPT-4o agent, saves results ───────────────
@router.get("/mentors/match")
async def match_mentors(user_id: str):
    student_doc = await ai_profiles_collection.find_one({"user_id": user_id})
    if not student_doc:
        raise HTTPException(status_code=404, detail=f"No profile found for user_id: {user_id}.")

    ai_profile = student_doc.get("profile", {})
    if not ai_profile or not ai_profile.get("skills"):
        raise HTTPException(status_code=400, detail="No skills found. Upload resume first.")

    query_text = build_student_query_text(ai_profile)
    query_vector = get_embedding(query_text)

    search_results = qdrant.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_vector,
        limit=5,
        with_payload=True
    )
    if not search_results:
        raise HTTPException(status_code=404, detail="No mentors found in Qdrant.")

    matched_mentors = []
    for result in search_results:
        mentor_data = result.payload
        explanation = explain_mentor_match(ai_profile, mentor_data)
        matched_mentors.append({
            "mongo_id": mentor_data.get("mongo_id"),      # ← FIX: was missing
            "user_id": mentor_data.get("user_id", ""),    # ← FIX: was missing
            "name": mentor_data.get("name"),
            "email": mentor_data.get("email"),
            "domain": mentor_data.get("domain"),
            "skills": mentor_data.get("skills", []),
            "expertise": mentor_data.get("expertise", []),
            "current_role": mentor_data.get("current_role"),
            "current_company": mentor_data.get("current_company"),
            "years_experience": mentor_data.get("years_experience"),
            "linkedin": mentor_data.get("linkedin"),
            "bio": mentor_data.get("bio"),
            "availability": mentor_data.get("availability", []),
            "calendly_url": mentor_data.get("calendly_url", ""),  # ← for Phase 3
            "match_score": round(result.score * 100, 1),
            "why_match": explanation
        })

    # Save full results + count so dashboard + cached endpoint work instantly
    await ai_profiles_collection.update_one(
        {"user_id": user_id},
        {"$set": {
            "mentor_matches": matched_mentors,
            "mentor_count": len(matched_mentors),
            "mentor_matches_at": datetime.utcnow()
        }}
    )

    return {
        "user_id": user_id,
        "student_name": ai_profile.get("name", "Student"),
        "total_matches": len(matched_mentors),
        "mentors": matched_mentors
    }