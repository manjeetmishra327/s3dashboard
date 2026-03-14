from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

client = AsyncIOMotorClient(os.getenv("MONGODB_URI"))
db = client[os.getenv("MONGODB_DB_NAME", "s3_dashboard")]

profiles_collection = db["ai_profiles"]


async def save_ai_profile(user_id: str, profile: dict) -> bool:
    try:
        await profiles_collection.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "user_id": user_id,
                    "profile": profile,
                    "ai_profile_score": profile.get("ai_profile_score", 0),
                    "updated_at": datetime.utcnow(),
                }
            },
            upsert=True,
        )
        return True
    except Exception as e:
        raise Exception(f"MongoDB save failed: {str(e)}")


async def get_ai_profile(user_id: str) -> dict | None:
    try:
        result = await profiles_collection.find_one({"user_id": user_id}, {"_id": 0})
        return result
    except Exception as e:
        raise Exception(f"MongoDB fetch failed: {str(e)}")
