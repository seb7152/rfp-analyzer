#!/bin/bash

ACCESS_TOKEN=$(gcloud auth print-access-token)

echo "=== Test 1: Simple query 'planning' ==="
curl -X POST \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  "https://discoveryengine.googleapis.com/v1/projects/895472224132/locations/global/collections/default_collection/engines/rfp-rag-1772536484/servingConfigs/default_search:search" \
  -d '{
    "query": "planning",
    "pageSize": 5
  }' 2>&1 | grep -E "(totalSize|id|title)" | head -20

echo ""
echo "=== Test 2: Query in French 'c'\''est quoi le planning' ==="
curl -X POST \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  "https://discoveryengine.googleapis.com/v1/projects/895472224132/locations/global/collections/default_collection/engines/rfp-rag-1772536484/servingConfigs/default_search:search" \
  -d '{
    "query": "c'\''est quoi le planning",
    "pageSize": 5
  }' 2>&1 | grep -E "(totalSize|id|title)" | head -20

echo ""
echo "=== Test 3: Simple query 'document' ==="
curl -X POST \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  "https://discoveryengine.googleapis.com/v1/projects/895472224132/locations/global/collections/default_collection/engines/rfp-rag-1772536484/servingConfigs/default_search:search" \
  -d '{
    "query": "document",
    "pageSize": 5
  }' 2>&1 | grep -E "(totalSize|id|title)" | head -20
