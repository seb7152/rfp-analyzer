#!/bin/bash

# Get access token from gcloud
ACCESS_TOKEN=$(gcloud auth print-access-token)

# Test Vertex AI Search without filter first
curl -X POST \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  "https://discoveryengine.googleapis.com/v1/projects/895472224132/locations/global/collections/default_collection/engines/rfp-rag-1772536484/servingConfigs/default_search:search" \
  -d '{
    "query": "planning",
    "pageSize": 2,
    "contentSearchSpec": {
      "summarySpec": {
        "summaryResultCount": 2,
        "includeCitations": true
      }
    }
  }' 2>&1 | head -100
