import os
import asyncio
from datetime import datetime

# Load env
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
mentors_collection = db["users"]

test_mentors = [
    {
        "name": "Rahul Sharma",
        "email": "rahul.mentor@test.com",
        "role": "mentor",
        "phone": "9999000001",
        "password": "hashed_password",
        "profile": {
            "bio": "Senior Full Stack Developer with 6 years experience in MERN stack and cloud technologies",
            "domain": "fullstack",
            "skills": ["React", "Node.js", "MongoDB", "Express", "AWS", "Docker", "JavaScript", "TypeScript"],
            "expertise": ["MERN Stack", "System Design", "REST APIs", "Microservices"],
            "industry": "Product",
            "years_experience": 6,
            "current_company": "Razorpay",
            "current_role": "Senior Software Engineer",
            "linkedin": "https://linkedin.com/in/rahulsharma",
            "avatar": None
        },
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    },
    {
        "name": "Priya Singh",
        "email": "priya.mentor@test.com",
        "role": "mentor",
        "phone": "9999000002",
        "password": "hashed_password",
        "profile": {
            "bio": "AI/ML Engineer specializing in LLMs, RAG systems and production AI deployment",
            "domain": "AI/ML",
            "skills": ["Python", "LangChain", "OpenAI", "FastAPI", "TensorFlow", "PyTorch", "Vector DB", "RAG"],
            "expertise": ["LLM Applications", "RAG Systems", "AI Agents", "NLP"],
            "industry": "AI Startup",
            "years_experience": 4,
            "current_company": "Sarvam AI",
            "current_role": "ML Engineer",
            "linkedin": "https://linkedin.com/in/priyasingh",
            "avatar": None
        },
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    },
    {
        "name": "Amit Kumar",
        "email": "amit.mentor@test.com",
        "role": "mentor",
        "phone": "9999000003",
        "password": "hashed_password",
        "profile": {
            "bio": "Backend Engineer with deep expertise in Python, Django, FastAPI and distributed systems",
            "domain": "backend",
            "skills": ["Python", "Django", "FastAPI", "PostgreSQL", "Redis", "Kafka", "Docker", "Kubernetes"],
            "expertise": ["Backend Architecture", "Database Design", "API Development", "DevOps"],
            "industry": "Fintech",
            "years_experience": 5,
            "current_company": "Zerodha",
            "current_role": "Backend Engineer",
            "linkedin": "https://linkedin.com/in/amitkumar",
            "avatar": None
        },
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    },
    {
        "name": "Sneha Patel",
        "email": "sneha.mentor@test.com",
        "role": "mentor",
        "phone": "9999000004",
        "password": "hashed_password",
        "profile": {
            "bio": "Frontend Developer expert in React, Next.js and modern UI development",
            "domain": "frontend",
            "skills": ["React", "Next.js", "TypeScript", "Tailwind CSS", "Redux", "GraphQL", "Figma"],
            "expertise": ["Frontend Architecture", "UI/UX", "Performance Optimization", "Component Design"],
            "industry": "SaaS",
            "years_experience": 4,
            "current_company": "Freshworks",
            "current_role": "Frontend Engineer",
            "linkedin": "https://linkedin.com/in/snehapatel",
            "avatar": None
        },
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    },
    {
        "name": "Vikram Nair",
        "email": "vikram.mentor@test.com",
        "role": "mentor",
        "phone": "9999000005",
        "password": "hashed_password",
        "profile": {
            "bio": "DevOps and Cloud Engineer with expertise in AWS, CI/CD and infrastructure automation",
            "domain": "devops",
            "skills": ["AWS", "Docker", "Kubernetes", "Terraform", "Jenkins", "GitHub Actions", "Linux", "Python"],
            "expertise": ["Cloud Infrastructure", "CI/CD Pipelines", "Container Orchestration", "IaC"],
            "industry": "Cloud Services",
            "years_experience": 7,
            "current_company": "AWS",
            "current_role": "Solutions Architect",
            "linkedin": "https://linkedin.com/in/vikramnair",
            "avatar": None
        },
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
]

async def seed():
    print("Seeding test mentors...")
    for mentor in test_mentors:
        existing = await mentors_collection.find_one({"email": mentor["email"]})
        if existing:
            print(f"Already exists: {mentor['name']} - skipping")
            continue
        await mentors_collection.insert_one(mentor)
        print(f"Inserted: {mentor['name']} - {mentor['profile']['domain']}")
    print("Done! All test mentors seeded.")

if __name__ == "__main__":
    asyncio.run(seed())