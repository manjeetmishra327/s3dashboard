import os


def get_chroma_persist_dir() -> str:
    return os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
