from google import genai
from config import GENAI_API_KEY, MODEL_NAME

client = genai.Client(api_key=GENAI_API_KEY)

async def generate_story(prompt: str) -> str:
    response = client.models.generate_content(model=MODEL_NAME, contents=prompt)
    return response.text

    