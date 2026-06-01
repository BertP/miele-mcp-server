# Mission Control: Miele MCP Server MVP

## Mission Name

Miele 3rd Party API MCP Server MVP

## Mission Owner

Miele internal MVP team

## Agent Role

You are the implementation agent. You are responsible for designing, coding, validating, documenting, and preparing the MVP for demo usage.

## Current Objective

Create a minimal, secure, demo-ready MCP server that connects to the Miele 3rd Party API via OAuth2 and exposes selected appliance functions as MCP tools.

## Non-Negotiables

- Do not expose raw REST endpoints as unstructured MCP tools.
- Do not bypass OAuth2.
- Do not hardcode credentials.
- Do not log secrets.
- Do not implement write operations without preflight validation.
- Do not assume that all devices are writable.
- Do not assume that all user devices are permitted.
- Do not use the legacy OAuth provider for new development.
- Do not expose `/token` or `/logout` as MCP tools.

## Architecture Decision Record

### ADR-001: Use a single Ubuntu server for MVP

Decision: The MVP runs on one small Ubuntu server.

Rationale:
- simpler deployment
- easier debugging
- enough for internal demo load
- OAuth callback and MCP server can live together

Implications:
- local SQLite is acceptable
- systemd is acceptable
- reverse proxy required for HTTPS

---

### ADR-002: Use TypeScript and Node.js

Decision: Implement the MCP server in TypeScript.

Rationale:
- strong MCP SDK support
- good ecosystem for OAuth2, REST and validation
- easy integration with demo clients

---

### ADR-003: Use SQLite for MVP persistence

Decision: Store token metadata and consent state in SQLite.

Rationale:
- low operational overhead
- no external database required
- sufficient for one-server MVP

---

### ADR-004: Read tools before write tools

Decision: Implement read-only MCP tools first.

Rationale:
- reduces risk
- proves OAuth and API connectivity
- provides required data for write preflight checks

---

### ADR-005: Write operations require preflight

Decision: Every write operation must first check the current device capabilities.

Rationale:
- appliance state changes dynamically
- programs/actions may only be available in specific states
- prevents unsafe or invalid operations

## Implementation Phases

### Phase 0: Repository Bootstrap

Tasks:
- initialize Node.js TypeScript project
- configure linting and formatting
- create `.env.example`
- create basic README
- create basic config loader
- create health check

Exit criteria:
- project builds
- server starts locally
- environment config is validated

---

### Phase 1: OAuth2 Flow

Tasks:
- implement `/auth/login`
- implement `state` generation and validation
- implement `/auth/callback`
- exchange authorization code for tokens
- store tokens in SQLite
- implement token refresh
- decode access token claims
- extract permitted appliance serial numbers where available

Exit criteria:
- user can authenticate against Miele
- access token and refresh token are stored
- expired access token can be refreshed
- secrets are not logged

---

### Phase 2: Miele API Client

Tasks:
- create `mieleClient.ts`
- implement authenticated GET helper
- implement authenticated POST/PUT helper
- implement error mapping
- implement retry only where safe
- add request correlation ID

Exit criteria:
- API client can call read endpoints with valid access token
- errors are normalized
- no token leakage in logs

---

### Phase 3: Read MCP Tools

Tasks:
- implement `list_devices`
- implement `get_device`
- implement `get_device_state`
- implement `get_device_ident`
- implement `get_device_actions`
- implement `get_device_programs`
- implement `get_filling_levels`
- implement `get_failure_details`

Exit criteria:
- MCP client can call all read tools
- responses are concise and LLM-friendly
- invalid device IDs return clear errors
- unauthorized device access is blocked

---

### Phase 4: Write MCP Tools

Tasks:
- implement preflight logic
- implement `execute_device_action`
- implement `start_device_program`
- implement `start_room_cleaning`
- add dry-run option where useful
- log operation metadata safely

Exit criteria:
- write tool refuses unsupported operations
- write tool checks permitted device access
- write tool explains why an action is blocked
- successful writes return clear confirmation

---

### Phase 5: Demo Client

Tasks:
- create a small CLI or minimal web demo client
- support login URL display
- support list devices
- support read state
- support safe action demo
- support error scenario demo

Exit criteria:
- demo can be run without a full AI client
- demo story is repeatable
- demo does not depend on model behavior

---

### Phase 6: Ubuntu Deployment

Tasks:
- create systemd service
- document Node.js installation
- document Caddy or Nginx reverse proxy
- document TLS setup
- document firewall assumptions
- document backup handling for SQLite

Exit criteria:
- server runs after reboot
- logs are accessible
- health check works
- OAuth redirect URI works via HTTPS

## Target Demo Flow

1. Open demo client.
2. Click or display Miele login URL.
3. User logs in and grants access to selected appliances.
4. Server receives callback.
5. Demo client calls `list_devices`.
6. Demo client calls `get_device_state`.
7. Demo client calls `get_device_actions`.
8. Demo client executes a safe, supported operation or shows why it is blocked.
9. Optional: AI client calls the same MCP tools.

## Recommended Demo Script

"First we authenticate against the Miele domestic IoT OAuth provider. During consent, the user selects which appliances are available to the application. The MCP server stores the refresh token securely on the Ubuntu server and uses the access token to call the Miele API.

Now we call `list_devices`. The MCP server returns only devices permitted by the consent flow.

Next, we inspect one appliance using `get_device_state` and `get_device_actions`.

Before executing any command, the MCP server performs a preflight check. It verifies that the device is permitted and that the requested action is currently supported. Only then is the command sent to the Miele API."

## Open Questions

- Which exact Miele tenant/client registration is used?
- Which redirect URI will be registered?
- Are we demonstrating read-only or also write operations?
- Which real appliance types are available for the demo?
- Should media/camera access be part of MVP or later?
- Should the MCP server be exposed remotely or only locally through SSH tunnel/VPN?
- Which MCP client is preferred for the first demo?

## Risk Register

### Risk: OAuth redirect URI mismatch

Mitigation:
- document exact redirect URI
- use stable public HTTPS hostname

### Risk: Refresh token storage

Mitigation:
- strict filesystem permissions
- SQLite file readable only by service user
- no token logging

### Risk: Write operation sent in wrong state

Mitigation:
- mandatory preflight
- optional dry-run mode
- allowlist actions for MVP

### Risk: MCP client compatibility

Mitigation:
- test with small custom client first
- then test with AI client

### Risk: Event streaming complexity

Mitigation:
- defer eventing to later phase
- use polling for MVP

## Agent Working Rules

- Work incrementally.
- Keep commits small.
- Prefer safe defaults.
- Implement read path before write path.
- Document all assumptions.
- If an API behavior is unclear, fail closed.
- If an action could affect a real appliance, require explicit availability check.
- Never leak tokens or secrets in logs, README examples, test fixtures, or error messages.
