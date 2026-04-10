# vectorstore/chat_store.py
# Qdrant collection for RAG career chunks
# Uses text-embedding-3-small (1536 dims) — same as your existing qdrant_client.py

import os
import uuid
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct,
    PayloadSchemaType, Filter, FieldCondition, MatchValue
)
from openai import OpenAI

QDRANT_URL     = os.environ.get("QDRANT_URL")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

qdrant        = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
openai_client = OpenAI(api_key=OPENAI_API_KEY)

# ── Constants ─────────────────────────────────────────────────────────────────
CAREER_COLLECTION = "career_chunks"
VECTOR_SIZE       = 1536          # text-embedding-3-small — matches your existing setup
CHUNK_SIZE        = 1800          # chars (~450 tokens)
CHUNK_OVERLAP     = 200           # chars

# ── Embedding ─────────────────────────────────────────────────────────────────
def get_embedding(text: str) -> list[float]:
    text = text.strip().replace("\n", " ")
    response = openai_client.embeddings.create(
        input=[text],
        model="text-embedding-3-small"
    )
    return response.data[0].embedding


def get_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Batch embed up to 100 texts in one API call."""
    cleaned = [t.strip().replace("\n", " ") for t in texts]
    response = openai_client.embeddings.create(
        input=cleaned,
        model="text-embedding-3-small"
    )
    return [d.embedding for d in response.data]


# ── Collection setup ──────────────────────────────────────────────────────────
def ensure_career_collection():
    existing = [c.name for c in qdrant.get_collections().collections]
    if CAREER_COLLECTION not in existing:
        qdrant.create_collection(
            collection_name=CAREER_COLLECTION,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE)
        )
        print(f"[ChatStore] Created collection: {CAREER_COLLECTION}")

    # Payload indexes for fast pre-filtering
    for field in ["user_id", "source_type"]:
        try:
            qdrant.create_payload_index(
                collection_name=CAREER_COLLECTION,
                field_name=field,
                field_schema=PayloadSchemaType.KEYWORD
            )
        except Exception:
            pass  # already exists


# ── Text chunking ─────────────────────────────────────────────────────────────
def split_into_chunks(text: str) -> list[str]:
    """Recursive character splitter with overlap."""
    if not text or len(text.strip()) < 20:
        return []

    separators = ["\n\n", "\n", ". ", "! ", "? ", ", ", " "]
    text = text.strip()

    if len(text) <= CHUNK_SIZE:
        return [text]

    # Find best separator
    for sep in separators:
        if sep in text:
            parts = text.split(sep)
            chunks = []
            current = ""
            for part in parts:
                candidate = current + sep + part if current else part
                if len(candidate) <= CHUNK_SIZE:
                    current = candidate
                else:
                    if current:
                        chunks.append(current)
                    current = part
            if current:
                chunks.append(current)

            # Add overlap
            overlapped = []
            for i, chunk in enumerate(chunks):
                if i == 0:
                    overlapped.append(chunk)
                else:
                    prefix = chunks[i - 1][-CHUNK_OVERLAP:]
                    overlapped.append(prefix + " " + chunk)

            return [c for c in overlapped if len(c.strip()) > 20]

    # Fallback: hard split
    return [text[i:i + CHUNK_SIZE] for i in range(0, len(text), CHUNK_SIZE - CHUNK_OVERLAP)]


# ── Ingest: wipe old chunks then store new ones ───────────────────────────────
def delete_user_chunks(user_id: str, source_type: str = None):
    must = [FieldCondition(key="user_id", match=MatchValue(value=user_id))]
    if source_type:
        must.append(FieldCondition(key="source_type", match=MatchValue(value=source_type)))

    qdrant.delete(
        collection_name=CAREER_COLLECTION,
        points_selector=Filter(must=must),
    )
    print(f"[ChatStore] Deleted chunks for user={user_id} source_type={source_type}")


def ingest_chunks(user_id: str, source_type: str, source_title: str, sections: list[dict]):
    """
    sections = [{"section": "experience", "text": "..."}]
    Chunks each section, batch-embeds, upserts to Qdrant.
    Returns number of chunks created.
    """
    ensure_career_collection()
    delete_user_chunks(user_id, source_type)

    all_chunks = []
    for item in sections:
        section = item.get("section", "")
        text    = item.get("text", "")
        if not text or len(text.strip()) < 20:
            continue
        for idx, chunk in enumerate(split_into_chunks(text)):
            all_chunks.append({
                "section": section,
                "text":    chunk,
                "index":   idx,
            })

    if not all_chunks:
        return 0

    # Batch embed
    texts      = [c["text"] for c in all_chunks]
    embeddings = get_embeddings_batch(texts)

    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=embeddings[i],
            payload={
                "user_id":      user_id,
                "source_type":  source_type,
                "source_title": source_title,
                "section":      all_chunks[i]["section"],
                "chunk_text":   all_chunks[i]["text"],
                "chunk_index":  all_chunks[i]["index"],
            }
        )
        for i in range(len(all_chunks))
    ]

    # Upsert in batches of 100
    for i in range(0, len(points), 100):
        qdrant.upsert(collection_name=CAREER_COLLECTION, points=points[i:i + 100])

    print(f"[ChatStore] Ingested {len(points)} chunks — user={user_id} source={source_type}")
    return len(points)


# ── Ingest helpers for each data type ────────────────────────────────────────
def ingest_resume(user_id: str, profile: dict) -> int:
    """
    Call this right after run_resume_agent() saves to MongoDB.
    profile = the same dict saved to ai_profiles collection.
    """
    p = profile.get("profile", profile)  # handle both wrapped and flat

    sections = [
        {
            "section": "summary",
            "text": p.get("summary") or p.get("bio") or p.get("objective") or "",
        },
        {
            "section": "experience",
            "text": "\n\n".join(
                f"{e.get('title','')} at {e.get('company','')} "
                f"({e.get('start_date','')} – {e.get('end_date','Present')})\n"
                f"{e.get('description','') or e.get('responsibilities','')}"
                for e in (p.get("experience") or p.get("work_history") or [])
            ),
        },
        {
            "section": "skills",
            "text": "Skills: " + ", ".join(
                s if isinstance(s, str) else f"{s.get('name','')} ({s.get('level','')})"
                for s in (p.get("skills") or [])
            ),
        },
        {
            "section": "education",
            "text": "\n".join(
                f"{e.get('degree','')} in {e.get('field','') or e.get('major','')} "
                f"from {e.get('institution','')} ({e.get('year','') or e.get('end_year','')})"
                for e in (p.get("education") or [])
            ),
        },
        {
            "section": "projects",
            "text": "\n\n".join(
                f"{proj.get('name','')}: {proj.get('description','')}\n"
                f"Tech: {', '.join(proj.get('technologies') or proj.get('skills') or [])}"
                for proj in (p.get("projects") or [])
            ),
        },
    ]

    return ingest_chunks(user_id, "resume", "Your Resume", sections)


def ingest_jobs(user_id: str, jobs: list) -> int:
    """Call after scrape-and-match saves jobs. Pass the jobs list."""
    delete_user_chunks(user_id, "job_match")
    total = 0

    for job in jobs[:50]:  # top 50
        title = f"{job.get('title','?')} @ {job.get('company','?')}"
        sections = [
            {
                "section": "overview",
                "text": (
                    f"Title: {job.get('title','')}\n"
                    f"Company: {job.get('company','')}\n"
                    f"Location: {job.get('location','')}\n"
                    f"Salary: {job.get('salary','Not specified')}\n"
                    f"Match score: {job.get('similarity_score','N/A')}%"
                ),
            },
            {
                "section": "description",
                "text": job.get("description") or "",
            },
            {
                "section": "requirements",
                "text": "Required skills: " + ", ".join(job.get("skills_required") or []),
            },
        ]
        # Use ingest_chunks but don't delete again each time
        # Instead build all points and upsert once below
        for item in sections:
            if not item["text"] or len(item["text"].strip()) < 20:
                continue
            for idx, chunk in enumerate(split_into_chunks(item["text"])):
                point = PointStruct(
                    id=str(uuid.uuid4()),
                    vector=get_embedding(chunk),
                    payload={
                        "user_id":      user_id,
                        "source_type":  "job_match",
                        "source_title": title,
                        "section":      item["section"],
                        "chunk_text":   chunk,
                        "chunk_index":  idx,
                    }
                )
                qdrant.upsert(collection_name=CAREER_COLLECTION, points=[point])
                total += 1

    print(f"[ChatStore] Ingested {total} job chunks for user={user_id}")
    return total


def ingest_skill_gaps(user_id: str, gaps: list) -> int:
    """Call after skill gap analysis. Pass the gaps list."""
    if not gaps:
        return 0

    text = "\n\n---\n\n".join(
        f"Skill: {g.get('skill') or g.get('name','')}\n"
        f"Priority: {g.get('priority','medium')}\n"
        f"Current level: {g.get('current_level','beginner')}\n"
        f"Gap score: {g.get('gap_score','N/A')}\n"
        f"Est. hours: {g.get('hours_to_learn') or g.get('estimated_hours','N/A')}\n"
        f"Reason: {g.get('reason','')}"
        for g in gaps
    )

    return ingest_chunks(
        user_id, "skill_gap", "Your Skill Gap Analysis",
        [{"section": "skill_gaps", "text": text}]
    )


# ── Vector search ─────────────────────────────────────────────────────────────
def vector_search(user_id: str, query_vector: list[float], top_k: int = 20) -> list[dict]:
    results = qdrant.search(
        collection_name=CAREER_COLLECTION,
        query_vector=query_vector,
        query_filter=Filter(
            must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))]
        ),
        limit=top_k,
        with_payload=True,
        with_vectors=False,
    )
    return [
        {
            "point_id":     str(r.id),
            "similarity":   round(r.score, 4),
            "source_type":  r.payload.get("source_type"),
            "source_title": r.payload.get("source_title"),
            "section":      r.payload.get("section"),
            "chunk_text":   r.payload.get("chunk_text", ""),
        }
        for r in results
    ]


# ── Count indexed chunks per source type ─────────────────────────────────────
def count_chunks(user_id: str) -> dict:
    result = {}
    for source_type in ["resume", "job_match", "skill_gap"]:
        try:
            count = qdrant.count(
                collection_name=CAREER_COLLECTION,
                count_filter=Filter(must=[
                    FieldCondition(key="user_id",     match=MatchValue(value=user_id)),
                    FieldCondition(key="source_type", match=MatchValue(value=source_type)),
                ]),
                exact=False,
            )
            result[source_type] = count.count
        except Exception:
            result[source_type] = 0
    return result