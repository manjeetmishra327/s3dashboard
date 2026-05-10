from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional

from agents.resume_scorer_v2 import run_resume_scorer_v2
from agents.resume_improver_agent import run_resume_improver
from utils.pdf_parser import extract_text_from_pdf

router = APIRouter(prefix="/resume", tags=["Resume v2"])


# ─── POST /resume/analyze ──────────────────────────────────────────────────────
@router.post("/analyze")
async def analyze_resume(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    job_description: Optional[str] = Form(None),
):
    """
    Full multi-dimensional resume analysis.
    Returns dimensional scores, section breakdown, ATS score, JD match %.
    """
    try:
        file_bytes = await file.read()

        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")

        resume_text = extract_text_from_pdf(file_bytes)

        if not resume_text or len(resume_text.strip()) < 80:
            raise HTTPException(
                status_code=400,
                detail="Could not extract readable text from this PDF. Make sure it's not a scanned image."
            )

        result = await run_resume_scorer_v2(
            resume_text=resume_text,
            user_id=user_id,
            job_description=job_description
        )

        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("error", "Analysis failed"))

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── POST /resume/improve-section ─────────────────────────────────────────────
class ImproveRequest(BaseModel):
    section_name: str
    section_content: str
    target_role: Optional[str] = "Professional"
    job_description: Optional[str] = None
    user_id: Optional[str] = None


@router.post("/improve-section")
async def improve_section(req: ImproveRequest):
    """
    Generate 3 AI-powered rewrite variations for a specific resume section.
    Returns: Polished & Safe, Maximum Impact, Executive Edge variants.
    """
    if not req.section_content or len(req.section_content.strip()) < 20:
        raise HTTPException(
            status_code=400,
            detail="Section content is too short to improve (minimum 20 characters)"
        )

    result = await run_resume_improver(
        section_name=req.section_name,
        section_content=req.section_content,
        target_role=req.target_role or "Professional",
        job_description=req.job_description,
        user_id=req.user_id
    )

    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Improvement failed"))

    return result


# ─── HOW TO REGISTER IN main.py ───────────────────────────────────────────────
# from routes.resume_v2 import router as resume_v2_router
# app.include_router(resume_v2_router)          # → /resume/analyze, /resume/improve-section
# OR if you have a global prefix:
# app.include_router(resume_v2_router, prefix="/api")  → /api/resume/analyze