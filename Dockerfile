# ── StoryBloom Backend — Google Cloud Run ────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Create runtime directories (Cloud Run filesystem is ephemeral)
RUN mkdir -p audio_temp images_temp

# Cloud Run injects $PORT (default 8080). Never hard-code the port.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
