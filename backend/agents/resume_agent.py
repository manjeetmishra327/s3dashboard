from chains.resume_chain import resume_chain
from utils.pdf_parser import extract_text_from_pdf
from database.mongo import save_ai_profile


async def run_resume_agent(file_bytes: bytes, user_id: str) -> dict:
    """
    AGENT 1: Resume Parser Agent
    PDF → Raw Text → LangChain GPT-4o → Structured Profile → MongoDB
    This is the foundation. All other agents depend on this output.
    """
    try:
        print(f"[Resume Agent] Extracting text for user: {user_id}")
        resume_text = extract_text_from_pdf(file_bytes)

        if not resume_text or len(resume_text) < 100:
            raise ValueError("Could not extract enough text from PDF")

        print(f"[Resume Agent] Extracted {len(resume_text)} characters")

        print("[Resume Agent] Running LangChain GPT-4o parsing chain...")
        profile = resume_chain.invoke({"resume_text": resume_text})

        profile["user_id"] = user_id
        profile["raw_text_length"] = len(resume_text)

        print("[Resume Agent] Saving to MongoDB...")
        await save_ai_profile(user_id, profile)

        print(f"[Resume Agent] ✅ Complete. Score: {profile.get('ai_profile_score')}")

        return {"success": True, "profile": profile, "message": "Resume parsed successfully"}

    except Exception as e:
        print(f"[Resume Agent] ❌ Error: {str(e)}")
        return {"success": False, "error": str(e), "message": "Resume parsing failed"}
