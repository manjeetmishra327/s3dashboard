import os
import shutil

# ============================================
# FIX mongo.py
# ============================================
mongo_code = """import os
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
"""

path = os.path.join("database", "mongo.py")
if os.path.exists(path):
    os.remove(path)
with open(path, "wb") as f:
    f.write(mongo_code.encode("utf-8"))
with open(path, "rb") as f:
    data = f.read()
    print("mongo.py:", "CLEAN" if b"\x00" not in data else "CORRUPTED")

# ============================================
# FIX jsearch.py
# ============================================
jsearch_code = """import os
import httpx

RAPIDAPI_KEY = os.environ.get("RAPIDAPI_KEY")

async def fetch_jobs_jsearch(keywords, location="India"):
    jobs = []
    try:
        print("[JSearch] Fetching:", keywords)
        print("[JSearch] Key:", "OK" if RAPIDAPI_KEY else "MISSING")
        if not RAPIDAPI_KEY:
            raise ValueError("RAPIDAPI_KEY not found")
        url = "https://jsearch.p.rapidapi.com/search"
        headers = {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
        }
        params = {
            "query": keywords + " in " + location,
            "page": "1",
            "num_pages": "3",
            "date_posted": "all",
            "employment_types": "FULLTIME,PARTTIME,INTERN,CONTRACTOR"
        }
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url, headers=headers, params=params)
        if response.status_code != 200:
            print("[JSearch] API error:", response.status_code)
            return []
        raw_jobs = response.json().get("data", [])
        print("[JSearch] Raw jobs from API:", len(raw_jobs))
        for job in raw_jobs:
            q = job.get("job_highlights", {}).get("Qualifications", [])
            city = job.get("job_city") or ""
            country = job.get("job_country") or ""
            min_sal = job.get("job_min_salary") or "Not"
            max_sal = job.get("job_max_salary") or "disclosed"
            formatted = {
                "title": (job.get("job_title") or "").strip(),
                "company": (job.get("employer_name") or "").strip(),
                "location": (city + " " + country).strip(),
                "salary": str(min_sal) + " - " + str(max_sal),
                "employment_type": job.get("job_employment_type") or "",
                "description": (job.get("job_description") or "")[:600],
                "skills_required": q[:8],
                "url": job.get("job_apply_link") or "",
                "source": job.get("job_publisher") or "jsearch",
                "is_remote": job.get("job_is_remote") or False,
                "posted_at": job.get("job_posted_at_datetime_utc") or "",
            }
            if formatted["title"]:
                jobs.append(formatted)
        print("[JSearch] Done:", len(jobs), "jobs")
    except Exception as e:
        print("[JSearch] Error:", e)
    return jobs
"""

path = os.path.join("scrapers", "jsearch.py")
if os.path.exists(path):
    os.remove(path)
with open(path, "wb") as f:
    f.write(jsearch_code.encode("utf-8"))
with open(path, "rb") as f:
    data = f.read()
    print("jsearch.py:", "CLEAN" if b"\x00" not in data else "CORRUPTED")

# ============================================
# FIX ALL __init__.py files
# ============================================
for folder in ["scrapers", "routes", "database", "agents", "chains", "utils"]:
    init = os.path.join(folder, "__init__.py")
    if os.path.exists(init):
        os.remove(init)
    with open(init, "wb") as f:
        f.write(b"")
    print(f"{folder}/__init__.py: FIXED")

# ============================================
# CLEAR ALL pycache
# ============================================
for root, dirs, files in os.walk("."):
    for d in dirs:
        if d == "__pycache__":
            shutil.rmtree(os.path.join(root, d))
print("pycache: CLEARED")
print("\nAll done! Now run: python run.py")