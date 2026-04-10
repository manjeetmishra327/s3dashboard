import os
print("🔥 BACKEND MAIN.PY IS RUNNING 🔥")
from dotenv import load_dotenv

load_dotenv()

print(f"[Startup] OPENAI_API_KEY loaded: {'✅' if os.getenv('OPENAI_API_KEY') else '❌'}")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import resume, jobs, mentors, skills, progress
from routes.mentor_match import router as mentor_match_router
from routes.mentor_profile import router as mentor_profile_router
from routes.chat import router as chat_router

app = FastAPI(
    title="S3 Dashboard API",
    version="2.0.0",
    description="AI Powered Student Success Dashboard"
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Explicitly whitelist only known frontend origins.
# Never use allow_origins=["*"] with allow_credentials=True — that's a
# security misconfiguration (CORS + credentials wildcard).

_FRONTEND_URL = os.getenv("FRONTEND_URL", "").strip().rstrip("/")

# Build exact allowed origins — no duplicates, no wildcards
_ALLOWED_ORIGINS = list(dict.fromkeys(filter(None, [
    "http://localhost:3000",
    "https://s3frontend-seven.vercel.app",
    _FRONTEND_URL if _FRONTEND_URL else None,
])))

print(f"[Startup] CORS allowed origins: {_ALLOWED_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    # Explicit methods only — no wildcard
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    # Explicit headers only — no wildcard
    allow_headers=[
        "Content-Type",
        "Authorization",
        "Accept",
        "Origin",
        "X-Requested-With",
    ],
    expose_headers=["X-RateLimit-Limit", "Retry-After"],
    max_age=600,  # preflight cache 10 minutes
)

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(resume.router)
app.include_router(jobs.router)
app.include_router(mentor_match_router)
app.include_router(mentors.router)
app.include_router(skills.router)
app.include_router(progress.router)
app.include_router(mentor_profile_router)
app.include_router(chat_router)


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
    # ── Never expose full API key — only confirm it loaded ────────────────
    key = os.getenv("OPENAI_API_KEY")
    return {
        "key_loaded": bool(key),
        # Removed key_preview — exposing even 10 chars is information disclosure
    }