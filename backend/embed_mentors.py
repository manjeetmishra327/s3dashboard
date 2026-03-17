import os
import asyncio

# Load .env manually
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
with open(env_path) as f:
    for line in f:
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            os.environ[k.strip()] = v.strip()

from motor.motor_asyncio import AsyncIOMotorClient
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, VectorParams, Distance
from openai import OpenAI
import uuid

# Clients
mongo_client = AsyncIOMotorClient(os.environ.get("MONGODB_URI"))
db = mongo_client[os.environ.get("MONGODB_DB_NAME", "s3_dashboard")]
users_collection = db["users"]

qdrant = QdrantClient(
    url=os.environ.get("QDRANT_URL"),
    api_key=os.environ.get("QDRANT_API_KEY")
)

openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

COLLECTION_NAME = "mentors"
VECTOR_SIZE = 1536  # text-embedding-3-small


def build_mentor_text(mentor: dict) -> str:
    """Convert mentor profile into a rich text string for embedding."""
    p = mentor.get("profile", {})
    skills = ", ".join(p.get("skills", []))
    expertise = ", ".join(p.get("expertise", []))

    return f"""
    Name: {mentor.get('name', '')}
    Domain: {p.get('domain', '')}
    Bio: {p.get('bio', '')}
    Skills: {skills}
    Expertise: {expertise}
    Industry: {p.get('industry', '')}
    Years of Experience: {p.get('years_experience', 0)}
    Current Role: {p.get('current_role', '')} at {p.get('current_company', '')}
    """.strip()


def get_embedding(text: str) -> list[float]:
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding


def ensure_collection():
    """Create Qdrant collection if it doesn't exist."""
    existing = [c.name for c in qdrant.get_collections().collections]
    if COLLECTION_NAME not in existing:
        qdrant.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE)
        )
        print(f"Created Qdrant collection: {COLLECTION_NAME}")
    else:
        print(f"Collection '{COLLECTION_NAME}' already exists.")


async def embed_all_mentors():
    ensure_collection()

    # Fetch all mentors from MongoDB
    mentors = await users_collection.find({"role": "mentor"}).to_list(length=100)
    print(f"Found {len(mentors)} mentors in MongoDB.")

    points = []
    for mentor in mentors:
        profile = mentor.get("profile", {})

        # Skip mentors with empty profiles (no skills)
        if not profile.get("skills"):
            print(f"Skipping {mentor.get('name')} — empty profile")
            continue

        mentor_text = build_mentor_text(mentor)
        embedding = get_embedding(mentor_text)

        point_id = str(uuid.uuid4())

        points.append(PointStruct(
            id=point_id,
            vector=embedding,
            payload={
                "mongo_id": str(mentor["_id"]),
                "name": mentor.get("name"),
                "email": mentor.get("email"),
                "domain": profile.get("domain", ""),
                "skills": profile.get("skills", []),
                "expertise": profile.get("expertise", []),
                "industry": profile.get("industry", ""),
                "years_experience": profile.get("years_experience", 0),
                "current_role": profile.get("current_role", ""),
                "current_company": profile.get("current_company", ""),
                "bio": profile.get("bio", ""),
                "linkedin": profile.get("linkedin", ""),
            }
        ))
        print(f"Embedded: {mentor.get('name')} ({profile.get('domain', 'no domain')})")

    if points:
        qdrant.upsert(collection_name=COLLECTION_NAME, points=points)
        print(f"\n✅ Uploaded {len(points)} mentor embeddings to Qdrant!")
    else:
        print("No mentors to embed.")


if __name__ == "__main__":
    asyncio.run(embed_all_mentors())