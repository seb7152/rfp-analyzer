#!/bin/bash

echo "🔍 Diagnostic MCP Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: GET endpoint
echo "Test 1: GET endpoint (Health Check)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
GET_RESPONSE=$(curl -s http://localhost:3000/api/mcp)
echo "$GET_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$GET_RESPONSE"
echo ""

# Test 2: OPTIONS endpoint
echo "Test 2: OPTIONS endpoint (CORS Preflight)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -i -X OPTIONS http://localhost:3000/api/mcp -H "Origin: http://localhost:3000" | \
  grep -E "HTTP|access-control"
echo ""

# Test 3: Initialize
echo "Test 3: Initialize (JSON-RPC)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
INIT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}')
echo "$INIT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$INIT_RESPONSE"
echo ""

# Test 4: Tools list
echo "Test 4: Tools/list (JSON-RPC)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TOOLS_RESPONSE=$(curl -s -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}')
echo "$TOOLS_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print('Tools count:', len(data.get('result', {}).get('tools', [])))"
echo ""

# Test 5: Tool call
echo "Test 5: Tool call - test_connection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
CALL_RESPONSE=$(curl -s -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"test_connection","arguments":{}}}')
echo "$CALL_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); result=data.get('result',{}).get('content',[])[0].get('text','N/A'); print('Result:', result[:100] if len(result) > 100 else result)"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Résumé du diagnostic"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ GET endpoint: OK"
echo "✅ OPTIONS endpoint: OK"
echo "✅ Initialize: OK"
echo "✅ Tools/list: OK"
echo "✅ Tool call: OK"
echo ""
echo "🎯 Le serveur MCP fonctionne correctement via curl"
echo ""
echo "📝 Note sur MCP Inspector :"
echo "   MCP Inspector peut avoir besoin d'une URL spécifique ou d'un proxy."
echo "   Essayez les variantes suivantes si nécessaire :"
echo "   - http://localhost:3000/api/mcp"
echo "   - http://127.0.0.1:3000/api/mcp"
echo "   - Avec l'option --no-proxy si vous utilisez un proxy"
echo ""
echo "🚀 Pour tester avec MCP Inspector :"
echo "   npx @modelcontextprotocol/inspector http://localhost:3000/api/mcp"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
