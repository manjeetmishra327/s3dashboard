"""
Interview Routes — FastAPI
Endpoints: start, answer, report, sessions list, abandon
Auth: Bearer JWT (same as existing routes)
"""

import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Request, status
from pydantic import BaseModel, Field, validator

from database.mongo import get_database
from agents.interview_agent import (
    generate_question,
    evaluate_answer,
    generate_report,
    INTERVIEW_CONFIGS,
)
from routes.resume import get_current_user  # reuse existing JWT util

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/interview", tags=["interview"])

COLLECTION = "interview_sessions"
MAX_QUESTIONS = 10
MIN_QUESTIONS = 3
DEFAULT_QUESTIONS = 5


# ── Request / Response models ──────────────────────────────────────────────────

class StartRequest(BaseModel):
    interview_type: str = Field(..., description="dsa | system_design | hr | mixed")
    total_questions: int = Field(DEFAULT_QUESTIONS, ge=MIN_QUESTIONS, le=MAX_QUESTIONS)
    job_description: Optional[str] = Field(None, max_length=3000)

    @validator("interview_type")
    def validate_type(cls, v):
        allowed = list(INTERVIEW_CONFIGS.keys())
        if v not in allowed:
            raise ValueError(f"interview_type must be one of {allowed}")
        return v


class AnswerRequest(BaseModel):
    session_id: str
    question_id: str
    answer: str = Field(..., min_length=1, max_length=5000)
    time_taken: int = Field(0, ge=0, le=3600, description="seconds spent on answer")


class AbandonRequest(BaseModel):
    session_id: str


# ── Helpers ────────────────────────────────────────────────────────────────────

def utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def _get_active_session(db, session_id: str, user_id: str) -> dict:
    """Fetch session and validate ownership + active status."""
    session = await db[COLLECTION].find_one(
        {"session_id": session_id, "user_id": user_id}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session.get("status") != "active":
        raise HTTPException(
            status_code=400,
            detail=f"Session is already {session.get('status')}. Start a new session."
        )
    return session


async def _get_resume_text(db, user_id: str) -> str:
    """Pull latest parsed resume text for the user."""
    try:
        user = await db["users"].find_one({"_id": user_id})
        return user.get("resume_text", "") if user else ""
    except Exception:
        return ""


# ── POST /interview/start ──────────────────────────────────────────────────────

@router.post("/start", status_code=status.HTTP_201_CREATED)
async def start_interview(
    body: StartRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a new interview session and return the first question."""
    db = await get_database()
    user_id = str(current_user["_id"])

    # Abort any stale active session for this user + type (optional cleanup)
    await db[COLLECTION].update_many(
        {"user_id": user_id, "status": "active"},
        {"$set": {"status": "abandoned", "updated_at": utcnow()}},
    )

    resume_text = await _get_resume_text(db, user_id)

    try:
        first_question = await generate_question(
            interview_type=body.interview_type,
            resume_text=resume_text,
            job_description=body.job_description or "",
            previous_questions=[],
            question_number=1,
            total_questions=body.total_questions,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    session_id = str(uuid.uuid4())
    session_doc = {
        "session_id": session_id,
        "user_id": user_id,
        "interview_type": body.interview_type,
        "total_questions": body.total_questions,
        "job_description": body.job_description or "",
        "resume_snapshot": resume_text[:500],  # small snapshot only
        "status": "active",
        "questions": [first_question],
        "overall_score": None,
        "report": None,
        "created_at": utcnow(),
        "updated_at": utcnow(),
        "completed_at": None,
    }

    await db[COLLECTION].insert_one(session_doc)

    return {
        "session_id": session_id,
        "question_number": 1,
        "total_questions": body.total_questions,
        "interview_type": body.interview_type,
        "question": first_question,
    }


# ── POST /interview/answer ─────────────────────────────────────────────────────

@router.post("/answer")
async def submit_answer(
    body: AnswerRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Score the submitted answer and return the next question (if any)
    or trigger report generation when all questions are answered.
    """
    db = await get_database()
    user_id = str(current_user["_id"])
    session = await _get_active_session(db, body.session_id, user_id)

    questions: list = session.get("questions", [])
    total_questions: int = session.get("total_questions", DEFAULT_QUESTIONS)

    # Find the question being answered
    target_q = next((q for q in questions if q["question_id"] == body.question_id), None)
    if not target_q:
        raise HTTPException(status_code=404, detail="Question not found in this session.")
    if target_q.get("user_answer"):
        raise HTTPException(status_code=400, detail="This question has already been answered.")

    # Evaluate answer
    try:
        evaluation = await evaluate_answer(
            question=target_q["question"],
            user_answer=body.answer,
            question_type=target_q.get("question_type", session["interview_type"]),
            expected_keywords=target_q.get("expected_keywords", []),
            hint_for_evaluator=target_q.get("hint_for_evaluator", ""),
            difficulty=target_q.get("difficulty", "medium"),
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Merge answer + evaluation into the question
    target_q.update({
        "user_answer": body.answer,
        "time_taken": body.time_taken,
        **evaluation,
    })

    # Replace in questions list
    updated_questions = [
        target_q if q["question_id"] == body.question_id else q
        for q in questions
    ]

    answered_count = sum(1 for q in updated_questions if q.get("user_answer"))
    is_complete = answered_count >= total_questions

    if is_complete:
        # Generate final report
        try:
            report = await generate_report({
                "questions": updated_questions,
                "interview_type": session["interview_type"],
            })
        except Exception as e:
            logger.error(f"Report generation error: {e}")
            report = None

        overall_score = report.get("overall_score") if report else None

        await db[COLLECTION].update_one(
            {"session_id": body.session_id},
            {"$set": {
                "questions": updated_questions,
                "status": "completed",
                "report": report,
                "overall_score": overall_score,
                "completed_at": utcnow(),
                "updated_at": utcnow(),
            }},
        )

        return {
            "answered": answered_count,
            "total_questions": total_questions,
            "is_complete": True,
            "evaluation": evaluation,
            "session_id": body.session_id,
        }

    # Generate next question
    previous_questions = [q["question"] for q in updated_questions]
    next_q_number = answered_count + 1

    try:
        next_question = await generate_question(
            interview_type=session["interview_type"],
            resume_text=session.get("resume_snapshot", ""),
            job_description=session.get("job_description", ""),
            previous_questions=previous_questions,
            question_number=next_q_number,
            total_questions=total_questions,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    updated_questions.append(next_question)

    await db[COLLECTION].update_one(
        {"session_id": body.session_id},
        {"$set": {
            "questions": updated_questions,
            "updated_at": utcnow(),
        }},
    )

    return {
        "answered": answered_count,
        "total_questions": total_questions,
        "is_complete": False,
        "evaluation": evaluation,
        "next_question": next_question,
        "question_number": next_q_number,
        "session_id": body.session_id,
    }


# ── GET /interview/report/{session_id} ────────────────────────────────────────

@router.get("/report/{session_id}")
async def get_report(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Fetch completed interview report."""
    db = await get_database()
    user_id = str(current_user["_id"])

    session = await db[COLLECTION].find_one(
        {"session_id": session_id, "user_id": user_id}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    if session.get("status") == "active":
        raise HTTPException(status_code=400, detail="Interview still in progress.")

    # Sanitise MongoDB _id
    session.pop("_id", None)
    session["created_at"] = session.get("created_at", utcnow()).isoformat()
    session["updated_at"] = session.get("updated_at", utcnow()).isoformat()
    if session.get("completed_at"):
        session["completed_at"] = session["completed_at"].isoformat()

    return session


# ── GET /interview/sessions ────────────────────────────────────────────────────

@router.get("/sessions")
async def list_sessions(
    current_user: dict = Depends(get_current_user),
    limit: int = 10,
    skip: int = 0,
):
    """List all past interview sessions for the user (newest first)."""
    db = await get_database()
    user_id = str(current_user["_id"])

    limit = min(limit, 20)  # cap at 20

    cursor = db[COLLECTION].find(
        {"user_id": user_id, "status": {"$in": ["completed", "abandoned"]}},
        {
            "session_id": 1,
            "interview_type": 1,
            "status": 1,
            "overall_score": 1,
            "total_questions": 1,
            "created_at": 1,
            "completed_at": 1,
            "report.grade": 1,
            "report.verdict": 1,
            "_id": 0,
        },
    ).sort("created_at", -1).skip(skip).limit(limit)

    sessions = await cursor.to_list(length=limit)

    for s in sessions:
        if s.get("created_at"):
            s["created_at"] = s["created_at"].isoformat()
        if s.get("completed_at"):
            s["completed_at"] = s["completed_at"].isoformat()

    total = await db[COLLECTION].count_documents(
        {"user_id": user_id, "status": {"$in": ["completed", "abandoned"]}}
    )

    return {"sessions": sessions, "total": total, "limit": limit, "skip": skip}


# ── POST /interview/abandon ────────────────────────────────────────────────────

@router.post("/abandon")
async def abandon_session(
    body: AbandonRequest,
    current_user: dict = Depends(get_current_user),
):
    """Mark an active session as abandoned."""
    db = await get_database()
    user_id = str(current_user["_id"])

    result = await db[COLLECTION].update_one(
        {"session_id": body.session_id, "user_id": user_id, "status": "active"},
        {"$set": {"status": "abandoned", "updated_at": utcnow()}},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Active session not found.")

    return {"message": "Session abandoned.", "session_id": body.session_id}