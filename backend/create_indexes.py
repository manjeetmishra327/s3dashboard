import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def create_indexes():
    client = AsyncIOMotorClient(os.getenv("MONGODB_URI"))
    db = client[os.getenv("MONGODB_DB_NAME", "s3dashboard")]

    # interview_sessions indexes
    await db["interview_sessions"].create_index(
        [("user_id", 1), ("created_at", -1)]
    )
    await db["interview_sessions"].create_index(
        [("session_id", 1)], unique=True
    )
    print("✅ Indexes created successfully")
    client.close()

asyncio.run(create_indexes())