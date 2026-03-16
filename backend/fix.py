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
# FIX vectorstore/qdrant_client.py (UUID FIX)
# ============================================
qdrant_code = """import os
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from openai import OpenAI
import uuid

QDRANT_URL = os.environ.get("QDRANT_URL")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

print("[Qdrant] URL:", "OK" if QDRANT_URL else "MISSING")
print("[Qdrant] Key:", "OK" if QDRANT_API_KEY else "MISSING")

qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
openai_client = OpenAI(api_key=OPENAI_API_KEY)

JOBS_COLLECTION = "jobs"
PROFILES_COLLECTION = "profiles"
VECTOR_SIZE = 1536


def get_embedding(text):
    text = text.strip().replace("\\n", " ")
    response = openai_client.embeddings.create(
        input=[text],
        model="text-embedding-3-small"
    )
    return response.data[0].embedding


def ensure_collection(name):
    existing = [c.name for c in qdrant.get_collections().collections]
    if name not in existing:
        qdrant.create_collection(
            collection_name=name,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE)
        )
        print("[Qdrant] Created collection:", name)
    else:
        print("[Qdrant] Collection exists:", name)


def embed_and_store_jobs(jobs, user_id):
    ensure_collection(JOBS_COLLECTION)
    points = []
    for job in jobs:
        job_text = (
            "Title: " + job.get("title", "") + " " +
            "Company: " + job.get("company", "") + " " +
            "Location: " + job.get("location", "") + " " +
            "Description: " + job.get("description", "") + " " +
            "Skills: " + ", ".join(job.get("skills_required", []))
        )
        vector = get_embedding(job_text)
        points.append(PointStruct(
            id=str(uuid.uuid4()),
            vector=vector,
            payload={
                "user_id": user_id,
                "title": job.get("title", ""),
                "company": job.get("company", ""),
                "location": job.get("location", ""),
                "salary": job.get("salary", ""),
                "url": job.get("url", ""),
                "source": job.get("source", ""),
                "description": job.get("description", ""),
                "skills_required": job.get("skills_required", []),
                "employment_type": job.get("employment_type", ""),
                "is_remote": job.get("is_remote", False),
            }
        ))
    qdrant.upsert(collection_name=JOBS_COLLECTION, points=points)
    print("[Qdrant] Embedded", len(points), "jobs for user:", user_id)


def embed_user_profile(profile, user_id):
    ensure_collection(PROFILES_COLLECTION)
    profile_text = (
        "Name: " + profile.get("name", "") + " " +
        "Domain: " + profile.get("domain", "") + " " +
        "Target Role: " + profile.get("target_role", "") + " " +
        "Experience: " + profile.get("experience_level", "") + " " +
        "Skills: " + ", ".join(profile.get("skills", [])) + " " +
        "Frameworks: " + ", ".join(profile.get("frameworks", [])) + " " +
        "Tools: " + ", ".join(profile.get("tools", []))
    )
    vector = get_embedding(profile_text)
    qdrant.upsert(
        collection_name=PROFILES_COLLECTION,
        points=[PointStruct(
            id=str(uuid.uuid5(uuid.NAMESPACE_DNS, user_id)),
            vector=vector,
            payload={
                "user_id": user_id,
                "name": profile.get("name", ""),
                "domain": profile.get("domain", ""),
                "target_role": profile.get("target_role", ""),
                "skills": profile.get("skills", []),
                "experience_level": profile.get("experience_level", "")
            }
        )]
    )
    print("[Qdrant] Embedded profile for user:", user_id)


def search_matching_jobs(user_id, profile, top_k=10):
    ensure_collection(JOBS_COLLECTION)
    profile_text = (
        "Domain: " + profile.get("domain", "") + " " +
        "Target Role: " + profile.get("target_role", "") + " " +
        "Skills: " + ", ".join(profile.get("skills", [])) + " " +
        "Experience: " + profile.get("experience_level", "")
    )
    query_vector = get_embedding(profile_text)
    results = qdrant.search(
        collection_name=JOBS_COLLECTION,
        query_vector=query_vector,
        query_filter={
            "must": [{"key": "user_id", "match": {"value": user_id}}]
        },
        limit=top_k,
        with_payload=True
    )
    matches = []
    for result in results:
        job = result.payload
        job["similarity_score"] = round(result.score * 100, 1)
        matches.append(job)
    print("[Qdrant] Found", len(matches), "matches for user:", user_id)
    return matches
"""

os.makedirs("vectorstore", exist_ok=True)
path = os.path.join("vectorstore", "qdrant_client.py")
if os.path.exists(path):
    os.remove(path)
with open(path, "wb") as f:
    f.write(qdrant_code.encode("utf-8"))
with open(path, "rb") as f:
    data = f.read()
    print("vectorstore/qdrant_client.py:", "CLEAN" if b"\x00" not in data else "CORRUPTED")

# ============================================
# FIX agents/job_matching_agent.py
# ============================================
job_matching_code = """import os
import json
from vectorstore.qdrant_client import embed_and_store_jobs, embed_user_profile, search_matching_jobs
from database.mongo import get_ai_profile, get_jobs
from openai import OpenAI

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
openai_client = OpenAI(api_key=OPENAI_API_KEY)

async def run_job_matching_agent(user_id):
    print("[Job Matching Agent] Starting for user:", user_id)
    try:
        profile_doc = await get_ai_profile(user_id)
        if not profile_doc:
            return {"success": False, "error": "No profile found"}
        profile = profile_doc.get("profile", {})
        print("[Job Matching Agent] Profile loaded:", profile.get("name"))

        jobs = await get_jobs(user_id)
        if not jobs:
            return {"success": False, "error": "No jobs found. Run scraper first."}
        print("[Job Matching Agent] Jobs loaded:", len(jobs))

        print("[Job Matching Agent] Embedding jobs into Qdrant...")
        embed_and_store_jobs(jobs, user_id)

        print("[Job Matching Agent] Embedding profile into Qdrant...")
        embed_user_profile(profile, user_id)

        print("[Job Matching Agent] Searching for matches...")
        matches = search_matching_jobs(user_id, profile, top_k=10)

        print("[Job Matching Agent] GPT-4o explaining matches...")
        enriched = explain_matches(profile, matches)

        print("[Job Matching Agent] Done. Matches:", len(enriched))
        return {
            "success": True,
            "total_jobs_scanned": len(jobs),
            "matches": enriched
        }

    except Exception as e:
        print("[Job Matching Agent] Error:", e)
        return {"success": False, "error": str(e)}


def explain_matches(profile, matches):
    prompt = (
        "You are a career advisor AI.\\n"
        "User Profile:\\n"
        "- Name: " + profile.get("name", "") + "\\n"
        "- Domain: " + profile.get("domain", "") + "\\n"
        "- Target Role: " + profile.get("target_role", "") + "\\n"
        "- Experience: " + profile.get("experience_level", "") + "\\n"
        "- Skills: " + ", ".join(profile.get("skills", [])[:15]) + "\\n\\n"
        "Job Matches:\\n" + json.dumps([{
            "index": i,
            "title": m.get("title"),
            "company": m.get("company"),
            "skills_required": m.get("skills_required", []),
            "similarity_score": m.get("similarity_score")
        } for i, m in enumerate(matches)], indent=2) + "\\n\\n"
        "For each job return a JSON array:\\n"
        "[{\\n"
        "  \\"index\\": number,\\n"
        "  \\"match_score\\": number 0-100,\\n"
        "  \\"why_this_fits\\": \\"2 sentence explanation\\",\\n"
        "  \\"skill_overlap\\": [\\"skill1\\", \\"skill2\\"],\\n"
        "  \\"missing_skills\\": [\\"skill1\\"],\\n"
        "  \\"skill_overlap_percent\\": number\\n"
        "}]\\n"
        "Return ONLY the JSON array, no extra text."
    )
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )
    try:
        explanations = json.loads(response.choices[0].message.content)
        for match in matches:
            idx = matches.index(match)
            explanation = next((e for e in explanations if e.get("index") == idx), {})
            match["match_score"] = explanation.get("match_score", match.get("similarity_score", 0))
            match["why_this_fits"] = explanation.get("why_this_fits", "")
            match["skill_overlap"] = explanation.get("skill_overlap", [])
            match["missing_skills"] = explanation.get("missing_skills", [])
            match["skill_overlap_percent"] = explanation.get("skill_overlap_percent", 0)
        return sorted(matches, key=lambda x: x.get("match_score", 0), reverse=True)
    except Exception as e:
        print("[Job Matching Agent] GPT-4o parse error:", e)
        return matches
"""

path = os.path.join("agents", "job_matching_agent.py")
if os.path.exists(path):
    os.remove(path)
with open(path, "wb") as f:
    f.write(job_matching_code.encode("utf-8"))
with open(path, "rb") as f:
    data = f.read()
    print("agents/job_matching_agent.py:", "CLEAN" if b"\x00" not in data else "CORRUPTED")

# ============================================
# FIX routes/jobs.py
# ============================================
jobs_route_code = """from fastapi import APIRouter, HTTPException, Query
from scrapers.jsearch import fetch_jobs_jsearch
from database.mongo import save_jobs, get_jobs, get_ai_profile
from agents.job_matching_agent import run_job_matching_agent

router = APIRouter(prefix="/jobs", tags=["Jobs"])

@router.get("/test-jsearch")
async def test_jsearch(keywords: str = Query(default="software developer")):
    jobs = await fetch_jobs_jsearch(keywords)
    return {"total": len(jobs), "sample": jobs[:2]}

@router.post("/scrape")
async def scrape_jobs(user_id: str = Query(...)):
    profile_doc = await get_ai_profile(user_id)
    if not profile_doc:
        raise HTTPException(404, "No profile found. Upload resume first.")
    profile = profile_doc.get("profile", {})
    keywords = profile.get("target_role") or profile.get("domain", "software developer")
    print("[Jobs] Scraping for:", keywords)
    jobs = await fetch_jobs_jsearch(keywords)
    if not jobs:
        raise HTTPException(500, "No jobs found")
    await save_jobs(user_id, jobs)
    return {
        "success": True,
        "total_jobs": len(jobs),
        "keywords_used": keywords,
        "message": "Scraped and saved " + str(len(jobs)) + " jobs"
    }

@router.get("/list")
async def list_jobs(user_id: str = Query(...)):
    jobs = await get_jobs(user_id)
    return {"total": len(jobs), "jobs": jobs}

@router.get("/match")
async def match_jobs(user_id: str = Query(...)):
    result = await run_job_matching_agent(user_id)
    if not result["success"]:
        raise HTTPException(500, result.get("error", "Matching failed"))
    return result

@router.post("/scrape-and-match")
async def scrape_and_match(user_id: str = Query(...)):
    profile_doc = await get_ai_profile(user_id)
    if not profile_doc:
        raise HTTPException(404, "No profile found. Upload resume first.")
    profile = profile_doc.get("profile", {})
    keywords = profile.get("target_role") or profile.get("domain", "software developer")
    jobs = await fetch_jobs_jsearch(keywords)
    if not jobs:
        raise HTTPException(500, "No jobs found")
    await save_jobs(user_id, jobs)
    result = await run_job_matching_agent(user_id)
    return {
        "success": True,
        "total_scraped": len(jobs),
        "matches": result.get("matches", [])
    }
"""

path = os.path.join("routes", "jobs.py")
if os.path.exists(path):
    os.remove(path)
with open(path, "wb") as f:
    f.write(jobs_route_code.encode("utf-8"))
with open(path, "rb") as f:
    data = f.read()
    print("routes/jobs.py:", "CLEAN" if b"\x00" not in data else "CORRUPTED")

# ============================================
# FIX ALL __init__.py files
# ============================================
for folder in ["scrapers", "routes", "database", "agents", "chains", "utils", "vectorstore"]:
    init = os.path.join(folder, "__init__.py")
    if os.path.exists(init):
        os.remove(init)
    with open(init, "wb") as f:
        f.write(b"")
    print(folder + "/__init__.py: FIXED")

# ============================================
# CLEAR ALL pycache
# ============================================
for root, dirs, files in os.walk("."):
    for d in dirs:
        if d == "__pycache__":
            shutil.rmtree(os.path.join(root, d))
print("pycache: CLEARED")
print("\nAll done! Now run: python run.py")