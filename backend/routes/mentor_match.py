import os
from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from qdrant_client import QdrantClient
from openai import OpenAI
from bson import ObjectId

router = APIRouter()

# Clients
mongo_client = AsyncIOMotorClient(os.environ.get("MONGODB_URI"))
db = mongo_client[os.environ.get("MONGODB_DB_NAME", "s3_dashboard")]
users_collection = db["users"]

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
    """Convert student aiProfile into text for Qdrant search."""
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
    """Use GPT-4o to explain why this mentor matches the student."""
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


@router.get("/mentors/match")
async def match_mentors(user_id: str):
    # Step 1 — Fetch student from MongoDB
    try:
        student = await users_collection.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id format")

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if student.get("role") != "student":
        raise HTTPException(status_code=400, detail="User is not a student")

    # Step 2 — Get student's aiProfile
    ai_profile = student.get("aiProfile", {})
    if not ai_profile or not ai_profile.get("skills"):
        raise HTTPException(
            status_code=400,
            detail="Student aiProfile is empty. Please complete resume parsing first."
        )

    # Step 3 — Embed student query
    query_text = build_student_query_text(ai_profile)
    query_vector = get_embedding(query_text)

    # Step 4 — Search Qdrant for top 5 mentors
    search_results = qdrant.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_vector,
        limit=5,
        with_payload=True
    )

    if not search_results:
        raise HTTPException(status_code=404, detail="No mentors found")

    # Step 5 — Build response with GPT-4o explanations
    matched_mentors = []
    for result in search_results:
        mentor_data = result.payload
        explanation = explain_mentor_match(ai_profile, mentor_data)

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
            "match_score": round(result.score * 100, 1),  # e.g. 87.3%
            "why_match": explanation
        })

    return {
        "student_id": user_id,
        "student_name": student.get("name"),
        "total_matches": len(matched_mentors),
        "mentors": matched_mentors
    }