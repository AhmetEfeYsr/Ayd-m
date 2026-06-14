#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-"yks-platform-demo"}
REGION=${GCP_REGION:-"europe-west3"} # Frankfurt region (close to Turkey)
STAGE=${STAGE:-"prod"}

echo "--------------------------------------------------------"
echo "Deploying YKS Cloud Workers to Google Cloud Functions (Gen 2)"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Stage: $STAGE"
echo "--------------------------------------------------------"

# 1. Compile TypeScript code
echo "Building package..."
cd "$(dirname "$0")"
pnpm run build

# 2. Deploy individual handlers to Cloud Functions Gen 2
# GCF expects functions to be exported, we use '--entry-point' to map to our gcf handlers.

# Deploy Send SMS Function
echo "Deploying gcfSendSms..."
gcloud functions deploy yks-send-sms-${STAGE} \
  --gen2 \
  --runtime=nodejs20 \
  --region=$REGION \
  --project=$PROJECT_ID \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point=gcfSendSms \
  --memory=256Mi \
  --timeout=60s

# Deploy Send WhatsApp Function
echo "Deploying gcfSendWhatsapp..."
gcloud functions deploy yks-send-whatsapp-${STAGE} \
  --gen2 \
  --runtime=nodejs20 \
  --region=$REGION \
  --project=$PROJECT_ID \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point=gcfSendWhatsapp \
  --memory=256Mi \
  --timeout=60s

# Deploy AI Parse Function
echo "Deploying gcfAiParse..."
gcloud functions deploy yks-ai-parse-${STAGE} \
  --gen2 \
  --runtime=nodejs20 \
  --region=$REGION \
  --project=$PROJECT_ID \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point=gcfAiParse \
  --memory=1024Mi \
  --timeout=120s

# Deploy Vector Match Function
echo "Deploying gcfVectorMatch..."
gcloud functions deploy yks-vector-match-${STAGE} \
  --gen2 \
  --runtime=nodejs20 \
  --region=$REGION \
  --project=$PROJECT_ID \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point=gcfVectorMatch \
  --memory=512Mi \
  --timeout=60s

# Deploy Telegram Report Function
echo "Deploying gcfTelegramReport..."
gcloud functions deploy yks-telegram-report-${STAGE} \
  --gen2 \
  --runtime=nodejs20 \
  --region=$REGION \
  --project=$PROJECT_ID \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point=gcfTelegramReport \
  --memory=256Mi \
  --timeout=60s

echo "--------------------------------------------------------"
echo "Google Cloud Functions deployment completed successfully!"
echo "--------------------------------------------------------"
