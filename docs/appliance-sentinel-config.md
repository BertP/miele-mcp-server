# Appliance Sentinel – Claude Integration Config

This document provides the configuration to attach the **Miele MCP Server** to your Claude project ("Appliance Sentinel") or Claude Desktop.

## Connection Details

- **MCP Transport Protocol**: Streamable HTTP (`/mcp/stream`)
- **Server URL**: `https://mielemcp.never2sunny.eu/mcp/stream`
- **Authentication**: `Authorization: Bearer YOUR_MCP_API_TOKEN`

> **Network Topology:** The MCP Server runs on `192.168.1.251:8089` (Docker Container) behind an Nginx reverse proxy at `mielemcp.never2sunny.eu`.

*(Note: Replace `YOUR_MCP_API_TOKEN` with the value of `MCP_API_TOKEN` from the server's `.env` file.)*

---

## Claude Desktop Configuration

Edit your `claude_desktop_config.json`:

| OS | Path |
|---|---|
| **Windows** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **macOS** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Linux** | `~/.config/Claude/claude_desktop_config.json` |

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

> ⚠️ **SSE (`/mcp/sse`) is not recommended** for production use. It causes reconnect loops and authentication issues with Claude Desktop over a reverse proxy. Always use Streamable HTTP (`/mcp/stream`).

---

## Available Tools (13 total)

| Tool | Description |
|---|---|
| `list_devices` | List all connected Miele appliances |
| `get_device` | Get full details of a device |
| `get_device_state` | Read current status (temperature, remaining time, program) |
| `get_device_actions` | Query available actions for a device |
| `get_device_programs` | List available programs for a device |
| `get_device_ident` | Retrieve identity data (model, serial number) |
| `get_all_filling_levels` | Check filling levels of all devices |
| `get_device_filling_levels` | Check filling levels of a specific device |
| `get_failure_details` | Retrieve error messages and fault details |
| `get_device_camera` | Live camera image from oven (requires `mcs_thirdparty_media` scope) |
| `put_device_action` | Send an action to a device (with preflight check & dry-run mode) |
| `start_device_program` | Start a program on a device (with preflight check & dry-run mode) |
| `get_operation_log` | Retrieve recent write operations and their preflight results (audit log) |

---

For full integration details, see [MCP_AGENT_CONFIG.md](MCP_AGENT_CONFIG.md) and [CLAUDE_CONFIG.md](CLAUDE_CONFIG.md).
