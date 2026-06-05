# Appliance Sentinel - Claude Integration Config

This document provides the configuration necessary to attach the **Miele MCP Server** to your Claude project ("Appliance Sentinel") or Claude Desktop.

## Connection Details

Since the server is hosted remotely behind an Nginx reverse proxy, you will use the **HTTP Server-Sent Events (SSE)** transport instead of a local standard I/O script.

- **MCP Transport Protocol**: SSE (Server-Sent Events)
- **SSE Endpoint URL**: `https://mielemcp.never2sunny.eu/mcp/sse`
- **Authentication Header**: `Authorization: Bearer super_secret_mcp_token_2026`

> **Network Topology Note:** The MCP Server application does NOT run on `localhost`. It is hosted internally on the IP address **192.168.1.251** and is exposed to the outside world via an Nginx reverse proxy routing traffic to `mielemcp.never2sunny.eu`.

*(Note: Ensure the token matches the `MCP_API_TOKEN` defined in your server's `.env` file.)*

---

## Claude Desktop Configuration

If you are using **Claude Desktop**, you can add this MCP server by editing your `claude_desktop_config.json` file. 

> **Important Auth Workaround for Claude Desktop:** Claude Desktop currently expects OAuth for remote servers and does not support custom `Authorization: Bearer` headers natively. As a workaround, the Miele MCP Server supports passing the authentication token directly via the `token` query parameter in the URL.

```json
{
  "mcpServers": {
    "miele-appliance-sentinel": {
      "type": "sse",
      "url": "https://mielemcp.never2sunny.eu/mcp/sse"
    }
  }
}
```

*(Note: Claude Desktop is expanding its SSE support; ensure you are using the correct format for remote SSE servers as per their latest documentation.)*

## Available Capabilities for "Appliance Sentinel"

Once connected, your project will automatically inherit these tools:
- `list_devices`: Get an overview of all your connected appliances.
- `get_device`: Get full details of a specific device.
- `get_device_state`: Read real-time temperatures, remaining program times, and active statuses.
- `get_device_actions`: Find out what remote actions are available right now.
- `get_device_programs`: List programs configured on the device.
- `get_device_ident`: Get identity details for a device.
- `get_all_filling_levels`: Get filling levels for all supported appliances.
- `get_device_filling_levels`: Get filling levels for a specific device.
- `get_failure_details`: Get failure details for a device.
- `get_device_camera`: Retrieve the latest camera image (e.g. oven camera).
- `put_device_action`: Send an action (PUT) to a device (with preflight check & dryRun).
- `start_device_program`: Start a selected program on an appliance (with preflight check & dryRun).
