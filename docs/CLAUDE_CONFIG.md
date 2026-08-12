# Claude Desktop Integration – Miele MCP Server

## Overview

The Miele MCP Server runs on **`192.168.1.251:8089`** and is publicly accessible at **`https://mielemcp.never2sunny.eu`**. It exposes 14 MCP tools that allow Claude to interact with Miele home appliances.

---

## Prerequisite: Miele OAuth Login

**Once**, the connection to Miele must be authorized:

1. Open in your browser: `https://mielemcp.never2sunny.eu/auth/login`
2. Log in with your Miele account and grant access to your appliances.
3. After successful login you will be redirected to a success page.
4. The server stores the tokens persistently in the SQLite database and refreshes them automatically.

Authentication status can be checked at any time: `https://mielemcp.never2sunny.eu/health`

---

## Claude Desktop Configuration

### Locating the configuration file

| Operating System | Path |
|---|---|
| **Windows** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **macOS** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Linux** | `~/.config/Claude/claude_desktop_config.json` |

---

### Option A: SSE connection (Legacy – **not recommended**)

> ⚠️ **Deprecated:** The Miele MCP Server supports the SSE endpoint (`/mcp/sse`) only for development tooling (MCP Inspector). Using it from Claude Desktop results in an endless reconnect loop and token-refresh errors. Please use Option C instead.

```json
{
  "mcpServers": {
    "miele-appliance-sentinel": {
      "type": "sse",
      "url": "https://mielemcp.never2sunny.eu/mcp/sse?token=YOUR_MCP_API_TOKEN"
    }
  }
}
```

> **Note:** Replace `YOUR_MCP_API_TOKEN` with the value of `MCP_API_TOKEN` from the server's `.env` file. Whenever the token is rotated, this configuration must be updated accordingly.

---

### Option B: Local network connection (faster, no SSL)

If Claude Desktop runs on the same network as the server (192.168.1.251):

```json
{
  "mcpServers": {
    "miele-appliance-sentinel": {
      "type": "sse",
      "url": "http://192.168.1.251:8089/mcp/sse?token=YOUR_MCP_API_TOKEN"
    }
  }
}
```

---

### Option C: Streamable HTTP – ✅ Recommended for Claude Desktop

For Claude Desktop (v1.x+) and all modern MCP clients. **This is the only reliably working option for Claude Desktop**, as the server's primary transport is Streamable HTTP (`/mcp/stream`):

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

---

## Available Tools

Once Claude Desktop is connected, the following 14 tools are available automatically:

| Tool | Description |
|---|---|
| `list_devices` | List all connected Miele appliances |
| `get_device` | Retrieve full details of a device |
| `get_device_state` | Read current status (temperature, remaining time, program) |
| `get_device_actions` | Query available actions for a device |
| `get_device_programs` | List available programs for a device |
| `get_device_ident` | Retrieve identity data (model, serial number) |
| `get_all_filling_levels` | Check filling levels of all devices (salt, rinse aid, detergent) |
| `get_device_filling_levels` | Check filling levels of a specific device |
| `get_failure_details` | Retrieve error messages and fault details |
| `get_device_last_used_programs` | Retrieve last used programs for a device |
| `get_device_camera` | Live camera image from oven (requires `mcs_thirdparty_media` scope) |
| `put_device_action` | Send an action to a device (with preflight check & dry-run mode) |
| `start_device_program` | Start a program on a device (with preflight check & dry-run mode) |
| `get_operation_log` | Retrieve recent write operations and their preflight results (audit log) |

---

## Security Notes

- The `MCP_API_TOKEN` secures access to the MCP server. Do not share your config file.
- The Miele OAuth token is **not** exposed in URLs – it is handled internally on the server.
- Write operations (`put_device_action`, `start_device_program`) always perform a preflight check against the Miele API before executing.
- The `dryRun: true` parameter can be used to simulate any write operation without actually controlling the appliance.

---

## Testing the Connection

### Health check (server & token status):
```bash
curl https://mielemcp.never2sunny.eu/health
```

Expected response (authenticated):
```json
{
  "status": "ok",
  "database": "connected",
  "auth": {
    "authenticated": true,
    "expiresInSeconds": 3542,
    "tokenStatus": "valid"
  },
  "sessions": {
    "streamable": 1,
    "sse": 0
  }
}
```

### Retrieve tool list via curl:

**Step 1 – Initialize session:**
```bash
curl -X POST https://mielemcp.never2sunny.eu/mcp/stream \
  -H "Authorization: Bearer YOUR_MCP_API_TOKEN" \
  -H "Accept: application/json, text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'
```
*(Save the `mcp-session-id` header from the response.)*

**Step 2 – List tools:**
```bash
curl -X POST https://mielemcp.never2sunny.eu/mcp/stream \
  -H "Authorization: Bearer YOUR_MCP_API_TOKEN" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

---

## Network Topology

```
Claude Desktop (any machine)
      |
      | HTTPS (Port 443)
      v
https://mielemcp.never2sunny.eu
      |
      | Nginx Reverse Proxy
      v
http://192.168.1.251:8089   ← Miele MCP Server (Docker Container)
      |
      | REST + OAuth2 Bearer Token
      v
https://api.mcs3.miele.com/v1  ← Miele 3rd Party API
```

---

## Troubleshooting

| Error | Cause | Solution |
|---|---|---|
| `401 Unauthorized` | Token missing or incorrect | Check token in config |
| `auth.authenticated: false` | No Miele login | Open `https://mielemcp.never2sunny.eu/auth/login` |
| `Cannot POST /register` | Inspector in proxy mode | Set Connection Type to `Direct` |
| `SSE error: Failed to fetch` | CORS issue | Use incognito mode; pass token in URL (not as header) |
| `No valid token available` + endless reconnect loop in logs | Refresh token expired (`invalid_grant`) **and/or** wrong endpoint (`/mcp/sse`) | 1. Re-login: `https://mielemcp.never2sunny.eu/auth/login` 2. Switch config to Option C (Streamable HTTP) |
| `Failed to refresh token` / `invalid_grant` | Miele has invalidated the refresh token (e.g. after extended inactivity or a server restart) | Re-login once: `https://mielemcp.never2sunny.eu/auth/login` |

---

## Known Limitations

- The server's production transport is Streamable HTTP (`/mcp/stream`). The SSE endpoint (`/mcp/sse`) is available but intended for development tools only.
- `mcp-remote` (legacy wrapper) is **not compatible** — use `type: http` directly in `claude_desktop_config.json`.
- The Miele OAuth refresh token can expire or be invalidated. On `invalid_grant` errors in the server log, re-login via `/auth/login` is required.

---

## Incident Log

### 2026-06-03 – Full outage after token expiry

**Symptoms:**
- Claude reported `No valid token available. User must authenticate first.`
- Server logs showed endless `GET /mcp/sse` reconnects
- `Failed to refresh token | invalid_grant` in the container log

**Root causes (two independent issues):**
1. Miele OAuth refresh token expired / invalidated
2. `claude_desktop_config.json` still used `mcp-remote` with `/mcp/sse` (SSE protocol), which is not suitable for production use with Claude Desktop over a reverse proxy

**Resolution:**
1. Re-login at `https://mielemcp.never2sunny.eu/auth/login`
2. `claude_desktop_config.json` switched to `type: http` with `/mcp/stream` (Option C)
3. Claude Desktop restarted

**Outcome:** All 9 appliances back online, connection stable.
