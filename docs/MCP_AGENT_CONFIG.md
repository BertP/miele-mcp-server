# Compact MCP Configuration for AI Agents

This guide shows how to connect the Miele MCP Server (`https://mielemcp.never2sunny.eu` / `192.168.1.251:8089`) to the most common AI agents and clients.

> [!IMPORTANT]
> **Recommended connection type:** Prefer **Streamable HTTP** (`/mcp/stream`). The legacy SSE protocol (`/mcp/sse`) causes reconnect loops and authentication issues with Claude Desktop when connecting to remotely hosted servers.

---

## 1. Claude (Claude Desktop & Claude Code)

### Claude Desktop
Add the following to your `claude_desktop_config.json` (paths: Windows `%APPDATA%\Claude\`, macOS `~/Library/Application Support/Claude/`, Linux `~/.config/Claude/`):

```json
{
  "mcpServers": {
    "miele-appliance-sentinel": {
      "type": "http",
      "url": "https://mielemcp.never2sunny.eu/mcp/stream",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_API_TOKEN"
      }
    }
  }
}
```

### Claude Code (CLI)
Add the server via the CLI:
```bash
claude mcp add miele-appliance-sentinel https://mielemcp.never2sunny.eu/mcp/stream --auth "Bearer YOUR_MCP_API_TOKEN"
```

---

## 2. Gemini (Android Studio & Gemini CLI / Project IDX)

### Android Studio (Gemini in Android Studio)
Enable under **Settings > Tools > AI > MCP Servers** and add to `mcp.json`:

```json
{
  "mcpServers": {
    "miele-appliance-sentinel": {
      "type": "http",
      "url": "https://mielemcp.never2sunny.eu/mcp/stream",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_API_TOKEN"
      }
    }
  }
}
```

### Gemini CLI
If you are using the official Gemini CLI, add the server to the global `settings.json` under `mcpServers`:
```json
"miele-appliance-sentinel": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/client-http", "https://mielemcp.never2sunny.eu/mcp/stream", "--auth", "Bearer YOUR_MCP_API_TOKEN"]
}
```

---

## 3. ChatGPT & IDE Agents (Cursor / Windsurf / Custom GPTs)

### Cursor & Windsurf (Recommended for developer agents)
The easiest way is to connect directly through the UI:

1. Open **Settings** (gear icon in Cursor).
2. Go to **Features > MCP**.
3. Click **"+ Add New MCP Server"**.
4. Enter the following values:
   - **Name:** `miele-appliance-sentinel`
   - **Type:** `HTTP` (if available) or `SSE`
   - **URL:**
     - For **HTTP**: `https://mielemcp.never2sunny.eu/mcp/stream` (with header `Authorization: Bearer YOUR_MCP_API_TOKEN`)
     - For **SSE**: `https://mielemcp.never2sunny.eu/mcp/sse?token=YOUR_MCP_API_TOKEN` (if the client does not support HTTP headers in SSE mode)

### Custom GPTs (ChatGPT Plus)
For Custom GPTs in the ChatGPT web interface, register the server as an **Action** via OpenAPI. Since the MCP standard is mapped over HTTP endpoints, you can secure the tools via the `/mcp/stream` route with a Bearer token. Alternatively, gateways such as `mcp-gateway` can intercept the JSON-RPC requests.

---

## 4. MCP Inspector (Debugging Tool)

### Option A: Via Streamable HTTP (Recommended)
Connect the Inspector directly to the secure HTTP stream:

1. Start the Inspector locally:
   ```bash
   npx @modelcontextprotocol/inspector
   ```
2. Select **Transport Type**: `HTTP` or `Stream` from the dropdown
3. Enter as **URL**: `https://mielemcp.never2sunny.eu/mcp/stream`
4. Expand **Headers** and add:
   - **Key:** `Authorization`
   - **Value:** `Bearer YOUR_MCP_API_TOKEN`

### Option B: Via SSE (Fallback / Development only)
1. Select **Transport Type**: `SSE` in the Inspector
2. Enter as **URL**:
   ```
   https://mielemcp.never2sunny.eu/mcp/sse?token=YOUR_MCP_API_TOKEN
   ```
