import os, asyncio

env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
with open(env_path) as f:
    for line in f:
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            os.environ[k.strip()] = v.strip()

from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient(os.environ.get("MONGODB_URI"))
db = client[os.environ.get("MONGODB_DB_NAME", "s3_dashboard")]

async def main():
    print("\n=== Checking 'users' collection ===")
    users = await db["users"].find({}).to_list(20)
    for u in users:
        print(f"  _id: {u['_id']} | role: {u.get('role')} | name: {u.get('name')} | hasAiProfile: {bool(u.get('aiProfile'))}")

    print("\n=== Checking 'ai_profiles' collection ===")
    profiles = await db["ai_profiles"].find({}).to_list(20)
    for p in profiles:
        print(f"  _id: {p['_id']} | user_id: {p.get('user_id')} | score: {p.get('ai_profile_score')}")

    print("\n=== All collections in DB ===")
    collections = await db.list_collection_names()
    for c in collections:
        print(f"  {c}")

asyncio.run(main())