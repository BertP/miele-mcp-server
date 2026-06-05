# Project Retrospective: Miele MCP Server – Production Readiness & Stability Hardening

**Version:** 2.0  
**Date:** 2026-06-04  
**Status:** Production-ready with open optimization items  

---

## 1. Summary

Building on the completed MVP (Phase A: Security Hardening), this iteration addressed all items from Phases B and C in RETRO_v1.md. In addition, new insights were gained from production use — particularly around the connection protocol (SSE vs. Streamable HTTP), CORS configuration, and the longevity of the Miele OAuth session.

### What went well

- **Phases B & C fully completed:** Operation Log, port alignment, tests, docs, logger, and health check are all implemented.
- **Insights from production:** The first real outage validated the architectural decision to use Streamable HTTP over SSE and anchored it in the documentation.
- **Fast root-cause analysis:** The new structured logger and the extended `/health` endpoint significantly accelerated diagnosis during the incident.
- **Comprehensive documentation for integration partners:** `CLAUDE_CONFIG.md` and `MCP_AGENT_CONFIG.md` cover all major AI agents.

### What should be improved

The following items were identified through production experience and a fresh code review.

---

## 2. Stability Findings (Priority: HIGH)

### 2.1 Miele OAuth session breaks due to inactivity (KNOWN ISSUE)

**Finding:** The Miele OAuth refresh token is invalidated server-side (`invalid_grant`) when:
- The connection is not used for an extended period (approx. 30+ days).
- Miele performs server-side security updates or the password is changed.
- The refresh cycle is interrupted by a network outage (token rotation failed: old token revoked, new token not saved).

The background refresh interval (every 15 minutes) prevents the **access token** (1h TTL) from expiring, but cannot repair a **refresh token** that has been invalidated server-side by Miele.

**Current behavior:** When the refresh token is invalid, `/health` continues to return `"tokenStatus": "expired"` even though the background refresh is actively trying (and failing) to renew it.

**Recommendation:**
- `/health` should explicitly distinguish between:
  - `"tokenStatus": "valid"` – token active and fresh
  - `"tokenStatus": "refresh_failed"` – refresh token invalid, manual re-login required
  - `"tokenStatus": "none"` – no session present
- Optionally add an email or webhook notification when the refresh fails, so the administrator is informed without having to monitor logs.

### 2.2 No retry logic for token refresh

**Finding:** `TokenService.refreshAccessToken()` immediately returns `null` on any error (e.g. network error). During a brief network outage between the server and the Miele API, the refresh is not retried.

**Risk:** A short network outage (1–2 seconds) can cause the server to be unable to obtain valid tokens for up to 15 minutes (until the next interval tick).

**Recommendation:** Implement exponential backoff with 2–3 retries in `refreshAccessToken()`.

---

## 3. Architecture Findings (Priority: MEDIUM)

### 3.1 Imports after application start in `index.ts`

**Finding:** In `index.ts`, several `import` statements are placed *after* `const app = express()` and after the first `app.use(...)` call (lines 13–20). While syntactically valid in modern JavaScript/TypeScript (all imports are hoisted), this is considered poor style and can cause confusion during future refactoring.

**Recommendation:** Move all imports to the top of the file.

### 3.2 Unused import `isInitializeRequest`

**Finding:** `isInitializeRequest` is imported in `index.ts` (line 17) from the MCP SDK but never used.

**Recommendation:** Remove the unused import.

### 3.3 MCP session management without memory limit

**Finding:** The maps `streamableTransports` and `sseTransports` in `index.ts` grow with each new client connection. Sessions are removed on the close event, but there is no mechanism to clean up orphaned sessions (e.g. from abruptly terminated connections without a close event).

**Risk:** With many short-lived connections (e.g. multiple AI agents in succession), memory usage grows unboundedly.

**Recommendation:** Implement a TTL-based purge mechanism for sessions (e.g. remove sessions from the map that have had no activity for >30 minutes).

### 3.4 CORS middleware returns wildcard origin when Origin header is missing

**Finding:** The CORS middleware in `index.ts` (line 23) sets `'*'` as `Access-Control-Allow-Origin` when the `Origin` header is absent:
```typescript
const origin = req.headers.origin || '*';
```
This combines `Access-Control-Allow-Credentials: true` with `Access-Control-Allow-Origin: *`, which browsers reject (security specification).

**Recommendation:** Only echo the origin back when an `Origin` header is present. Without an `Origin` header, set no CORS header:
```typescript
const origin = req.headers.origin;
if (origin) {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}
```

### 3.5 No health check for SSE endpoint

**Finding:** The `/health` endpoint checks DB connectivity and Miele token status but gives no indication of the state of active connections (how many sessions are active, whether SSE or Streamable HTTP transports are open).

**Recommendation:** Include active session count in `/health`:
```json
"sessions": {
  "streamable": 2,
  "sse": 0
}
```

---

## 4. Token Management Findings (Priority: MEDIUM)

### 4.1 `getValidToken()` is executed on every `/health` call

**Finding:** Since the last update, the `/health` endpoint calls `TokenService.getValidToken()`. With rapid successive requests (e.g. monitoring systems checking every 10 seconds), this can cause unnecessary load on the Miele OAuth endpoint if the token is close to expiry.

**Recommendation:** Add short debouncing in `getValidToken()` or the `/health` handler: do not actually perform a refresh more than once per minute.

### 4.2 No logging of refresh token expiry time

**Finding:** On a successful token refresh, only `✅ Access token refreshed successfully.` is logged, without indicating when the new token expires. During debugging, it is helpful to know how long the fresh token remains valid.

**Recommendation:** Log the new `expires_at` timestamp after a successful refresh.

---

## 5. Code Quality (Priority: LOW)

### 5.1 Logger uses optional chaining without null check

**Finding:** In `logger.ts`, `config?.LOG_LEVEL` and `config?.NODE_ENV` use optional chaining, implying that `config` could be `undefined` at runtime. Since `config` comes from a Zod-validated import and is always present, the optional chaining is redundant and can mislead static analysis.

**Recommendation:** Remove optional chaining in `logger.ts` since `config` is guaranteed to be present.

### 5.2 `OperationLogRepository` has no query method

**Finding:** `OperationLogRepository` can only write (`log()`), not read. There is no tool or endpoint through which the AI or the administrator can retrieve the logged operations.

**Recommendation:** Implement a `getRecentLogs(limit: number)` method and optionally add an MCP tool `get_operation_log` through which the AI can retrieve recent write operations (useful for audits: "What has the AI done with my appliances recently?").

### 5.3 `docker-compose.yml` contains deprecated `version` attribute

**Finding:** `docker-compose.yml` contains `version: '3.8'`, which has been considered obsolete since Docker Compose v2 and generates a warning on startup.

**Recommendation:** Remove the `version: '3.8'` line.

### 5.4 `CLAUDE_CONFIG.md` and `MCP_AGENT_CONFIG.md` contain security-critical tokens

**Finding:** Both documentation files contained the real `MCP_API_TOKEN` in plain text. These files are committed to the Git repository and potentially publicly visible (depending on repository visibility).

**Risk:** If the repository is or becomes public, the token is immediately compromised.

**Recommendation:** Replace tokens in documents with a placeholder (`YOUR_MCP_API_TOKEN`) and set up a `.gitignore` rule or a repository scan (e.g. `gitleaks`).

---

## 6. Production Insights from the 2026-06-03 Incident

### 6.1 Incident: Complete outage due to token expiry + wrong protocol

**Symptoms:** Endless reconnect loop in logs, Claude Desktop showing "No valid token available".

**Root Causes:**
1. Miele refresh token was invalidated server-side (`invalid_grant`).
2. Claude Desktop config still used `mcp-remote` with the SSE endpoint `/mcp/sse`, which is not stable enough for remote connections via an Nginx proxy with this server implementation.

**Lessons:**
- **SSE is unsuitable for production use with reverse proxies.** The SSE endpoint `/mcp/sse` remains in the code for developer tools (MCP Inspector) but should be more clearly marked as "not for production" in the documentation.
- **Streamable HTTP (`/mcp/stream`) is the only officially supported connection method.**
- **An expired refresh token requires manual intervention**, which must be communicated more clearly (see point 2.1).

---

## 7. Recommended Roadmap

### Phase D: Stability & Operations

| # | Task | Effort | Priority |
|---|------|--------|----------|
| D1 | Retry logic (exponential backoff) in `TokenService.refreshAccessToken()` | Small | High |
| D2 | Differentiated `tokenStatus` in `/health` (`valid` / `refresh_failed` / `none`) | Small | High |
| D3 | Fix CORS wildcard bug with missing Origin header | Small | Medium |
| D4 | Remove unused import `isInitializeRequest` and clean up import order in `index.ts` | Very Small | Low |
| D5 | Remove `version` attribute from `docker-compose.yml` | Very Small | Low |

### Phase E: Extensions & Observability

| # | Task | Effort | Priority |
|---|------|--------|----------|
| E1 | Implement `get_operation_log` MCP tool (audit log queryable by AI) | Medium | Medium |
| E2 | Include active session count in `/health` | Small | Low |
| E3 | TTL-based purge of orphaned transport sessions | Medium | Medium |
| E4 | Webhook/email notification on token refresh failure | Medium | Medium |
| E5 | Replace real tokens in Markdown documentation with placeholders | Small | High |

---

## 8. Conclusion

The Miele MCP Server has successfully survived its first production use. The architecture is solid; the identified weaknesses lie primarily in the areas of **operational stability over long runtimes** (token refresh robustness, session management) and **observability** (clearer health messages, audit log queries).

The **most urgent open weakness** was the missing distinction between an access token that expired due to inactivity (self-healing) and a refresh token invalidated server-side by Miele (requires manual re-login). These two states must be clearly communicated separately in `/health` so that AI agents and administrators can respond without log analysis.
