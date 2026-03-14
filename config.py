import os
from dotenv import load_dotenv

load_dotenv()

GENAI_API_KEY = os.getenv("GENAI_API_KEY")
MODEL_NAME = "gemini-2.5-flash"
