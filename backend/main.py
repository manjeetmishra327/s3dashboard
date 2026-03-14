import os
from dotenv import load_dotenv

# Absolute path fix — must be before everything
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'), override=True)

# Verify on startup
print(f"[Startup] Key loaded: {'✅' if os.getenv('OPENAI_API_KEY') else '❌ FAILED'}")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import resume, jobs, mentors, skills, progress

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
    return {"status": "running", "version": "2.0.0", "message": "S3 Dashboard API - AI Agent System"}

@app.get("/debug")
async def debug():
    import os
    key = os.getenv("OPENAI_API_KEY")
    return {
        "key_loaded": bool(key),
        "key_preview": key[:15] if key else "NOT FOUND",
        "env_file": os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))
    }
@app.get("/debug-env")
async def debug_env():
    import os
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    
    # Read directly
    vals = {}
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if '=' in line and not line.startswith('#'):
                k, v = line.split('=', 1)
                vals[k.strip()] = v.strip()
    
    key = vals.get("OPENAI_API_KEY", "")
    return {
        "env_path": env_path,
        "file_exists": os.path.exists(env_path),
        "key_found": bool(key),
        "key_preview": key[:20] if key else "NOT FOUND",
        "all_keys": list(vals.keys())
    }