# MCP Server Testing Guide

**Status**: ✅ Server is working and ready to test

## Quick Start: Test with MCP Inspector

### 1. Start the MCP Server

```bash
cd /path/to/RFP-Analyzer
node mcp-server.js
```

Output should show:

```
[MCP] Server listening on http://127.0.0.1:3001
[MCP] For MCP Inspector, use: http://127.0.0.1:3001
```

### 2. Test with curl (Quick Verification)

In another terminal:

```bash
# Test initialize
curl -X POST "http://127.0.0.1:3001/" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","id":1}' | jq .

# List available tools
curl -X POST "http://127.0.0.1:3001/" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' | jq .

# Call a tool: get_rfps
curl -X POST "http://127.0.0.1:3001/" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_rfps","arguments":{"limit":5}},"id":1}' | jq .
```

### 3. Test with MCP Inspector (Full UI)

#### Option A: Using Claude Code Settings (Recommended)

Claude Code automatically detects `.mcp.json` configuration. The inspector should see:

```bash
# In Claude Code terminal or your IDE
npx @modelcontextprotocol/inspector
```

Then select `rfp-analyzer` from the server list.

#### Option B: Direct URL Connection

```bash
# Open MCP Inspector and connect to:
http://127.0.0.1:3001/
```

## Available Tools

| Tool                    | Description          | Parameters                                                       |
| ----------------------- | -------------------- | ---------------------------------------------------------------- |
| `test_connection`       | Health check         | None                                                             |
| `get_rfps`              | List RFPs            | `limit` (optional, default: 50), `offset` (optional, default: 0) |
| `get_requirements`      | Get RFP requirements | `rfp_id` (required), `limit`, `offset`                           |
| `get_requirements_tree` | Hierarchical view    | `rfp_id` (required), `flatten` (optional)                        |
| `list_suppliers`        | List suppliers       | `rfp_id` (required), `limit`, `offset`                           |

## Example Queries

### Get all RFPs

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_rfps",
    "arguments": {
      "limit": 10,
      "offset": 0
    }
  },
  "id": 1
}
```

### Get requirements for an RFP

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_requirements",
    "arguments": {
      "rfp_id": "rfp-001",
      "limit": 20
    }
  },
  "id": 2
}
```

### Get hierarchical requirements tree

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_requirements_tree",
    "arguments": {
      "rfp_id": "rfp-001",
      "flatten": false
    }
  },
  "id": 3
}
```

### List suppliers for RFP

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "list_suppliers",
    "arguments": {
      "rfp_id": "rfp-001"
    }
  },
  "id": 4
}
```

## Current Implementation Status

### ✅ Working

- ✅ JSON-RPC 2.0 protocol
- ✅ Tool definitions with `outputSchema`
- ✅ Tool annotations (`readOnlyHint`, `idempotentHint`)
- ✅ CORS headers for cross-origin requests
- ✅ Error handling with proper JSON-RPC error codes
- ✅ Mock data for testing

### ⏳ Next Steps (Phase 2)

- Integrate real data from Supabase
- Add authentication via Bearer tokens
- Add response/score tools
- Add filtering (priority, category, search)
- Improve error messages

## Troubleshooting

### Server won't start

```bash
# Check if port 3001 is in use
lsof -i :3001

# Kill existing process
kill -9 <PID>

# Try different port
MCP_PORT=3002 node mcp-server.js
```

### Inspector can't connect

```bash
# Verify server is running
curl http://127.0.0.1:3001/

# Should return:
# {"status":"ok","server":{...},"protocol":"jsonrpc-2.0",...}
```

### Invalid request error

- Ensure JSON is properly formatted
- Check that required parameters are provided
- Verify method names match exactly (case-sensitive)

## Architecture

```
mcp-server.js (HTTP server on port 3001)
├── initialize → Server info
├── tools/list → List available tools with schemas
└── tools/call → Execute tool with arguments
    ├── test_connection
    ├── get_rfps
    ├── get_requirements
    ├── get_requirements_tree
    └── list_suppliers

.mcp.json → Configuration for Claude Code
```

## Next: Integration with Real Data

Once testing with mock data is successful, the next phase will:

1. **Replace mock data** with Supabase queries
2. **Add authentication** with JWT tokens
3. **Add more tools** (responses, scores, analysis)
4. **Add advanced filtering** (priority, category, search)
5. **Improve error handling** with detailed messages

See [MCP_IMPLEMENTATION_IMPROVEMENTS.md](./MCP_IMPLEMENTATION_IMPROVEMENTS.md) for the full roadmap.
