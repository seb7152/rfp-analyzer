#!/bin/bash

echo "🚀 Démarrage du serveur Next.js..."
npm run dev &
DEV_PID=$!

echo "⏳ Attente du démarrage du serveur (15s)..."
sleep 15

echo "🧪 Test 1: Initialize request..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}')

echo "📥 Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

echo ""
echo "🧪 Test 2: Tools/list request..."
RESPONSE2=$(curl -s -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}')

echo "📥 Response:"
echo "$RESPONSE2" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE2"

echo ""
echo "🧪 Test 3: Tool call - test_connection..."
RESPONSE3=$(curl -s -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"test_connection","arguments":{}}}')

echo "📥 Response:"
echo "$RESPONSE3" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE3"

echo ""
echo "✅ Tests terminés. Arrêt du serveur..."
kill $DEV_PID 2>/dev/null

echo "🏁 Session terminée"
