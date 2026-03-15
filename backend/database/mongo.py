import os
from datetime import datetime

MONGODB_URI = os.environ.get("MONGODB_URI")
MONGODB_DB_NAME = os.environ.get("MONGODB_DB_NAME", "s3_dashboard")

print("[MongoDB] URI:", "OK" if MONGODB_URI else "NOT FOUND")

from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(MONGODB_URI)
db = client[MONGODB_DB_NAME]

profiles_collection = db["ai_profiles"]
jobs_collection = db["jobs"]


async def save_ai_profile(user_id, profile):
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
        raise Exception("MongoDB save failed: " + str(e))


async def get_ai_profile(user_id):
    try:
        result = await profiles_collection.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
        return result
    except Exception as e:
        raise Exception("MongoDB fetch failed: " + str(e))


async def get_all_user_ids():
    try:
        cursor = profiles_collection.find({}, {"user_id": 1, "_id": 0})
        docs = await cursor.to_list(length=1000)
        return [d["user_id"] for d in docs]
    except Exception as e:
        raise Exception("Fetch all users failed: " + str(e))


async def save_jobs(user_id, jobs):
    try:
        if not jobs:
            return True
        await jobs_collection.delete_many({"user_id": user_id})
        for job in jobs:
            job["user_id"] = user_id
            job["saved_at"] = datetime.utcnow()
        await jobs_collection.insert_many(jobs)
        print("[MongoDB] Saved", len(jobs), "jobs for user:", user_id)
        return True
    except Exception as e:
        raise Exception("Jobs save failed: " + str(e))


async def get_jobs(user_id):
    try:
        cursor = jobs_collection.find(
            {"user_id": user_id},
            {"_id": 0}
        )
        return await cursor.to_list(length=200)
    except Exception as e:
        raise Exception("Jobs fetch failed: " + str(e))


async def delete_jobs(user_id):
    try:
        await jobs_collection.delete_many({"user_id": user_id})
        return True
    except Exception as e:
        raise Exception("Jobs delete failed: " + str(e))
