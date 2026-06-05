# MCP Guide

This document describes how to connect, test, and use the Miele MCP Server with various clients.

---

## 1. Testing with the MCP Inspector

The official [MCP Inspector](https://github.com/modelcontextprotocol/inspector) is the recommended tool for testing the Miele MCP Server. It provides an interactive web UI for conveniently invoking all available MCP tools.

### Option A: Connect to a local server (Stdio)

When running the server locally on your development machine:

1. Start the Inspector via the provided npm script:
   ```bash
   npm run inspector
   ```
2. The Inspector starts and automatically connects to the local server via **Stdio** (no API token required, as it is a direct process coupling).
3. Open the Inspector's web UI (by default at `http://localhost:5173`).

### Option B: Connect to the deployed server (Streamable HTTP – Recommended)

To connect the Inspector to the already-deployed and secured server (e.g. at `https://mielemcp.never2sunny.eu`):

1. Start the Inspector without arguments or use `npx @modelcontextprotocol/inspector`.
2. Select **Transport Type** `HTTP` (or `Streamable HTTP`) from the dropdown.
3. Enter the server URL: `https://mielemcp.never2sunny.eu/mcp/stream`
4. Expand the **Headers** section and add:
   - **Key:** `Authorization`
   - **Value:** `Bearer YOUR_MCP_API_TOKEN`

> [!NOTE]
> The SSE endpoint (`/mcp/sse`) can also be used as a fallback by selecting Transport Type `SSE` and appending `?token=YOUR_MCP_API_TOKEN` to the URL. However, Streamable HTTP is preferred.

### Authenticating the server (OAuth Consent)
Before using tools that connect to the Miele API, the MCP Server must be authorized:
1. Open a **new browser tab**.
2. Navigate to the server's login endpoint (locally e.g. `http://localhost:8089/auth/login`, remotely e.g. `https://mielemcp.never2sunny.eu/auth/login`).
3. Log in with your Miele credentials and select your appliances (consent).
4. After successful authorization, the Miele API redirects you back to the server.

---

## 2. Connecting Claude Desktop

The official Claude Desktop app supports the Model Context Protocol (MCP) and can be connected to this server.

### Configuration file location
The `claude_desktop_config.json` file is located at:
* **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
* **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Linux:** `~/.config/Claude/claude_desktop_config.json`

### Option A: Streamable HTTP – ✅ Recommended for the deployed server
When the server is already running and accessible via Nginx/HTTPS (e.g. at `https://mielemcp.never2sunny.eu`), connect Claude Desktop via Streamable HTTP:

Add the following entry under `mcpServers`:

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

> [!IMPORTANT]
> Replace `YOUR_MCP_API_TOKEN` with the actual value of the `MCP_API_TOKEN` variable from your `.env` file.

### Option B: Stdio (for local development)
If you want Claude Desktop to launch the server directly as a local process:

1. Build the project locally (`npm run build`).
2. Add the following to the configuration file:

```json
{
  "mcpServers": {
    "miele-mcp-local": {
      "command": "node",
      "args": [
        "/opt/MCP-Server/dist/index.js"
      ],
      "env": {
        "PORT": "8089",
        "MIELE_CLIENT_ID": "YOUR_MIELE_CLIENT_ID",
        "MIELE_CLIENT_SECRET": "YOUR_MIELE_CLIENT_SECRET",
        "SESSION_SECRET": "YOUR_SESSION_SECRET",
        "MCP_API_TOKEN": "YOUR_MCP_API_TOKEN",
        "MIELE_SCOPES": "mcs_thirdparty_read mcs_thirdparty_media mcs_thirdparty_write"
      }
    }
  }
}
```

> [!NOTE]
> * Adjust the paths and environment variables to your local setup.
> * After every change to `claude_desktop_config.json` you must **fully restart** Claude Desktop (quit and reopen) for the changes to take effect.

---

## 3. Testing tools interactively

Once the connection is established (either in the Inspector or in Claude Desktop), the following tools are available:

### Read tools
* **`list_devices`**: Lists all authorized Miele appliances.
* **`get_device_state`**: Returns the precise status of a specific device (e.g. remaining time, temperature).
* **`get_device_actions`** / **`get_device_programs`**: Shows which programs or commands the device accepts in its current state.
* **`get_all_filling_levels`** / **`get_device_filling_levels`**: Shows filling levels (e.g. for detergent, rinse aid).
* **`get_failure_details`**: Shows device error messages.
* **`get_operation_log`**: Retrieves recent write operations and their preflight results (audit log).

### Write tools
* **`put_device_action`**: Sends commands such as start, stop, or settings to the device.
  * **Demo tip:** Use the `dryRun: true` parameter. The server then performs the logical validation (preflight check) but does not send any real command to the Miele API.
* **`start_device_program`**: Starts a specific program on a device (also supports `dryRun: true`).
