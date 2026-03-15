import os
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
