# agents/chat_agent.py
# RAG Chat Agent: HyDE → Qdrant search → Cohere rerank → GPT-4o SSE stream

import os
import json
from openai import AsyncOpenAI
import cohere

from vectorstore.chat_store import get_embedding, vector_search
from database.chat_mongo import (
    get_recent_messages_plain,
    update_conversation_summary,
)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
COHERE_API_KEY = os.environ.get("COHERE_API_KEY")

openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
cohere_client = cohere.AsyncClient(api_key=COHERE_API_KEY) if COHERE_API_KEY else None

MAX_TURNS_IN_CONTEXT = 10   # last N turns passed to GPT-4o
SUMMARIZE_AFTER      = 20   # total messages before we summarize older ones
TOP_K_RETRIEVE       = 20   # Qdrant candidates
TOP_K_RERANK         = 5    # after Cohere reranking


# ── HyDE: generate hypothetical answer, embed it ─────────────────────────────
async def hyde_embed(question: str, user_context: str = "") -> list[float]:
    """
    Generates a hypothetical career coach answer to the question,
    then embeds it. Retrieval quality jumps for vague questions like
    "why am I not getting interviews?" because the hypothetical answer
    contains the right vocabulary that exists in resume/job chunks.
    """
    system = (
        "You are a career coach with full access to a candidate's resume and job data. "
        "Write a detailed 2-paragraph answer to the question below, as if it appeared "
        "in a career coaching document. Be specific about skills, roles, and gaps. "
        "Do not hedge — give concrete answers.\n"
        + (f"User context: {user_context}" if user_context else "")
    )
    response = await openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": question},
        ],
        max_tokens=300,
        temperature=0.7,
    )
    hypothesis = response.choices[0].message.content
    return get_embedding(hypothesis)  # sync — wraps openai_client


# ── Cohere reranking ──────────────────────────────────────────────────────────
async def rerank_chunks(query: str, chunks: list[dict]) -> list[dict]:
    """Reranks top-20 Qdrant results to top-5 using Cohere."""
    if not cohere_client or not chunks:
        return chunks[:TOP_K_RERANK]

    if len(chunks) <= TOP_K_RERANK:
        return chunks

    response = await cohere_client.rerank(
        model="rerank-v3.5",
        query=query,
        documents=[c["chunk_text"] for c in chunks],
        top_n=TOP_K_RERANK,
        return_documents=False,
    )

    reranked = []
    for r in response.results:
        chunk = dict(chunks[r.index])
        chunk["rerank_score"] = round(r.relevance_score, 4)
        reranked.append(chunk)

    return reranked


# ── Build GPT-4o system prompt ────────────────────────────────────────────────
def build_system_prompt(user_name: str, summary: str, context_text: str) -> str:
    from datetime import date
    today = date.today().strftime("%A, %B %d, %Y")

    return f"""You are an advanced AI career coach for {user_name or 'the user'}. Today is {today}.

Give deeply personalized, actionable career guidance grounded in the user's actual resume, job matches, and skill gap data. Every answer must reference their specific experience — never give generic advice.

{f"## Conversation summary\n{summary}\n" if summary else ""}

## Retrieved context from user's career data
{context_text or "No context retrieved. Ask the user to upload their resume and run job matches first."}

## Rules
- Ground every answer in the retrieved context. Cite naturally: "Based on your resume...", "Looking at your job matches..."
- For diagnostic questions ("why no interviews?"), be direct — name the actual gaps from their data
- Give numbered action steps when making recommendations
- Be encouraging but honest — don't sugarcoat critical gaps
- 3–5 paragraphs max unless user asks for a full breakdown
- Use markdown: **bold** key terms, bullet points, numbered steps
- If context is insufficient, say so clearly and ask one clarifying question

## Tone
Expert career coach — warm, direct, specific. Not corporate, not vague."""


# ── Main streaming agent ──────────────────────────────────────────────────────
async def run_chat_agent(
    user_id: str,
    user_name: str,
    conversation_id: str,
    message: str,
    conversation_summary: str,
):
    """
    Full RAG pipeline as an async generator yielding SSE-formatted strings.
    Caller (route) iterates and streams these directly to the client.

    Yields lines like:
      "event: delta\ndata: {\"text\": \"...\"}\n\n"
      "event: done\ndata: {\"sources\": [...], \"suggested_questions\": [...]}\n\n"
      "event: error\ndata: {\"message\": \"...\"}\n\n"
    """

    def sse(event: str, data: dict) -> str:
        return f"event: {event}\ndata: {json.dumps(data)}\n\n"

    try:
        # ── 1. Load recent history ────────────────────────────────────────────
        history = await get_recent_messages_plain(conversation_id, limit=MAX_TURNS_IN_CONTEXT * 2)

        # ── 2. HyDE + direct embed in parallel ───────────────────────────────
        import asyncio
        direct_vec = await asyncio.get_event_loop().run_in_executor(
            None, get_embedding, message
        )
        hyde_vec = await hyde_embed(message, conversation_summary)

        # Blend: 40% direct query + 60% HyDE
        blended = [direct_vec[i] * 0.4 + hyde_vec[i] * 0.6 for i in range(len(direct_vec))]

        # ── 3. Qdrant vector search ───────────────────────────────────────────
        candidates = vector_search(user_id, blended, top_k=TOP_K_RETRIEVE)

        # ── 4. Cohere rerank ──────────────────────────────────────────────────
        reranked = await rerank_chunks(message, candidates)

        # ── 5. Build context string ───────────────────────────────────────────
        context_text = "\n\n---\n\n".join(
            f"[Source {i+1}: {c.get('source_title', c.get('source_type',''))} — {c.get('section','')}]\n{c['chunk_text']}"
            for i, c in enumerate(reranked)
        )

        # ── 6. Stream GPT-4o ──────────────────────────────────────────────────
        system_prompt = build_system_prompt(user_name, conversation_summary, context_text)

        messages_for_gpt = [
            {"role": "system", "content": system_prompt},
            *history,
            {"role": "user", "content": message},
        ]

        full_content = ""
        stream = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=messages_for_gpt,
            stream=True,
            temperature=0.7,
            max_tokens=1000,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta.content or ""
            if delta:
                full_content += delta
                yield sse("delta", {"text": delta})

        # ── 7. Generate suggested follow-up questions ─────────────────────────
        suggestions = await generate_suggestions(message, full_content, reranked)

        # ── 8. Build citation objects ─────────────────────────────────────────
        sources = [
            {
                "point_id":       c.get("point_id"),
                "source_type":    c.get("source_type"),
                "source_title":   c.get("source_title"),
                "section":        c.get("section"),
                "relevance_score": c.get("rerank_score") or c.get("similarity"),
                "snippet":        c["chunk_text"][:120] + "...",
            }
            for c in reranked
        ]

        yield sse("done", {
            "sources":             sources,
            "suggested_questions": suggestions,
            "full_content":        full_content,  # used by route to save to MongoDB
        })

    except Exception as e:
        print(f"[ChatAgent] Error: {e}")
        yield sse("error", {"message": "Something went wrong. Please try again."})


# ── Conversation summarizer ───────────────────────────────────────────────────
async def summarize_conversation(messages: list[dict]) -> str:
    transcript = "\n".join(f"{m['role']}: {m['content']}" for m in messages)
    res = await openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "Summarize this career coaching conversation in 3-4 sentences. "
                           "Include: user's career goals, topics discussed, decisions, unresolved questions.",
            },
            {"role": "user", "content": transcript},
        ],
        max_tokens=200,
        temperature=0.3,
    )
    return res.choices[0].message.content


# ── Suggested follow-up questions ────────────────────────────────────────────
async def generate_suggestions(
    user_message: str, assistant_response: str, chunks: list[dict]
) -> list[str]:
    try:
        source_types = list({c.get("source_type") for c in chunks})
        res = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"Generate exactly 3 short, specific follow-up questions "
                        f"based on this career coaching exchange. "
                        f"Focus on: {', '.join(source_types)}. "
                        "Return ONLY a valid JSON array of 3 strings. No preamble."
                    ),
                },
                {
                    "role": "user",
                    "content": f'User: "{user_message}"\nCoach: "{assistant_response[:400]}"',
                },
            ],
            max_tokens=150,
            temperature=0.8,
        )
        raw = res.choices[0].message.content.strip().replace("```json", "").replace("```", "")
        return json.loads(raw)
    except Exception:
        return [
            "What should I focus on this week?",
            "How does my profile compare to what employers want?",
            "What's the fastest skill gap I can close?",
        ]