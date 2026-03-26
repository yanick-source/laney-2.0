# app/config.py
import os
from dotenv import load_dotenv

load_dotenv()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/app/static")
SECRET_KEY = os.getenv("SECRET_KEY", "photo_book")  # Change this to a more secure value
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "-")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
