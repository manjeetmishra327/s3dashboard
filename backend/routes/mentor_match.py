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
mentor_profiles_collection = db["mentor_profiles"]  # ← cross-check source

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


# ── FAST: reads saved results from MongoDB, no agent runs ──────────────
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
    # 1. Load student profile
    student_doc = await ai_profiles_collection.find_one({"user_id": user_id})
    if not student_doc:
        raise HTTPException(status_code=404, detail=f"No profile found for user_id: {user_id}.")

    ai_profile = student_doc.get("profile", {})
    if not ai_profile or not ai_profile.get("skills"):
        raise HTTPException(status_code=400, detail="No skills found. Upload resume first.")

    # 2. Load ALL active real mentors from MongoDB
    active_mentors_cursor = mentor_profiles_collection.find({"is_active": True})
    active_mentors = await active_mentors_cursor.to_list(length=100)

    if not active_mentors:
        raise HTTPException(
            status_code=404,
            detail="No mentors are available yet. Check back soon!"
        )

    print(f"[Mentor Match] Found {len(active_mentors)} active mentors in MongoDB")

    # Build a set of active mentor user_ids for fast lookup
    active_user_ids = {str(m.get("user_id")) for m in active_mentors}
    # Also build a lookup dict by user_id for merging fresh DB data
    active_mentor_map = {str(m.get("user_id")): m for m in active_mentors}

    # 3. Check if Qdrant mentors collection has any vectors
    try:
        collection_info = qdrant.get_collection(COLLECTION_NAME)
        total_vectors = collection_info.points_count
        print(f"[Mentor Match] Qdrant mentors collection has {total_vectors} vectors")
    except Exception:
        total_vectors = 0

    matched_mentors = []

    if total_vectors == 0:
        # No vectors in Qdrant — fall back to returning active MongoDB mentors directly
        print("[Mentor Match] No Qdrant vectors — using MongoDB mentors directly")
        for mentor_data in active_mentors[:5]:
            try:
                explanation = explain_mentor_match(ai_profile, mentor_data)
            except Exception:
                explanation = "Great match based on your profile and career goals."
            matched_mentors.append({
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
                "match_score": 75,
                "why_match": explanation,
                "mongo_id": str(mentor_data.get("user_id")),
            })
    else:
        # 4. Vector search in Qdrant
        query_text = build_student_query_text(ai_profile)
        query_vector = get_embedding(query_text)

        search_results = qdrant.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_vector,
            limit=20,  # fetch more so we have enough after filtering
            with_payload=True
        )

        if not search_results:
            raise HTTPException(status_code=404, detail="No mentors found in Qdrant.")

        print(f"[Mentor Match] Qdrant returned {len(search_results)} results before filtering")

        # 5. FILTER — only keep mentors that exist AND are active in MongoDB
        for result in search_results:
            mentor_data = result.payload
            qdrant_user_id = str(mentor_data.get("user_id", ""))
            qdrant_email = str(mentor_data.get("email", ""))

            # Cross-check by user_id first, then email as fallback
            real_mentor = None
            if qdrant_user_id in active_mentor_map:
                real_mentor = active_mentor_map[qdrant_user_id]
            else:
                # Try matching by email
                for m in active_mentors:
                    if str(m.get("email", "")) == qdrant_email:
                        real_mentor = m
                        break

            if not real_mentor:
                print(f"[Mentor Match] Skipping '{mentor_data.get('name')}' — not found or inactive in MongoDB")
                continue

            # Use fresh data from MongoDB (not stale Qdrant payload)
            try:
                explanation = explain_mentor_match(ai_profile, real_mentor)
            except Exception:
                explanation = "Great match based on your profile and career goals."

            matched_mentors.append({
                "name": real_mentor.get("name"),
                "email": real_mentor.get("email"),
                "domain": real_mentor.get("domain"),
                "skills": real_mentor.get("skills", []),
                "expertise": real_mentor.get("expertise", []),
                "current_role": real_mentor.get("current_role"),
                "current_company": real_mentor.get("current_company"),
                "years_experience": real_mentor.get("years_experience"),
                "linkedin": real_mentor.get("linkedin"),
                "bio": real_mentor.get("bio"),
                "availability": real_mentor.get("availability", []),
                "match_score": round(result.score * 100, 1),
                "why_match": explanation,
                "mongo_id": str(real_mentor.get("user_id")),
            })

            if len(matched_mentors) >= 5:
                break  # max 5 matches

    if not matched_mentors:
        raise HTTPException(
            status_code=404,
            detail="No active mentors match your profile yet. Check back soon!"
        )

    print(f"[Mentor Match] Returning {len(matched_mentors)} verified real mentors")

    # 6. Save to MongoDB cache
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