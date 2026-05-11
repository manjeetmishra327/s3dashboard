import os
import httpx
import asyncio

RAPIDAPI_KEY = os.environ.get("RAPIDAPI_KEY")

def _detect_job_type(job: dict) -> str:
    emp_type = (job.get("employment_type") or "").upper()
    title    = (job.get("title") or "").lower()
    is_remote = job.get("is_remote", False)

    if emp_type == "INTERN" or any(w in title for w in ["intern", "internship", "trainee"]):
        return "internship"
    if is_remote or "remote" in title:
        return "remote"
    if emp_type in ("PARTTIME", "CONTRACTOR"):
        return emp_type.lower()
    return "fulltime"


def _normalize_job(job: dict, raw: dict) -> dict:
    q         = raw.get("job_highlights", {}).get("Qualifications", [])
    city      = raw.get("job_city") or ""
    country   = raw.get("job_country") or ""
    min_sal   = raw.get("job_min_salary") or "Not"
    max_sal   = raw.get("job_max_salary") or "disclosed"
    sal_curr  = raw.get("job_salary_currency") or ""
    sal_per   = raw.get("job_salary_period") or ""

    normalized = {
        "title":           (raw.get("job_title") or "").strip(),
        "company":         (raw.get("employer_name") or "").strip(),
        "location":        (city + " " + country).strip(),
        "salary":          f"{min_sal} - {max_sal} {sal_curr} {sal_per}".strip(),
        "employment_type": raw.get("job_employment_type") or "",
        "description":     (raw.get("job_description") or "")[:800],
        "skills_required": q[:10],
        "url":             raw.get("job_apply_link") or "",
        "source":          raw.get("job_publisher") or "jsearch",
        "is_remote":       raw.get("job_is_remote") or False,
        "posted_at":       raw.get("job_posted_at_datetime_utc") or "",
        "company_logo":    raw.get("employer_logo") or "",
        "experience_required": _extract_experience(raw),
    }
    normalized["job_type"] = _detect_job_type(normalized)
    return normalized


def _extract_experience(raw: dict) -> str:
    desc = (raw.get("job_description") or "").lower()
    for phrase in ["0-1 year", "0-2 year", "fresher", "entry level", "fresh graduate"]:
        if phrase in desc:
            return "entry"
    for phrase in ["1-3 year", "2-4 year", "1+ year", "2+ year"]:
        if phrase in desc:
            return "junior"
    for phrase in ["3-5 year", "4-6 year", "3+ year", "senior"]:
        if phrase in desc:
            return "senior"
    return "unspecified"


async def _fetch_one(client: httpx.AsyncClient, query: str, location: str,
                     headers: dict, employment_filter: str = None) -> list:
    url = "https://jsearch.p.rapidapi.com/search"
    params = {
        "query":            query + " in " + location,
        "page":             "1",
        "num_pages":        "1",
        "date_posted":      "all",
        "employment_types": employment_filter or "FULLTIME,PARTTIME,INTERN,CONTRACTOR",
        "job_requirements": "no_experience,under_3_years_experience",
    }
    try:
        resp = await client.get(url, headers=headers, params=params)
        if resp.status_code != 200:
            print(f"[JSearch] API error ({resp.status_code}) for: {query}")
            return []
        data = resp.json().get("data", [])
        print(f"[JSearch] '{query}': {len(data)} results")
        return data
    except Exception as e:
        print(f"[JSearch] Exception for '{query}':", e)
        return []


async def fetch_jobs_jsearch(keywords: str, location: str = "India") -> list:
    """
    Multi-query JSearch scraper.
    Runs 4 targeted queries in parallel:
      1. General role (fulltime + parttime)
      2. Internship/fresher variant
      3. Remote variant
      4. Location-specific (NCR/Gurugram focus for Indian market)

    Returns deduplicated, normalized job list with job_type tags.
    """
    all_jobs = []
    seen     = set()

    if not RAPIDAPI_KEY:
        print("[JSearch] RAPIDAPI_KEY missing!")
        return []

    headers = {
        "X-RapidAPI-Key":  RAPIDAPI_KEY,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    }

    # ── 4 parallel query buckets ─────────────────────────────────────────────
    queries = [
        (keywords,                          "FULLTIME,PARTTIME,CONTRACTOR", location),
        (keywords + " intern fresher",      "INTERN",                       location),
        (keywords + " remote work from home","FULLTIME,CONTRACTOR",         "India"),
        (keywords + " startup product",     "FULLTIME,PARTTIME",            "Gurugram Noida Bangalore"),
    ]

    async with httpx.AsyncClient(timeout=45) as client:
        tasks = [
            _fetch_one(client, q, loc, headers, emp)
            for q, emp, loc in queries
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    # ── Deduplicate + normalize ──────────────────────────────────────────────
    for raw_list in results:
        if isinstance(raw_list, Exception):
            continue
        for raw in raw_list:
            key = (
                (raw.get("job_title") or "").strip().lower(),
                (raw.get("employer_name") or "").strip().lower(),
            )
            if not key[0] or key in seen:
                continue
            seen.add(key)
            all_jobs.append(_normalize_job({}, raw))

    print(f"[JSearch] Total unique jobs: {len(all_jobs)}")
    return all_jobs