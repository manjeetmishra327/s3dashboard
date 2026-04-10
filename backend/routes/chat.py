# routes/chat.py
# FastAPI chat routes — SSE streaming, conversation CRUD
# Pattern matches your existing routes (user_id as Query param)

from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agents.chat_agent import run_chat_agent, summarize_conversation
from database.chat_mongo import (
    create_conversation,
    get_conversations,
    get_conversation,
    get_messages,
    get_recent_messages_plain,
    save_message,
    touch_conversation,
    update_conversation_summary,
    delete_conversation,
)
from vectorstore.chat_store import count_chunks, ingest_resume, ingest_jobs, ingest_skill_gaps

router = APIRouter(prefix="/chat", tags=["Chat"])


# ── Request models ────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None
    user_name: str | None = None    # optional — used in system prompt greeting


class IngestRequest(BaseModel):
    source_type: str   # "resume" | "job_match" | "skill_gap"
    data: dict | list  # the actual data to ingest


# ── POST /chat/message — main streaming endpoint ──────────────────────────────
@router.post("/message")
async def chat_message(
    body: ChatRequest,
    user_id: str = Query(..., description="User ID from auth token"),
):
    """
    Streams GPT-4o response via SSE.
    Frontend reads as EventSource or fetch + ReadableStream.
    Events: meta | delta | done | error
    """
    if not body.message.strip():
        raise HTTPException(400, "Message cannot be empty")

    # ── 1. Get or create conversation ────────────────────────────────────────
    if body.conversation_id:
        conv = await get_conversation(body.conversation_id, user_id)
        if not conv:
            raise HTTPException(404, "Conversation not found")
        conv_id = body.conversation_id
        summary = conv.get("summary", "")
    else:
        conv_id = await create_conversation(user_id, body.message[:60])
        summary = ""

    # ── 2. Save user message ──────────────────────────────────────────────────
    await save_message(conv_id, user_id, "user", body.message)

    # ── 3. Check if we need to summarize old messages ─────────────────────────
    all_msgs = await get_recent_messages_plain(conv_id, limit=100)
    if len(all_msgs) > 40 and not summary:
        old_msgs = all_msgs[:-20]
        summary = await summarize_conversation(old_msgs)
        await update_conversation_summary(conv_id, summary)

    # ── 4. Stream generator ───────────────────────────────────────────────────
    full_content_holder = {"text": "", "sources": [], "suggestions": []}

    async def event_stream():
        import json

        # Send conversation_id first so frontend can track new conversations
        yield f"event: meta\ndata: {json.dumps({'conversation_id': conv_id})}\n\n"

        async for chunk in run_chat_agent(
            user_id=user_id,
            user_name=body.user_name or "",
            conversation_id=conv_id,
            message=body.message,
            conversation_summary=summary,
        ):
            # Intercept the "done" event to save to MongoDB before forwarding
            if chunk.startswith("event: done"):
                data_line = chunk.split("data: ", 1)[1].strip()
                done_data = json.loads(data_line)

                # Save assistant message to MongoDB
                await save_message(
                    conv_id, user_id, "assistant",
                    done_data.get("full_content", ""),
                    source_chunks=done_data.get("sources", []),
                    suggested_questions=done_data.get("suggested_questions", []),
                )
                await touch_conversation(conv_id)

                # Forward done event without full_content (not needed by frontend)
                yield (
                    f"event: done\ndata: {json.dumps({'sources': done_data.get('sources', []), 'suggested_questions': done_data.get('suggested_questions', [])})}\n\n"
                )
            else:
                yield chunk

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":     "no-cache",
            "X-Accel-Buffering": "no",  # disable Railway/nginx buffering
            "Connection":        "keep-alive",
        },
    )


# ── GET /chat/conversations — list user's conversations ───────────────────────
@router.get("/conversations")
async def list_conversations(
    user_id: str = Query(...),
):
    convs = await get_conversations(user_id)
    return {"conversations": convs}


# ── GET /chat/messages — messages for one conversation ───────────────────────
@router.get("/messages")
async def list_messages(
    conversation_id: str = Query(...),
    user_id: str = Query(...),
):
    conv = await get_conversation(conversation_id, user_id)
    if not conv:
        raise HTTPException(404, "Conversation not found")

    messages = await get_messages(conversation_id, user_id)
    return {"messages": messages}


# ── DELETE /chat/conversation — delete conversation + messages ────────────────
@router.delete("/conversation")
async def remove_conversation(
    conversation_id: str = Query(...),
    user_id: str = Query(...),
):
    conv = await get_conversation(conversation_id, user_id)
    if not conv:
        raise HTTPException(404, "Conversation not found")

    await delete_conversation(conversation_id, user_id)
    return {"success": True}


# ── POST /chat/ingest — trigger ingestion from frontend ──────────────────────
@router.post("/ingest")
async def ingest_data(
    body: IngestRequest,
    user_id: str = Query(...),
):
    """
    Manually trigger re-ingestion.
    Normally called automatically from resume/jobs/skills routes after data updates.
    """
    chunks = 0

    if body.source_type == "resume":
        chunks = ingest_resume(user_id, body.data if isinstance(body.data, dict) else {})
    elif body.source_type == "job_match":
        chunks = ingest_jobs(user_id, body.data if isinstance(body.data, list) else [])
    elif body.source_type == "skill_gap":
        chunks = ingest_skill_gaps(user_id, body.data if isinstance(body.data, list) else [])
    else:
        raise HTTPException(400, f"Unknown source_type: {body.source_type}")

    return {"success": True, "chunks_created": chunks}


# ── GET /chat/ingest/status — how many chunks indexed per source ──────────────
@router.get("/ingest/status")
async def ingest_status(
    user_id: str = Query(...),
):
    return {"indexed": count_chunks(user_id)}