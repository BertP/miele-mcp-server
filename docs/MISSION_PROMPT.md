# Mission Prompt: Miele 3rd Party API MCP Server MVP

You are an expert agentic software engineer specialized in MCP servers, REST API integration, OAuth2/OIDC, TypeScript, Node.js, secure backend architecture, and production-ready MVP delivery.

Your mission is to design and implement a minimal but robust MCP server for the Miele 3rd Party API.

The MCP server shall run on a small Ubuntu server and act as a bridge between MCP clients and the Miele 3rd Party API. It must handle OAuth2 authorization against Miele, securely store and refresh tokens, expose selected Miele API capabilities as semantic MCP tools, and enforce safety checks before executing write operations.

## Primary Goal

Build a working MVP that demonstrates:

1. OAuth2 Authorization Code Flow against the Miele domestic IoT provider.
2. Secure server-side token handling.
3. MCP tools for reading connected appliance information.
4. Controlled MCP tools for executing selected appliance actions.
5. A clean architecture that can later be extended toward production.

## Business Context

Miele wants to evaluate how the Miele 3rd Party API can be exposed through an MCP server so that AI clients and agents can interact with connected Miele appliances in a controlled, secure, and user-consented way.

The MVP is intended for internal demonstration and technical validation. It is not yet a production system.

## Technical Context

The Miele API uses OAuth2 Authorization Code Flow with device-specific permissions.

The MCP server must:

- use the new domestic IoT OAuth endpoints
- request appropriate scopes
- store refresh tokens securely
- refresh access tokens automatically
- validate that a requested appliance is permitted
- expose read tools first
- expose write tools only with strict preflight validation

## Constraints

- The server will run on a small Ubuntu machine.
- The MCP server and OAuth2 client live on the same server.
- The system should be simple enough for MVP operation.
- Avoid over-engineering.
- Prefer TypeScript and Node.js.
- Use SQLite for local MVP persistence.
- Use Caddy or Nginx as reverse proxy.
- HTTPS is required for OAuth callback handling.
- No cloud-native dependency is required for the MVP.

## Preferred Tech Stack

- Node.js LTS
- TypeScript
- `@modelcontextprotocol/sdk`
- Express or Fastify for OAuth callback endpoints
- SQLite for token and session storage
- Zod for input validation
- Caddy or Nginx for TLS termination
- systemd for process management
- Docker optional, but not mandatory for MVP

## Required MCP Tools

Implement these read tools first:

- `list_devices`
- `get_device`
- `get_device_state`
- `get_device_ident`
- `get_device_actions`
- `get_device_programs`
- `get_filling_levels`
- `get_failure_details`

Implement these write tools only after the read tools work:

- `execute_device_action`
- `start_device_program`
- `start_room_cleaning`

Each write tool must perform a preflight check using the corresponding read endpoint before executing the write operation.

## Safety Principles

The agent must never implement unsafe blind write operations.

Before writing to the Miele API, the server must:

1. verify that the device is known
2. verify that the device is included in the permitted serial numbers from the current token or known consent state
3. verify that the action/program/room operation is currently available
4. return a clear error if the operation is not allowed
5. log the attempted operation without leaking secrets

## Security Principles

Never hardcode secrets.

Use environment variables for:

- `MIELE_CLIENT_ID`
- `MIELE_CLIENT_SECRET`
- `MIELE_REDIRECT_URI`
- `MIELE_AUTH_URL`
- `MIELE_TOKEN_URL`
- `MIELE_API_BASE_URL`
- `SESSION_SECRET`
- `DATABASE_PATH`

Do not log:

- access tokens
- refresh tokens
- client secrets
- full authorization codes

## Deliverables

Create a repository with:

```text
miele-mcp-server/
├─ src/
│  ├─ index.ts
│  ├─ config.ts
│  ├─ auth/
│  │  ├─ oauthRoutes.ts
│  │  ├─ tokenService.ts
│  │  └─ jwtClaims.ts
│  ├─ miele/
│  │  ├─ mieleClient.ts
│  │  ├─ mieleTypes.ts
│  │  └─ mieleErrors.ts
│  ├─ mcp/
│  │  ├─ server.ts
│  │  ├─ tools/
│  │  │  ├─ listDevices.ts
│  │  │  ├─ getDeviceState.ts
│  │  │  ├─ getDeviceActions.ts
│  │  │  ├─ getDevicePrograms.ts
│  │  │  ├─ executeDeviceAction.ts
│  │  │  └─ startDeviceProgram.ts
│  ├─ safety/
│  │  ├─ preflight.ts
│  │  └─ permissions.ts
│  └─ storage/
│     ├─ db.ts
│     └─ tokenRepository.ts
├─ scripts/
│  ├─ init-db.ts
│  └─ healthcheck.ts
├─ systemd/
│  └─ miele-mcp.service
├─ .env.example
├─ package.json
├─ tsconfig.json
├─ README.md
└─ SPEC.md
```

## Implementation Style

Write clean, readable, production-oriented MVP code.

Prefer small modules.

Avoid magic values.

Add meaningful error handling.

Use TypeScript types.

Document assumptions in comments.

When unsure about an API detail, create an explicit TODO and keep the implementation safe.

## Definition of Done

The MVP is done when:

1. the server starts successfully on Ubuntu
2. `/auth/login` redirects to Miele OAuth
3. `/auth/callback` exchanges the code for tokens
4. tokens are stored locally
5. access tokens are refreshed automatically
6. MCP tools can list devices
7. MCP tools can retrieve device state
8. write tools refuse unsafe requests
9. write tools execute only if the preflight check allows them
10. README explains setup, environment variables, OAuth redirect URI, and demo flow
