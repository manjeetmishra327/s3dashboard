# database/chat_mongo.py
# MongoDB collections for RAG chat — conversations + messages
# Uses the same motor client pattern as your existing database/mongo.py

import os
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URI     = os.environ.get("MONGODB_URI")
MONGODB_DB_NAME = os.environ.get("MONGODB_DB_NAME", "s3_dashboard")

client = AsyncIOMotorClient(MONGODB_URI)
db     = client[MONGODB_DB_NAME]

# Two new collections — won't touch your existing ones
conversations_collection = db["conversations"]
messages_collection      = db["chat_messages"]


# ── Conversations ─────────────────────────────────────────────────────────────

async def create_conversation(user_id: str, title: str) -> str:
    doc = {
        "user_id":    user_id,
        "title":      title[:80],
        "summary":    "",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await conversations_collection.insert_one(doc)
    return str(result.inserted_id)


async def get_conversations(user_id: str) -> list:
    cursor = conversations_collection.find(
        {"user_id": user_id},
        {"_id": 1, "title": 1, "updated_at": 1}
    ).sort("updated_at", -1).limit(20)

    convs = await cursor.to_list(length=20)

    # Add last message preview to each
    result = []
    for conv in convs:
        conv_id = conv["_id"]
        last_msg = await messages_collection.find_one(
            {"conversation_id": conv_id},
            {"content": 1},
            sort=[("created_at", -1)]
        )
        result.append({
            "id":           str(conv_id),
            "title":        conv.get("title", "Untitled"),
            "updated_at":   conv["updated_at"].isoformat(),
            "last_message": (last_msg.get("content", "")[:80] if last_msg else ""),
        })
    return result


async def get_conversation(conv_id: str, user_id: str) -> dict | None:
    return await conversations_collection.find_one(
        {"_id": ObjectId(conv_id), "user_id": user_id}
    )


async def update_conversation_summary(conv_id: str, summary: str):
    await conversations_collection.update_one(
        {"_id": ObjectId(conv_id)},
        {"$set": {"summary": summary, "updated_at": datetime.utcnow()}}
    )


async def touch_conversation(conv_id: str):
    await conversations_collection.update_one(
        {"_id": ObjectId(conv_id)},
        {"$set": {"updated_at": datetime.utcnow()}}
    )


async def delete_conversation(conv_id: str, user_id: str):
    await conversations_collection.delete_one(
        {"_id": ObjectId(conv_id), "user_id": user_id}
    )
    await messages_collection.delete_many(
        {"conversation_id": ObjectId(conv_id)}
    )


# ── Messages ──────────────────────────────────────────────────────────────────

async def save_message(
    conversation_id: str,
    user_id: str,
    role: str,
    content: str,
    source_chunks: list = None,
    suggested_questions: list = None,
) -> str:
    doc = {
        "conversation_id":    ObjectId(conversation_id),
        "user_id":            user_id,
        "role":               role,
        "content":            content,
        "source_chunks":      source_chunks or [],
        "suggested_questions": suggested_questions or [],
        "created_at":         datetime.utcnow(),
    }
    result = await messages_collection.insert_one(doc)
    return str(result.inserted_id)


async def get_messages(conversation_id: str, user_id: str) -> list:
    cursor = messages_collection.find(
        {"conversation_id": ObjectId(conversation_id), "user_id": user_id},
        {"_id": 1, "role": 1, "content": 1,
         "source_chunks": 1, "suggested_questions": 1, "created_at": 1}
    ).sort("created_at", 1)

    msgs = await cursor.to_list(length=200)
    return [
        {
            "id":                   str(m["_id"]),
            "role":                 m["role"],
            "content":              m["content"],
            "source_chunks":        m.get("source_chunks", []),
            "suggested_questions":  m.get("suggested_questions", []),
            "created_at":           m["created_at"].isoformat(),
        }
        for m in msgs
    ]


async def get_recent_messages_plain(conversation_id: str, limit: int = 20) -> list[dict]:
    """Returns simple {role, content} dicts for GPT-4o context window."""
    cursor = messages_collection.find(
        {"conversation_id": ObjectId(conversation_id)},
        {"role": 1, "content": 1}
    ).sort("created_at", -1).limit(limit)

    msgs = await cursor.to_list(length=limit)
    # Reverse so oldest first
    return [{"role": m["role"], "content": m["content"]} for m in reversed(msgs)]