import os
print("🔥 BACKEND MAIN.PY IS RUNNING 🔥")
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print(f"[Startup] OPENAI_API_KEY loaded: {'✅' if os.getenv('OPENAI_API_KEY') else '❌'}")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import resume, jobs, mentors, skills, progress
from routes.mentor_match import router as mentor_match_router   # ← NEW

app = FastAPI(
    title="S3 Dashboard API",
    version="2.0.0",
    description="AI Powered Student Success Dashboard"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(resume.router)
app.include_router(jobs.router)
app.include_router(mentors.router)
app.include_router(skills.router)
app.include_router(progress.router)
app.include_router(mentor_match_router)   # ← NEW


@app.get("/")
async def root():
    return {
        "message": "S3 Dashboard API Running 🚀",
        "version": "2.0.0"
    }


@app.get("/health")
async def health():
    return {
        "status": "running",
        "version": "2.0.0"
    }


@app.get("/debug")
async def debug():
    key = os.getenv("OPENAI_API_KEY")
    return {
        "key_loaded": bool(key),
        "key_preview": key[:10] if key else "NOT FOUND"
    }