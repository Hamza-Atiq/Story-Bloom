#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# StoryBloom — Google Cloud Run Deployment Script
#
# BEFORE RUNNING:
#   1. Install gcloud CLI: https://cloud.google.com/sdk/docs/install
#   2. Run: gcloud auth login
#   3. Set your values in the CONFIG section below
#   4. Run: bash deploy.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e  # Exit immediately on any error

# ── CONFIG — edit these ───────────────────────────────────────────────────────
PROJECT_ID="StoryBloom"        # e.g. storybloom-hackathon
REGION="us-central1"                    # Cloud Run region
SERVICE_NAME="storybloom"               # Cloud Run service name
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
# ─────────────────────────────────────────────────────────────────────────────

echo "🚀 Deploying StoryBloom to Google Cloud Run..."
echo "   Project : $PROJECT_ID"
echo "   Region  : $REGION"
echo "   Image   : $IMAGE"
echo ""

# 1. Set active project
gcloud config set project "$PROJECT_ID"

# 2. Enable required APIs (safe to run multiple times)
echo "📦 Enabling Cloud APIs..."
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  containerregistry.googleapis.com \
  --project "$PROJECT_ID"

# 3. Store GEMINI_API_KEY in Secret Manager (first time only)
#    If the secret already exists this step will fail — that's fine.
echo "🔑 Storing GEMINI_API_KEY in Secret Manager..."
if gcloud secrets describe gemini-api-key --project "$PROJECT_ID" &>/dev/null; then
  echo "   Secret already exists, skipping creation."
else
  echo -n "Enter your GEMINI_API_KEY: "
  read -rs GEMINI_API_KEY
  echo ""
  echo -n "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key \
    --replication-policy="automatic" \
    --data-file=- \
    --project "$PROJECT_ID"
  echo "   Secret created."
fi

# 4. Build the Docker image with Cloud Build
echo "🔨 Building Docker image..."
gcloud builds submit \
  --tag "$IMAGE" \
  --project "$PROJECT_ID"

# 5. Deploy to Cloud Run
echo "☁️  Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --set-secrets "GEMINI_API_KEY=gemini-api-key:latest" \
  --project "$PROJECT_ID"

# 6. Print the live URL
echo ""
echo "✅ Deployment complete!"
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --platform managed \
  --region "$REGION" \
  --format "value(status.url)" \
  --project "$PROJECT_ID")
echo "   Backend URL : $SERVICE_URL"
echo ""
echo "Next step — set this as your frontend env var:"
echo "   NEXT_PUBLIC_BACKEND_URL=$SERVICE_URL"
