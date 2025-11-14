# PDF Upload Testing Guide

## Overview

This document explains how to test the RFP PDF upload functionality, which stores documents in Google Cloud Storage (GCS) and maintains metadata in Supabase.

## Prerequisites

1. **Running application** with Supabase and GCS configured
2. **Sample PDF file** for testing
3. **Valid authentication** (Supabase auth cookie)
4. **RFP ID** of an existing RFP

## Setup

### 1. Create a Test RFP

First, create an RFP through the web interface or use an existing one.

### 2. Gather Credentials

You'll need:

- **RFP ID**: From the dashboard or URL (e.g., `/dashboard/rfp/my-rfp-123`)
- **Auth Cookie**: Available in browser DevTools:
  1. Open browser DevTools (F12)
  2. Go to Application → Cookies
  3. Find cookie starting with `supabase-auth-token` or similar
  4. Copy the full cookie value

### 3. Prepare Test PDF

Create a simple PDF file for testing:

```bash
# Using macOS/Linux with a command-line tool
echo "Test PDF Content" | enscript -B -p - | ps2pdf - test.pdf

# Or download a sample PDF
curl -o test.pdf https://www.w3.org/WAI/WCAG21/Techniques/pdf/img/table.pdf
```

## Testing Methods

### Method 1: Using the Web Interface

1. Go to `/dashboard/rfp/[rfpId]/evaluate`
2. Look for the "Upload Documents" section (to be implemented)
3. Drag and drop a PDF or click to select
4. Monitor upload progress
5. Verify file appears in the documents list

### Method 2: Using cURL (Command Line)

```bash
# Variables
RFP_ID="your-rfp-id"
PDF_FILE="./test.pdf"
AUTH_COOKIE="sb-eyJ..." # Your Supabase auth cookie
API_URL="http://localhost:3000"

# Step 1: Request upload intent
curl -X POST "$API_URL/api/rfps/$RFP_ID/documents/upload-intent" \
  -H "Content-Type: application/json" \
  -H "Cookie: supabase-auth=$AUTH_COOKIE" \
  -d '{
    "filename": "test.pdf",
    "mimeType": "application/pdf",
    "fileSize": 1024,
    "documentType": "cahier_charges"
  }' | jq .

# Response should include:
# {
#   "uploadUrl": "https://storage.googleapis.com/...",
#   "documentId": "550e8400-...",
#   "objectName": "rfps/org-123/rfp-456/doc-789-test.pdf",
#   "expiresAt": "2025-11-11T12:32:00Z"
# }
```

### Method 3: Using the Test Script

```bash
# Make the script executable
chmod +x scripts/test-pdf-upload.sh

# Run the test
./scripts/test-pdf-upload.sh "my-rfp-123" "./test.pdf" "sb-eyJ..." http://localhost:3000
```

Expected output:

```
📄 PDF Upload Test
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RFP ID:        my-rfp-123
File:          test.pdf
Size:          12345 bytes
MIME Type:     application/pdf
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Step 1: Request upload intent...
✅ Upload intent received
   Document ID: 550e8400-e29b-41d4-a716-446655440000
   Object Name: rfps/org-123/my-rfp-123/doc-789-test.pdf

📤 Step 2: Upload PDF to Google Cloud Storage...
✅ File uploaded to GCS successfully

💾 Step 3: Commit upload (save metadata)...
✅ Upload committed successfully
   Saved Document ID: 550e8400-e29b-41d4-a716-446655440000

🔍 Step 4: Get view URL...
✅ View URL generated
   URL: https://storage.googleapis.com/...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All tests passed!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## API Endpoints Reference

### Upload Intent

**POST** `/api/rfps/[rfpId]/documents/upload-intent`

Request:

```json
{
  "filename": "cahier-charges.pdf",
  "mimeType": "application/pdf",
  "fileSize": 2048000,
  "documentType": "cahier_charges"
}
```

Response (200):

```json
{
  "uploadUrl": "https://storage.googleapis.com/...",
  "documentId": "550e8400-e29b-41d4-a716-446655440000",
  "objectName": "rfps/org-123/rfp-456/doc-789-cahier-charges.pdf",
  "expiresAt": "2025-11-11T12:32:00Z"
}
```

### Commit Upload

**POST** `/api/rfps/[rfpId]/documents/commit`

Request:

```json
{
  "documentId": "550e8400-e29b-41d4-a716-446655440000",
  "objectName": "rfps/org-123/rfp-456/doc-789-cahier-charges.pdf",
  "filename": "cahier-charges.pdf",
  "mimeType": "application/pdf",
  "fileSize": 2048000,
  "documentType": "cahier_charges"
}
```

Response (200):

```json
{
  "success": true,
  "document": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "rfp_id": "rfp-456",
    "filename": "cahier-charges.pdf",
    "file_size": 2048000,
    "mime_type": "application/pdf",
    "document_type": "cahier_charges",
    "uploaded_at": "2025-11-11T12:02:00Z"
  }
}
```

### Get View URL

**GET** `/api/rfps/[rfpId]/documents/[documentId]/view-url`

Response (200):

```json
{
  "url": "https://storage.googleapis.com/...",
  "expiresAt": "2025-11-11T12:32:00Z",
  "pageCount": 15
}
```

### List Documents

**GET** `/api/rfps/[rfpId]/documents`

Response (200):

```json
{
  "documents": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "filename": "cahier-charges.pdf",
      "document_type": "cahier_charges",
      "file_size": 2048000,
      "created_at": "2025-11-11T12:02:00Z"
    }
  ],
  "count": 1
}
```

### Delete Document

**DELETE** `/api/rfps/[rfpId]/documents?documentId=[documentId]`

Response (200):

```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

## Error Handling

### Common Errors

| Error                             | Status | Cause                | Solution               |
| --------------------------------- | ------ | -------------------- | ---------------------- |
| `Unauthorized`                    | 401    | Missing/invalid auth | Check auth cookie      |
| `RFP not found`                   | 404    | Invalid RFP ID       | Verify RFP exists      |
| `Access denied`                   | 403    | Wrong organization   | Check user permissions |
| `Only PDF files are allowed`      | 400    | Wrong file type      | Use PDF files only     |
| `File size exceeds maximum`       | 400    | File too large       | Max 50MB               |
| `File not found in cloud storage` | 404    | GCS sync failed      | Retry upload           |

## Monitoring & Debugging

### Check GCS Bucket

```bash
# List uploaded files
gsutil -m ls -r gs://rfp-analyzer-storage/rfps/

# Check file metadata
gsutil stat gs://rfp-analyzer-storage/rfps/org-123/rfp-456/doc-789-test.pdf

# Delete test files
gsutil -m rm gs://rfp-analyzer-storage/rfps/**/*test*.pdf
```

### Check Database

```sql
-- List uploaded documents
SELECT id, rfp_id, filename, file_size, created_at
FROM rfp_documents
WHERE rfp_id = 'your-rfp-id'
ORDER BY created_at DESC;

-- Check access logs
SELECT document_id, action, user_id, created_at
FROM document_access_logs
WHERE rfp_id = 'your-rfp-id'
ORDER BY created_at DESC;

-- Verify RLS is working
SELECT * FROM rfp_documents
WHERE organization_id = auth.jwt() ->> 'organization_id';
```

### Enable Debug Logging

Set environment variables:

```bash
export DEBUG=true
export LOG_LEVEL=debug
```

Check logs:

```bash
# Vercel logs
vercel logs <project-name> --prod

# Local development
npm run dev -- --verbose
```

## Performance Testing

### Load Testing with Multiple Files

```bash
#!/bin/bash

for i in {1..10}; do
  echo "Uploading file $i/10..."
  ./scripts/test-pdf-upload.sh "my-rfp-123" "./test.pdf" "$AUTH_COOKIE" &
  sleep 1
done

wait
echo "All uploads completed!"
```

### Monitoring Upload Times

```bash
# Measure end-to-end time
time ./scripts/test-pdf-upload.sh "my-rfp-123" "./test.pdf" "$AUTH_COOKIE"

# Expected timing:
# - Upload intent: ~200ms
# - GCS upload: ~500ms-2s (depends on file size)
# - Commit: ~200ms
# Total: ~1s for typical files
```

## Security Verification

### Test RLS (Row Level Security)

1. Upload a document to RFP-A as User-1
2. Try to access it as User-2 (different organization)
3. Should return 403 Forbidden

```bash
# As User-1
./scripts/test-pdf-upload.sh "rfp-a-123" "./test.pdf" "$USER1_COOKIE"

# As User-2
curl -X GET "http://localhost:3000/api/rfps/rfp-a-123/documents" \
  -H "Cookie: supabase-auth=$USER2_COOKIE"
# Should fail with 403
```

### Test URL Expiration

1. Get a view URL with TTL=10 seconds
2. Wait 15 seconds
3. Try to download using the URL
4. Should fail with 403 Forbidden

```bash
# Get view URL
VIEW_RESPONSE=$(curl -s -X GET \
  "http://localhost:3000/api/rfps/$RFP_ID/documents/$DOC_ID/view-url" \
  -H "Cookie: supabase-auth=$AUTH_COOKIE")

URL=$(echo "$VIEW_RESPONSE" | jq -r '.url')

# Download immediately (should work)
curl -I "$URL"

# Wait for expiration
sleep 15

# Try again (should fail)
curl -I "$URL"
```

## Next Steps

After successful testing:

1. **Integrate into UI**: Add document upload widget to `/dashboard/rfp/[rfpId]/evaluate`
2. **Build PDF viewer**: Implement RFPDocumentViewer component for ComparisonView
3. **Add document management**: List, reorder, and delete documents
4. **Extract content**: Implement PDF text extraction for requirement matching

## References

- [CLOUD-ARCHITECTURE.md](./CLOUD-ARCHITECTURE.md) - Full architecture details
- [GCP Storage Documentation](https://cloud.google.com/storage/docs)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
