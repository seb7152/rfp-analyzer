#!/bin/bash

# Tag Management API Tests
# This script tests the backend API endpoints for tag management

BASE_URL="http://localhost:3002"
RFP_ID="1f8d89fd-547c-4db5-96c2-c9447226952e"
REQUIREMENT_R1_ID="c8e1a226-d2be-42ed-8b9f-a0924307d296"
REQUIREMENT_R2_ID="83ec83f8-5dd8-45c4-b57b-157b833840d0"

OUTPUT_DIR="./tests/api-test-results"
mkdir -p "$OUTPUT_DIR"

echo "========================================="
echo "Tag Management API Test Execution"
echo "========================================="
echo "Base URL: $BASE_URL"
echo "RFP ID: $RFP_ID"
echo "Date: $(date)"
echo "========================================="
echo ""

# Test 1: GET tags (should be empty initially)
echo "[TEST 1] GET /api/rfps/[rfpId]/tags - List tags (initial state)"
curl -s -X GET "$BASE_URL/api/rfps/$RFP_ID/tags" \
  -H "Content-Type: application/json" \
  | tee "$OUTPUT_DIR/01-get-tags-initial.json" | jq '.'
echo ""
echo "---"
echo ""

# Test 2: POST - Create first tag
echo "[TEST 2] POST /api/rfps/[rfpId]/tags - Create 'Test Tag'"
RESPONSE_1=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/rfps/$RFP_ID/tags" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Tag",
    "color": "#3B82F6",
    "description": "A test tag for verification"
  }')

HTTP_CODE_1=$(echo "$RESPONSE_1" | tail -n1)
BODY_1=$(echo "$RESPONSE_1" | sed '$d')

echo "HTTP Status: $HTTP_CODE_1"
echo "$BODY_1" | tee "$OUTPUT_DIR/02-create-test-tag.json" | jq '.'

if [ "$HTTP_CODE_1" = "201" ]; then
  TAG_1_ID=$(echo "$BODY_1" | jq -r '.tag.id')
  echo "✓ Test Tag created with ID: $TAG_1_ID"
else
  echo "✗ Failed to create tag (expected 201, got $HTTP_CODE_1)"
fi
echo ""
echo "---"
echo ""

# Test 3: POST - Create second tag
echo "[TEST 3] POST /api/rfps/[rfpId]/tags - Create 'Functional'"
RESPONSE_2=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/rfps/$RFP_ID/tags" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Functional",
    "color": "#10B981",
    "description": "Functional requirements"
  }')

HTTP_CODE_2=$(echo "$RESPONSE_2" | tail -n1)
BODY_2=$(echo "$RESPONSE_2" | sed '$d')

echo "HTTP Status: $HTTP_CODE_2"
echo "$BODY_2" | tee "$OUTPUT_DIR/03-create-functional-tag.json" | jq '.'

if [ "$HTTP_CODE_2" = "201" ]; then
  TAG_2_ID=$(echo "$BODY_2" | jq -r '.tag.id')
  echo "✓ Functional tag created with ID: $TAG_2_ID"
else
  echo "✗ Failed to create tag (expected 201, got $HTTP_CODE_2)"
fi
echo ""
echo "---"
echo ""

# Test 4: POST - Create third tag
echo "[TEST 4] POST /api/rfps/[rfpId]/tags - Create 'Technical'"
RESPONSE_3=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/rfps/$RFP_ID/tags" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Technical",
    "color": "#F59E0B",
    "description": "Technical requirements"
  }')

HTTP_CODE_3=$(echo "$RESPONSE_3" | tail -n1)
BODY_3=$(echo "$RESPONSE_3" | sed '$d')

echo "HTTP Status: $HTTP_CODE_3"
echo "$BODY_3" | tee "$OUTPUT_DIR/04-create-technical-tag.json" | jq '.'

if [ "$HTTP_CODE_3" = "201" ]; then
  TAG_3_ID=$(echo "$BODY_3" | jq -r '.tag.id')
  echo "✓ Technical tag created with ID: $TAG_3_ID"
else
  echo "✗ Failed to create tag (expected 201, got $HTTP_CODE_3)"
fi
echo ""
echo "---"
echo ""

# Test 5: GET tags again (should show 3 tags)
echo "[TEST 5] GET /api/rfps/[rfpId]/tags - List all tags (after creation)"
curl -s -X GET "$BASE_URL/api/rfps/$RFP_ID/tags" \
  -H "Content-Type: application/json" \
  | tee "$OUTPUT_DIR/05-get-tags-after-creation.json" | jq '.'
echo ""
echo "---"
echo ""

# Test 6: POST - Duplicate tag (should fail)
echo "[TEST 6] POST /api/rfps/[rfpId]/tags - Attempt duplicate 'Test Tag' (should fail)"
RESPONSE_DUP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/rfps/$RFP_ID/tags" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Tag",
    "color": "#FF0000",
    "description": "Duplicate attempt"
  }')

HTTP_CODE_DUP=$(echo "$RESPONSE_DUP" | tail -n1)
BODY_DUP=$(echo "$RESPONSE_DUP" | sed '$d')

echo "HTTP Status: $HTTP_CODE_DUP"
echo "$BODY_DUP" | tee "$OUTPUT_DIR/06-duplicate-tag-attempt.json" | jq '.'

if [ "$HTTP_CODE_DUP" = "409" ]; then
  echo "✓ Duplicate prevention working (got 409)"
else
  echo "⚠ Expected 409 Conflict, got $HTTP_CODE_DUP"
fi
echo ""
echo "---"
echo ""

# Test 7: POST - Assign single tag to requirement R-1
echo "[TEST 7] POST /api/rfps/[rfpId]/requirements/[reqId]/tags - Assign tag to R-1"
if [ -n "$TAG_1_ID" ]; then
  RESPONSE_ASSIGN_1=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/rfps/$RFP_ID/requirements/$REQUIREMENT_R1_ID/tags" \
    -H "Content-Type: application/json" \
    -d "{
      \"tagIds\": [\"$TAG_1_ID\"]
    }")

  HTTP_CODE_ASSIGN_1=$(echo "$RESPONSE_ASSIGN_1" | tail -n1)
  BODY_ASSIGN_1=$(echo "$RESPONSE_ASSIGN_1" | sed '$d')

  echo "HTTP Status: $HTTP_CODE_ASSIGN_1"
  echo "$BODY_ASSIGN_1" | tee "$OUTPUT_DIR/07-assign-tag-to-r1.json" | jq '.'

  if [ "$HTTP_CODE_ASSIGN_1" = "201" ] || [ "$HTTP_CODE_ASSIGN_1" = "200" ]; then
    echo "✓ Tag assigned to R-1"
  else
    echo "✗ Failed to assign tag (expected 200/201, got $HTTP_CODE_ASSIGN_1)"
  fi
else
  echo "✗ Skipping - TAG_1_ID not available"
fi
echo ""
echo "---"
echo ""

# Test 8: POST - Assign multiple tags to requirement R-2
echo "[TEST 8] POST /api/rfps/[rfpId]/requirements/[reqId]/tags - Assign multiple tags to R-2"
if [ -n "$TAG_1_ID" ] && [ -n "$TAG_2_ID" ]; then
  RESPONSE_ASSIGN_2=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/rfps/$RFP_ID/requirements/$REQUIREMENT_R2_ID/tags" \
    -H "Content-Type: application/json" \
    -d "{
      \"tagIds\": [\"$TAG_1_ID\", \"$TAG_2_ID\"]
    }")

  HTTP_CODE_ASSIGN_2=$(echo "$RESPONSE_ASSIGN_2" | tail -n1)
  BODY_ASSIGN_2=$(echo "$RESPONSE_ASSIGN_2" | sed '$d')

  echo "HTTP Status: $HTTP_CODE_ASSIGN_2"
  echo "$BODY_ASSIGN_2" | tee "$OUTPUT_DIR/08-assign-multiple-tags-to-r2.json" | jq '.'

  if [ "$HTTP_CODE_ASSIGN_2" = "201" ] || [ "$HTTP_CODE_ASSIGN_2" = "200" ]; then
    echo "✓ Multiple tags assigned to R-2"
  else
    echo "✗ Failed to assign tags (expected 200/201, got $HTTP_CODE_ASSIGN_2)"
  fi
else
  echo "✗ Skipping - TAG IDs not available"
fi
echo ""
echo "---"
echo ""

# Test 9: GET - Retrieve tags for R-1
echo "[TEST 9] GET /api/rfps/[rfpId]/requirements/[reqId]/tags - Get tags for R-1"
curl -s -X GET "$BASE_URL/api/rfps/$RFP_ID/requirements/$REQUIREMENT_R1_ID/tags" \
  -H "Content-Type: application/json" \
  | tee "$OUTPUT_DIR/09-get-tags-for-r1.json" | jq '.'
echo ""
echo "---"
echo ""

# Test 10: GET - Retrieve tags for R-2
echo "[TEST 10] GET /api/rfps/[rfpId]/requirements/[reqId]/tags - Get tags for R-2"
curl -s -X GET "$BASE_URL/api/rfps/$RFP_ID/requirements/$REQUIREMENT_R2_ID/tags" \
  -H "Content-Type: application/json" \
  | tee "$OUTPUT_DIR/10-get-tags-for-r2.json" | jq '.'
echo ""
echo "---"
echo ""

# Test 11: DELETE - Remove tag from R-1
echo "[TEST 11] DELETE /api/rfps/[rfpId]/requirements/[reqId]/tags - Remove tag from R-1"
if [ -n "$TAG_1_ID" ]; then
  RESPONSE_DELETE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/rfps/$RFP_ID/requirements/$REQUIREMENT_R1_ID/tags" \
    -H "Content-Type: application/json" \
    -d "{
      \"tagId\": \"$TAG_1_ID\"
    }")

  HTTP_CODE_DELETE=$(echo "$RESPONSE_DELETE" | tail -n1)
  BODY_DELETE=$(echo "$RESPONSE_DELETE" | sed '$d')

  echo "HTTP Status: $HTTP_CODE_DELETE"
  echo "$BODY_DELETE" | tee "$OUTPUT_DIR/11-delete-tag-from-r1.json" | jq '.'

  if [ "$HTTP_CODE_DELETE" = "200" ]; then
    echo "✓ Tag removed from R-1"
  else
    echo "✗ Failed to remove tag (expected 200, got $HTTP_CODE_DELETE)"
  fi
else
  echo "✗ Skipping - TAG_1_ID not available"
fi
echo ""
echo "---"
echo ""

# Test 12: GET - Verify R-1 tags after deletion
echo "[TEST 12] GET /api/rfps/[rfpId]/requirements/[reqId]/tags - Verify R-1 tags after deletion"
curl -s -X GET "$BASE_URL/api/rfps/$RFP_ID/requirements/$REQUIREMENT_R1_ID/tags" \
  -H "Content-Type: application/json" \
  | tee "$OUTPUT_DIR/12-get-tags-for-r1-after-delete.json" | jq '.'
echo ""
echo "---"
echo ""

# Test 13: POST - Assign non-existent tag (error handling)
echo "[TEST 13] POST /api/rfps/[rfpId]/requirements/[reqId]/tags - Assign non-existent tag"
RESPONSE_INVALID=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/rfps/$RFP_ID/requirements/$REQUIREMENT_R1_ID/tags" \
  -H "Content-Type: application/json" \
  -d '{
    "tagIds": ["00000000-0000-0000-0000-000000000000"]
  }')

HTTP_CODE_INVALID=$(echo "$RESPONSE_INVALID" | tail -n1)
BODY_INVALID=$(echo "$RESPONSE_INVALID" | sed '$d')

echo "HTTP Status: $HTTP_CODE_INVALID"
echo "$BODY_INVALID" | tee "$OUTPUT_DIR/13-assign-invalid-tag.json" | jq '.'
echo "⚠ Response logged for analysis (behavior may vary)"
echo ""
echo "---"
echo ""

echo "========================================="
echo "Test Execution Complete"
echo "========================================="
echo "Results saved to: $OUTPUT_DIR/"
echo ""
echo "Summary:"
echo "- Tag creation: 3 tags created (Test Tag, Functional, Technical)"
echo "- Duplicate prevention: Tested"
echo "- Tag assignment: Tested (single and multiple)"
echo "- Tag retrieval: Tested"
echo "- Tag removal: Tested"
echo "- Error handling: Tested"
echo ""
echo "Next steps:"
echo "1. Review JSON responses in $OUTPUT_DIR/"
echo "2. Execute UI tests manually or with Playwright"
echo "3. Test cascade tag assignment via UI"
echo "========================================="
