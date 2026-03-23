import os
from datetime import datetime

# Use os.environ directly (loaded by run.py)
MONGODB_URI = os.environ.get("MONGODB_URI")
MONGODB_DB_NAME = os.environ.get("MONGODB_DB_NAME", "s3_dashboard")

print(f"[MongoDB] URI loaded: {'OK' if MONGODB_URI else 'NOT FOUND'}")

from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(MONGODB_URI)
db = client[MONGODB_DB_NAME]

# Collections
profiles_collection = db["ai_profiles"]
jobs_collection = db["jobs"]
mentor_profiles_collection = db["mentor_profiles"]
sessions_collection = db["sessions"]


# ============================================
# PROFILE FUNCTIONS
# ============================================

async def save_ai_profile(user_id: str, profile: dict) -> bool:
    try:
        await profiles_collection.update_one(
            {"user_id": user_id},
            {"$set": {
                "user_id": user_id,
                "profile": profile,
                "ai_profile_score": profile.get("ai_profile_score", 0),
                "updated_at": datetime.utcnow()
            }},
            upsert=True
        )
        return True
    except Exception as e:
        raise Exception(f"MongoDB save failed: {str(e)}")


async def get_ai_profile(user_id: str) -> dict | None:
    try:
        result = await profiles_collection.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
        return result
    except Exception as e:
        raise Exception(f"MongoDB fetch failed: {str(e)}")


async def get_all_user_ids() -> list:
    try:
        cursor = profiles_collection.find({}, {"user_id": 1, "_id": 0})
        docs = await cursor.to_list(length=1000)
        return [d["user_id"] for d in docs]
    except Exception as e:
        raise Exception(f"MongoDB fetch all users failed: {str(e)}")


# ============================================
# JOBS FUNCTIONS
# ============================================

async def save_jobs(user_id: str, jobs: list) -> bool:
    try:
        if not jobs:
            return True
        await jobs_collection.delete_many({"user_id": user_id})
        for job in jobs:
            job["user_id"] = user_id
            job["saved_at"] = datetime.utcnow()
        await jobs_collection.insert_many(jobs)
        print(f"[MongoDB] Saved {len(jobs)} jobs for user: {user_id}")
        return True
    except Exception as e:
        raise Exception(f"Jobs save failed: {str(e)}")


async def get_jobs(user_id: str) -> list:
    try:
        cursor = jobs_collection.find(
            {"user_id": user_id},
            {"_id": 0}
        )
        return await cursor.to_list(length=200)
    except Exception as e:
        raise Exception(f"Jobs fetch failed: {str(e)}")


async def delete_jobs(user_id: str) -> bool:
    try:
        await jobs_collection.delete_many({"user_id": user_id})
        return True
    except Exception as e:
        raise Exception(f"Jobs delete failed: {str(e)}")


# ============================================
# MENTOR FUNCTIONS
# ============================================

async def save_mentor_profile(user_id: str, profile: dict) -> bool:
    try:
        await mentor_profiles_collection.update_one(
            {"user_id": user_id},
            {"$set": {
                "user_id": user_id,
                **profile,
                "updated_at": datetime.utcnow()
            }},
            upsert=True
        )
        return True
    except Exception as e:
        raise Exception(f"Mentor profile save failed: {str(e)}")


async def get_mentor_profile(user_id: str) -> dict | None:
    try:
        return await mentor_profiles_collection.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
    except Exception as e:
        raise Exception(f"Mentor profile fetch failed: {str(e)}")


async def get_all_mentor_profiles() -> list:
    try:
        cursor = mentor_profiles_collection.find(
            {"is_active": True},
            {"_id": 0}
        )
        return await cursor.to_list(length=100)
    except Exception as e:
        raise Exception(f"Mentor profiles fetch failed: {str(e)}")


# ============================================
# SESSION FUNCTIONS
# ============================================

async def save_session_request(session: dict) -> str:
    try:
        session["created_at"] = datetime.utcnow()
        session["status"] = "pending"
        result = await sessions_collection.insert_one(session)
        return str(result.inserted_id)
    except Exception as e:
        raise Exception(f"Session save failed: {str(e)}")


async def get_sessions_for_mentor(mentor_id: str) -> list:
    try:
        cursor = sessions_collection.find(
            {"mentor_id": mentor_id},
            {"_id": 0}
        )
        return await cursor.to_list(length=100)
    except Exception as e:
        raise Exception(f"Sessions fetch failed: {str(e)}")


async def get_sessions_for_student(student_id: str) -> list:
    try:
        cursor = sessions_collection.find(
            {"student_id": student_id},
            {"_id": 0}
        )
        return await cursor.to_list(length=100)
    except Exception as e:
        raise Exception(f"Sessions fetch failed: {str(e)}")


async def update_session_status(
    session_id: str,
    status: str,
    meeting_link: str = None
) -> bool:
    try:
        from bson import ObjectId
        update = {
            "status": status,
            "updated_at": datetime.utcnow()
        }
        if meeting_link:
            update["meeting_link"] = meeting_link
        await sessions_collection.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": update}
        )
        return True
    except Exception as e:
        raise Exception(f"Session update failed: {str(e)}")