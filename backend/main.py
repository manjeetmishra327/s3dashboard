from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import resume, jobs, mentors, skills, progress
import os

app = FastAPI(title="S3 Dashboard API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume.router)
app.include_router(jobs.router)
app.include_router(mentors.router)
app.include_router(skills.router)
app.include_router(progress.router)


@app.get("/health")
async def health():
    return {
        "status": "running",
        "version": "2.0.0",
        "message": "S3 Dashboard API - AI Agent System",
    }
