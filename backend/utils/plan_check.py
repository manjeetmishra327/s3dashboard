import os
from datetime import datetime
from fastapi import HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient

# ── MongoDB setup ────────────────────────────────────────────────────────────
_MONGODB_URI  = os.environ.get("MONGODB_URI")
_DB_NAME      = os.environ.get("MONGODB_DB_NAME", "s3_dashboard")
_USERS_DB     = os.environ.get("MONGODB_DB", _DB_NAME)   # Next.js uses MONGODB_DB

_client       = AsyncIOMotorClient(_MONGODB_URI)
_users_col    = _client[_USERS_DB]["users"]

# ── Limits config ────────────────────────────────────────────────────────────
LIMITS = {
    "free": {
        "resumeUploads":      2,    # total lifetime
        "jobMatchesToday":    10,   # per day
        "skillGapCount":      1,    # per month
        "linkedinRuns":       1,    # lifetime
        "mockInterviewCount": 3,    # per month
    }
}

FEATURE_MESSAGES = {
    "resumeUploads":      "Free plan allows 2 resume uploads. Upgrade for unlimited.",
    "jobMatchesToday":    "Daily job match limit (10) reached. Upgrade for unlimited.",
    "skillGapCount":      "Monthly skill gap analysis limit (1) reached. Upgrade for unlimited.",
    "linkedinRuns":       "Free plan allows 1 LinkedIn optimization. Upgrade for unlimited.",
    "mockInterviewCount": "Monthly mock interview limit (3) reached. Upgrade for unlimited.",
}

# ── Helper ───────────────────────────────────────────────────────────────────
def _today() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d")

def _month() -> str:
    return datetime.utcnow().strftime("%Y-%m")

# ── Core check + increment ───────────────────────────────────────────────────
async def check_and_increment(user_id: str, feature: str):
    """
    Call this at the START of any route that needs usage gating.
    - Admin or Pro/Elite with valid plan → passes through silently.
    - Free user over limit → raises HTTP 402.
    - Free user under limit → increments counter and passes through.
    """
    user = await _users_col.find_one({"_id": __import__("bson").ObjectId(user_id)})

    # ── User not found ───────────────────────────────────────────────────────
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # ── Admin bypass ─────────────────────────────────────────────────────────
    if user.get("isAdmin", False):
        return

    # ── Paid plan bypass ─────────────────────────────────────────────────────
    plan = user.get("plan", "free")
    expiry = user.get("planExpiry")
    if plan in ("pro", "elite"):
        if expiry is None or expiry > datetime.utcnow():
            return

    # ── Free tier: check limits ──────────────────────────────────────────────
    usage   = user.get("usage", {})
    limit   = LIMITS["free"].get(feature, 999)

    # Daily reset for jobMatches
    if feature == "jobMatchesToday":
        if usage.get("jobMatchesDate", "") != _today():
            await _users_col.update_one(
                {"_id": user["_id"]},
                {"$set": {"usage.jobMatchesToday": 0, "usage.jobMatchesDate": _today()}}
            )
            usage["jobMatchesToday"] = 0

    # Monthly reset for skillGap + mockInterview
    if feature in ("skillGapCount", "mockInterviewCount"):
        month_key = "skillGapMonth" if feature == "skillGapCount" else "mockInterviewMonth"
        if usage.get(month_key, "") != _month():
            await _users_col.update_one(
                {"_id": user["_id"]},
                {"$set": {f"usage.{feature}": 0, f"usage.{month_key}": _month()}}
            )
            usage[feature] = 0

    current = usage.get(feature, 0)

    if current >= limit:
        raise HTTPException(
            status_code=402,
            detail={
                "error":       "limit_reached",
                "feature":     feature,
                "message":     FEATURE_MESSAGES.get(feature, "Plan limit reached"),
                "current":     current,
                "limit":       limit,
                "upgrade_url": "/pricing"
            }
        )

    # ── Increment counter ────────────────────────────────────────────────────
    await _users_col.update_one(
        {"_id": user["_id"]},
        {"$inc": {f"usage.{feature}": 1}}
    )

# ── FastAPI Depends factories ─────────────────────────────────────────────────
# Usage: add `_: None = Depends(require_plan("resumeUploads"))` to any route

def require_plan(feature: str):
    async def _dep(user_id: str = Query(..., description="User ID from auth")):
        await check_and_increment(user_id, feature)
    return _dep