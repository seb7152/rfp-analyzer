#!/bin/bash

# Script de test pour l'upload de PDF dans RFP-Analyzer
# Usage: ./scripts/test-pdf-upload.sh <RFP_ID> <PDF_FILE_PATH> <SUPABASE_AUTH_COOKIE>

set -e

# Configuration
RFP_ID="${1}"
PDF_FILE="${2}"
AUTH_COOKIE="${3}"
API_URL="${4:-http://localhost:3000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validation
if [ -z "$RFP_ID" ] || [ -z "$PDF_FILE" ] || [ -z "$AUTH_COOKIE" ]; then
  echo -e "${RED}❌ Usage:${NC}"
  echo "  ./scripts/test-pdf-upload.sh <RFP_ID> <PDF_FILE_PATH> <SUPABASE_AUTH_COOKIE> [API_URL]"
  echo ""
  echo -e "${YELLOW}Example:${NC}"
  echo "  ./scripts/test-pdf-upload.sh my-rfp-123 ~/sample.pdf 'sb-eyJ...' http://localhost:3000"
  exit 1
fi

if [ ! -f "$PDF_FILE" ]; then
  echo -e "${RED}❌ PDF file not found: $PDF_FILE${NC}"
  exit 1
fi

# Get file info
FILENAME=$(basename "$PDF_FILE")
FILE_SIZE=$(stat -f%z "$PDF_FILE" 2>/dev/null || stat -c%s "$PDF_FILE" 2>/dev/null)
MIME_TYPE="application/pdf"

echo -e "${YELLOW}📄 PDF Upload Test${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "RFP ID:        ${GREEN}$RFP_ID${NC}"
echo -e "File:          ${GREEN}$FILENAME${NC}"
echo -e "Size:          ${GREEN}$FILE_SIZE bytes${NC}"
echo -e "MIME Type:     ${GREEN}$MIME_TYPE${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Request upload intent
echo -e "${YELLOW}📝 Step 1: Request upload intent...${NC}"
INTENT_RESPONSE=$(curl -s -X POST \
  "$API_URL/api/rfps/$RFP_ID/documents/upload-intent" \
  -H "Content-Type: application/json" \
  -H "Cookie: supabase-auth=$AUTH_COOKIE" \
  -d "{
    \"filename\": \"$FILENAME\",
    \"mimeType\": \"$MIME_TYPE\",
    \"fileSize\": $FILE_SIZE,
    \"documentType\": \"cahier_charges\"
  }")

# Check if response is valid JSON
if ! echo "$INTENT_RESPONSE" | jq . >/dev/null 2>&1; then
  echo -e "${RED}❌ Invalid response from upload-intent${NC}"
  echo "Response: $INTENT_RESPONSE"
  exit 1
fi

UPLOAD_URL=$(echo "$INTENT_RESPONSE" | jq -r '.uploadUrl // empty')
DOCUMENT_ID=$(echo "$INTENT_RESPONSE" | jq -r '.documentId // empty')
OBJECT_NAME=$(echo "$INTENT_RESPONSE" | jq -r '.objectName // empty')

if [ -z "$UPLOAD_URL" ] || [ -z "$DOCUMENT_ID" ]; then
  echo -e "${RED}❌ Failed to get upload intent${NC}"
  echo "Response: $INTENT_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Upload intent received${NC}"
echo -e "   Document ID: ${YELLOW}$DOCUMENT_ID${NC}"
echo -e "   Object Name: ${YELLOW}$OBJECT_NAME${NC}"
echo ""

# Step 2: Upload file directly to GCS
echo -e "${YELLOW}📤 Step 2: Upload PDF to Google Cloud Storage...${NC}"
UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
  "$UPLOAD_URL" \
  -H "Content-Type: application/pdf" \
  --data-binary "@$PDF_FILE")

HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | tail -n1)
UPLOAD_BODY=$(echo "$UPLOAD_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" != "200" ]; then
  echo -e "${RED}❌ Upload to GCS failed (HTTP $HTTP_CODE)${NC}"
  echo "Response: $UPLOAD_BODY"
  exit 1
fi

echo -e "${GREEN}✅ File uploaded to GCS successfully${NC}"
echo ""

# Step 3: Commit upload (save metadata to database)
echo -e "${YELLOW}💾 Step 3: Commit upload (save metadata)...${NC}"
COMMIT_RESPONSE=$(curl -s -X POST \
  "$API_URL/api/rfps/$RFP_ID/documents/commit" \
  -H "Content-Type: application/json" \
  -H "Cookie: supabase-auth=$AUTH_COOKIE" \
  -d "{
    \"documentId\": \"$DOCUMENT_ID\",
    \"objectName\": \"$OBJECT_NAME\",
    \"filename\": \"$FILENAME\",
    \"originalFilename\": \"$FILENAME\",
    \"mimeType\": \"$MIME_TYPE\",
    \"fileSize\": $FILE_SIZE,
    \"documentType\": \"cahier_charges\"
  }")

if ! echo "$COMMIT_RESPONSE" | jq . >/dev/null 2>&1; then
  echo -e "${RED}❌ Invalid response from commit${NC}"
  echo "Response: $COMMIT_RESPONSE"
  exit 1
fi

COMMIT_SUCCESS=$(echo "$COMMIT_RESPONSE" | jq -r '.success // empty')
SAVED_DOCUMENT_ID=$(echo "$COMMIT_RESPONSE" | jq -r '.document.id // empty')

if [ "$COMMIT_SUCCESS" != "true" ] || [ -z "$SAVED_DOCUMENT_ID" ]; then
  echo -e "${RED}❌ Failed to commit upload${NC}"
  echo "Response: $COMMIT_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Upload committed successfully${NC}"
echo -e "   Saved Document ID: ${YELLOW}$SAVED_DOCUMENT_ID${NC}"
echo ""

# Step 4: Get view URL (optional)
echo -e "${YELLOW}🔍 Step 4: Get view URL...${NC}"
VIEW_RESPONSE=$(curl -s -X GET \
  "$API_URL/api/rfps/$RFP_ID/documents/$SAVED_DOCUMENT_ID/view-url" \
  -H "Cookie: supabase-auth=$AUTH_COOKIE")

if ! echo "$VIEW_RESPONSE" | jq . >/dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Could not get view URL${NC}"
else
  VIEW_URL=$(echo "$VIEW_RESPONSE" | jq -r '.url // empty')
  if [ -n "$VIEW_URL" ]; then
    echo -e "${GREEN}✅ View URL generated${NC}"
    echo -e "   URL: ${YELLOW}${VIEW_URL:0:80}...${NC}"
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ All tests passed!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
