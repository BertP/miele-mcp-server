# SPEC: Miele 3rd Party API MCP Server MVP

## 1. Purpose

This document specifies the MVP implementation of an MCP server for the Miele 3rd Party API.

The server enables MCP-compatible clients to interact with selected Miele appliance data and actions via semantic MCP tools.

The MVP focuses on:

- OAuth2 Authorization Code Flow
- device-specific user consent
- read access to appliance information
- safe execution of selected write operations
- small-server Ubuntu deployment

## 2. Scope

### In Scope

- MCP server
- OAuth2 login and callback handling
- token storage and refresh
- Miele API REST client
- read-only MCP tools
- selected write MCP tools with preflight
- local SQLite storage
- Ubuntu deployment documentation
- minimal demo client or CLI

### Out of Scope for MVP

- production multi-user tenant model
- large-scale observability platform
- Kubernetes
- event-streaming/SSE integration
- media/camera access unless explicitly enabled
- complex RBAC
- admin UI
- mobile app

## 3. System Overview

```text
+------------------+
| MCP Client       |
| AI Client / CLI  |
+--------+---------+
         |
         | MCP
         v
+------------------+
| Miele MCP Server |
| Ubuntu           |
+--------+---------+
         |
         | REST + OAuth2 Access Token
         v
+------------------+
| Miele 3rd Party  |
| API              |
+------------------+
```

## 4. Components

### 4.1 MCP Server

Responsible for:

- exposing MCP tools
- validating tool inputs
- mapping tool calls to Miele API calls
- formatting responses for LLM consumption
- applying safety checks

### 4.2 OAuth Module

Responsible for:

- creating authorization URLs
- validating OAuth `state`
- exchanging authorization code for tokens
- refreshing tokens
- decoding access token claims
- exposing token availability to the Miele client

### 4.3 Token Store

Responsible for:

- persisting access token
- persisting refresh token
- persisting expiry timestamp
- optionally persisting permitted appliance serial numbers
- protecting token data from accidental exposure

MVP implementation: SQLite.

### 4.4 Miele API Client

Responsible for:

- adding bearer token authorization
- refreshing token before expiry
- calling Miele REST endpoints
- normalizing errors
- returning typed responses

### 4.5 Safety Layer

Responsible for:

- checking device permission
- checking current device state
- checking available actions
- checking available programs
- blocking unsafe writes

### 4.6 Demo Client

Responsible for:

- demonstrating login
- listing devices
- showing state
- executing safe test flows
- demonstrating blocked unsafe operation

## 5. OAuth2 Requirements

### 5.1 Authorization Endpoint

```text
https://auth.domestic.miele-iot.com/partner/realms/mcs/protocol/openid-connect/auth
```

### 5.2 Token Endpoint

```text
https://auth.domestic.miele-iot.com/partner/realms/mcs/protocol/openid-connect/token
```

### 5.3 Required Scopes

Minimum read-only MVP:

```text
openid mcs_thirdparty_read
```

Write-capable MVP:

```text
openid mcs_thirdparty_read mcs_thirdparty_write
```

Optional media:

```text
openid mcs_thirdparty_read mcs_thirdparty_media
```

### 5.4 Authorization Request

Required parameters:

```text
client_id
response_type=code
redirect_uri
scope
state
```

### 5.5 Token Request

Required parameters:

```text
grant_type=authorization_code
client_id
client_secret
code
redirect_uri
```

### 5.6 Token Response

Expected fields:

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 3600
}
```

The access token is a JWT and may contain information about permitted appliance serial numbers.

## 6. Environment Variables

```bash
NODE_ENV=production
PORT=3000

MIELE_CLIENT_ID=
MIELE_CLIENT_SECRET=
MIELE_REDIRECT_URI=https://mcp.example.com/auth/callback

MIELE_AUTH_URL=https://auth.domestic.miele-iot.com/partner/realms/mcs/protocol/openid-connect/auth
MIELE_TOKEN_URL=https://auth.domestic.miele-iot.com/partner/realms/mcs/protocol/openid-connect/token
MIELE_API_BASE_URL=

MIELE_SCOPES=openid mcs_thirdparty_read mcs_thirdparty_write

DATABASE_PATH=/var/lib/miele-mcp/miele-mcp.sqlite
SESSION_SECRET=
MCP_API_TOKEN=

LOG_LEVEL=info
```

## 7. MCP Tool Design

### 7.1 `list_devices`

Purpose: Return all consented devices visible to the authenticated user.

Input schema:

```json
{
  "type": "object",
  "properties": {},
  "additionalProperties": false
}
```

Output:

```json
{
  "devices": [
    {
      "deviceId": "string",
      "serialNumber": "string",
      "displayName": "string",
      "type": "string",
      "online": true
    }
  ]
}
```

### 7.2 `get_device`

Purpose: Return full details for a device.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "deviceId": {
      "type": "string"
    }
  },
  "required": ["deviceId"],
  "additionalProperties": false
}
```

### 7.3 `get_device_state`

Purpose: Return current state of a device.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "deviceId": {
      "type": "string"
    }
  },
  "required": ["deviceId"],
  "additionalProperties": false
}
```

Response should be normalized for LLM use:

```json
{
  "deviceId": "string",
  "status": "string",
  "program": "string",
  "remainingTime": "string",
  "raw": {}
}
```

### 7.4 `get_device_actions`

Purpose: Return currently available actions for a device.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "deviceId": {
      "type": "string"
    }
  },
  "required": ["deviceId"],
  "additionalProperties": false
}
```

### 7.5 `get_device_programs`

Purpose: Return currently available programs for a device.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "deviceId": {
      "type": "string"
    }
  },
  "required": ["deviceId"],
  "additionalProperties": false
}
```

### 7.6 `get_filling_levels`

Purpose: Return filling levels for supported appliances.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "deviceId": {
      "type": "string"
    }
  },
  "required": ["deviceId"],
  "additionalProperties": false
}
```

### 7.7 `get_failure_details`

Purpose: Return known failure details for a device.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "deviceId": {
      "type": "string"
    }
  },
  "required": ["deviceId"],
  "additionalProperties": false
}
```

### 7.8 `execute_device_action`

Purpose: Execute an available device action.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "deviceId": {
      "type": "string"
    },
    "action": {
      "type": "string"
    },
    "parameters": {
      "type": "object",
      "additionalProperties": true
    },
    "dryRun": {
      "type": "boolean",
      "default": false
    }
  },
  "required": ["deviceId", "action"],
  "additionalProperties": false
}
```

Preflight requirements:

- device must be known
- device must be permitted
- action must be listed in current available actions
- if `dryRun=true`, no API write is executed

### 7.9 `start_device_program`

Purpose: Start a selected program on a supported appliance.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "deviceId": {
      "type": "string"
    },
    "programId": {
      "type": "string"
    },
    "parameters": {
      "type": "object",
      "additionalProperties": true
    },
    "dryRun": {
      "type": "boolean",
      "default": false
    }
  },
  "required": ["deviceId", "programId"],
  "additionalProperties": false
}
```

Preflight requirements:

- device must be permitted
- program must be available
- device must be in required remote-control state
- if `dryRun=true`, no API write is executed

### 7.10 `start_room_cleaning`

Purpose: Start room cleaning for supported robotic vacuum devices.

Input schema:

```json
{
  "type": "object",
  "properties": {
    "deviceId": {
      "type": "string"
    },
    "roomIds": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "dryRun": {
      "type": "boolean",
      "default": false
    }
  },
  "required": ["deviceId", "roomIds"],
  "additionalProperties": false
}
```

Preflight requirements:

- device must be permitted
- device must support room cleaning
- requested rooms must be known
- device must be in an executable state

## 8. Safety Behavior

All write tools must return one of:

```json
{
  "allowed": true,
  "executed": true,
  "message": "Action executed successfully."
}
```

or:

```json
{
  "allowed": false,
  "executed": false,
  "reason": "The requested action is not currently available for this appliance.",
  "details": {}
}
```

## 9. Error Handling

### 9.1 OAuth Errors

```json
{
  "error": "oauth_error",
  "message": "Authentication is required or token refresh failed."
}
```

### 9.2 Permission Errors

```json
{
  "error": "device_not_permitted",
  "message": "The device is not included in the user's current consent."
}
```

### 9.3 API Errors

```json
{
  "error": "miele_api_error",
  "status": 400,
  "message": "Miele API returned an error.",
  "requestId": "..."
}
```

### 9.4 Validation Errors

```json
{
  "error": "validation_error",
  "message": "Invalid tool input.",
  "details": {}
}
```

## 10. Storage Schema

### `tokens`

```sql
CREATE TABLE tokens (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### `oauth_states`

```sql
CREATE TABLE oauth_states (
  state TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  consumed_at INTEGER
);
```

### `device_permissions`

```sql
CREATE TABLE device_permissions (
  serial_number TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### `operation_log`

```sql
CREATE TABLE operation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  allowed INTEGER NOT NULL,
  executed INTEGER NOT NULL,
  reason TEXT,
  created_at INTEGER NOT NULL
);
```

## 11. HTTP Endpoints

### 11.1 MCP Transport Endpoints (Protected)

Used by external AI clients (like Claude Desktop) to connect to the MCP server over HTTP.
Requires the HTTP header: `Authorization: Bearer <MCP_API_TOKEN>`

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `GET` | `/mcp/sse` | Establishes the Server-Sent Events (SSE) stream for MCP communication. |
| `POST` | `/mcp/message?sessionId=<id>` | Endpoint to send JSON-RPC messages to the server. |

### 11.2 Health Endpoint

### `GET /health`

```json
{
  "status": "ok"
}
```

### `GET /auth/login`

Redirects user to the Miele OAuth authorization URL.

### `GET /auth/callback`

Handles OAuth callback and stores tokens.

### `GET /auth/status`

```json
{
  "authenticated": true,
  "expiresAt": 1234567890
}
```

No token values are returned.

## 12. Docker Compose Deployment

The MVP is deployed using a Docker Compose stack. 

Recommended structure on the host:
```text
/opt/miele-mcp-server/
  docker-compose.yml
  Dockerfile
  .env
  data/
```

`docker-compose.yml` example:
```yaml
version: '3.8'

services:
  miele-mcp-server:
    build: .
    container_name: miele-mcp-server
    restart: unless-stopped
    ports:
      - "8089:3000"
    volumes:
      - ./data:/app/data
    env_file:
      - .env
```

## 13. Reverse Proxy

Caddy example:

```caddyfile
mcp.example.com {
  reverse_proxy localhost:3000
}
```

## 14. Demo Client Options

### Option A: CLI Demo Client

Best for technical demos.

Commands:

```bash
miele-demo login
miele-demo auth-status
miele-demo list-devices
miele-demo get-state --device-id DEVICE_ID
miele-demo get-actions --device-id DEVICE_ID
miele-demo execute-action --device-id DEVICE_ID --action ACTION --dry-run
```

### Option B: Minimal Web Demo Client

Best for stakeholder demos.

Views:

- Login
- Auth status
- Device list
- Device state
- Available actions
- Dry-run write operation
- Execution result

### Option C: AI Client

Best for vision demos after technical validation.

Example prompts:

```text
Welche Miele Geräte sind verfügbar?
```

```text
Zeige mir den aktuellen Status des Geschirrspülers.
```

```text
Welche Aktionen sind für den Saugroboter aktuell möglich?
```

```text
Führe einen Dry Run für das Starten der Reinigung im Wohnzimmer aus.
```

## 15. Testing Strategy

### Unit Tests

- config validation
- OAuth state generation
- token expiry calculation
- JWT claim parsing
- MCP input validation
- safety preflight logic

### Integration Tests

- token refresh with mocked Miele token endpoint
- device list with mocked Miele API
- blocked write operation
- allowed dry-run write operation

### Manual Tests

- real OAuth login
- consent for selected appliance
- list devices
- get device state
- get available actions
- run blocked write scenario
- run allowed dry-run scenario

## 16. Acceptance Criteria

The MVP is accepted when:

- OAuth login works
- callback stores tokens
- token refresh works
- MCP server starts via systemd
- MCP client can list devices
- MCP client can read device state
- unauthorized device access is blocked
- write operations require preflight
- dry-run mode works
- documentation enables setup on a fresh Ubuntu server

## 17. Future Extensions

- SSE/event-stream support
- media/camera access
- multi-user support
- full audit log
- admin UI
- OpenTelemetry
- centralized secret management
- cloud deployment
- ChatGPT App integration
- richer natural-language response formatting
