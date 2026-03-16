import os
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, PayloadSchemaType
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
    text = text.strip().replace("\n", " ")
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
    try:
        qdrant.create_payload_index(
            collection_name=name,
            field_name="user_id",
            field_schema=PayloadSchemaType.KEYWORD
        )
        print("[Qdrant] user_id index ensured for:", name)
    except Exception:
        pass


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
