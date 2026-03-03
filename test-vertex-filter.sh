#!/bin/bash

ACCESS_TOKEN=$(gcloud auth print-access-token)

echo "=== Testing filter with uri field ==="
curl -X POST \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  "https://discoveryengine.googleapis.com/v1/projects/895472224132/locations/global/collections/default_collection/engines/rfp-rag-1772536484/servingConfigs/default_search:search" \
  -d '{
    "query": "planning",
    "pageSize": 2,
    "filter": "uri = \"gs://rfps-documents/rfps/b4e485c1-b045-463e-a95e-718d8cdacc62/4fef2cbb-30df-45af-a1ce-f9fa11ec2d54/documents/2a156ea5-a7c6-4156-b594-90034d79b937-Cardiweb_x_IZIX_-_Proposition_SmartParking_ENGIE.pdf\"",
    "contentSearchSpec": {
      "summarySpec": {
        "summaryResultCount": 2,
        "includeCitations": true
      }
    }
  }' 2>&1
