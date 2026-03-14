import os
from dotenv import load_dotenv

# Load env BEFORE uvicorn spawns anything
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(dotenv_path=os.path.join(BASE_DIR, '.env'), override=True)

# Set explicitly in os.environ so subprocess inherits it
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY", "")
os.environ["MONGODB_URI"] = os.getenv("MONGODB_URI", "")
os.environ["MONGODB_DB_NAME"] = os.getenv("MONGODB_DB_NAME", "s3_dashboard")

print(f"[Run] OpenAI Key: {'✅' if os.environ.get('OPENAI_API_KEY') else '❌'}")

import uvicorn

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)