import os
import httpx

RAPIDAPI_KEY = os.environ.get("RAPIDAPI_KEY")

async def fetch_jobs_jsearch(keywords, location="India"):
    all_jobs = []
    seen = set()

    # 3 query variations to get 30-40 diverse results
    query_variations = [
        keywords,
        keywords + " intern",
        keywords + " junior developer",
    ]

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

        async with httpx.AsyncClient(timeout=45) as client:
            for query in query_variations:
                try:
                    params = {
                        "query": query + " in " + location,
                        "page": "1",
                        "num_pages": "1",
                        "date_posted": "all",
                        "employment_types": "FULLTIME,PARTTIME,INTERN,CONTRACTOR"
                    }
                    response = await client.get(url, headers=headers, params=params)
                    if response.status_code != 200:
                        print(f"[JSearch] API error for query '{query}':", response.status_code)
                        continue

                    raw_jobs = response.json().get("data", [])
                    print(f"[JSearch] Query '{query}': {len(raw_jobs)} jobs")

                    for job in raw_jobs:
                        # Deduplicate by title+company
                        dedup_key = (
                            (job.get("job_title") or "").strip().lower(),
                            (job.get("employer_name") or "").strip().lower()
                        )
                        if dedup_key in seen or not dedup_key[0]:
                            continue
                        seen.add(dedup_key)

                        q = job.get("job_highlights", {}).get("Qualifications", [])
                        city = job.get("job_city") or ""
                        country = job.get("job_country") or ""
                        min_sal = job.get("job_min_salary") or "Not"
                        max_sal = job.get("job_max_salary") or "disclosed"

                        all_jobs.append({
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
                        })
                except Exception as e:
                    print(f"[JSearch] Error on query '{query}':", e)
                    continue

    except Exception as e:
        print("[JSearch] Error:", e)

    print(f"[JSearch] Done: {len(all_jobs)} unique jobs across {len(query_variations)} queries")
    return all_jobs