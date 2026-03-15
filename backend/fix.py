import os

code = """import os
import httpx


def _read_env():
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env')
    vals = {}
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if '=' in line and not line.startswith('#'):
                k, v = line.split('=', 1)
                vals[k.strip()] = v.strip()
    return vals


ENV = _read_env()
RAPIDAPI_KEY = ENV.get("RAPIDAPI_KEY")


async def fetch_jobs_jsearch(keywords, location="India"):
    jobs = []
    try:
        print("[JSearch] Fetching:", keywords)
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
            "num_pages": "2",
            "date_posted": "month"
        }
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url, headers=headers, params=params)
        if response.status_code != 200:
            return []
        raw_jobs = response.json().get("data", [])
        for job in raw_jobs:
            q = job.get("job_highlights", {}).get("Qualifications", [])
            formatted = {
                "title": job.get("job_title", "").strip(),
                "company": job.get("employer_name", "").strip(),
                "location": job.get("job_city", "") + " " + job.get("job_country", ""),
                "salary": str(job.get("job_min_salary", "Not")) + " - " + str(job.get("job_max_salary", "disclosed")),
                "employment_type": job.get("job_employment_type", ""),
                "description": job.get("job_description", "")[:600],
                "skills_required": q[:8],
                "url": job.get("job_apply_link", ""),
                "source": job.get("job_publisher", "jsearch"),
                "is_remote": job.get("job_is_remote", False),
                "posted_at": job.get("job_posted_at_datetime_utc", ""),
            }
            if formatted["title"]:
                jobs.append(formatted)
        print("[JSearch] Done:", len(jobs), "jobs")
    except Exception as e:
        print("[JSearch] Error:", e)
    return jobs
"""

# Fix jsearch.py
path = os.path.join("scrapers", "jsearch.py")
if os.path.exists(path):
    os.remove(path)
with open(path, "w", encoding="utf-8") as f:
    f.write(code)
with open(path, "rb") as f:
    data = f.read()
    if b"\x00" in data:
        print("FAILED - jsearch.py corrupted")
    else:
        print("SUCCESS - jsearch.py clean!")
# Verify RAPIDAPI_KEY loads
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
with open(env_path) as f:
    for line in f:
        if 'RAPIDAPI_KEY' in line:
            print("RAPIDAPI_KEY found in .env:", line.strip()[:30])
# Fix scrapers/__init__.py
init_path = os.path.join("scrapers", "__init__.py")
if os.path.exists(init_path):
    os.remove(init_path)
with open(init_path, "w", encoding="utf-8") as f:
    f.write("")
print("SUCCESS - scrapers/__init__.py fixed!")

# Fix routes/__init__.py
routes_init = os.path.join("routes", "__init__.py")
if os.path.exists(routes_init):
    os.remove(routes_init)
with open(routes_init, "w", encoding="utf-8") as f:
    f.write("")
print("SUCCESS - routes/__init__.py fixed!")

# Clear all pycache
import shutil
for root, dirs, files in os.walk("."):
    for d in dirs:
        if d == "__pycache__":
            shutil.rmtree(os.path.join(root, d))
print("SUCCESS - all pycache cleared!")