# Project Retrospective: Miele MCP Server MVP

**Version:** 1.0  
**Date:** 2026-06-02  
**Status:** MVP Feature Complete  

---

## 1. Summary

The Miele MCP Server connects the Miele 3rd Party API (OAuth2, REST) with the Model Context Protocol (MCP), enabling AI clients to access home appliances. The MVP is functionally complete: OAuth2 login, token management with automatic refresh, 12 MCP tools (read + write with preflight & dry-run), Docker deployment, and documentation are all implemented.

### What went well

- **Clean architecture:** Clear separation into modules (`auth/`, `miele/`, `mcp/`, `storage/`).
- **Fast iteration:** From bootstrap to a working MVP in just a few commits.
- **Robust OAuth flow:** State validation, token refresh with a 5-minute buffer, no logging of secrets.
- **Preflight safety:** Write operations check available actions/programs upfront.
- **Docker-first:** Multi-stage build, non-root user, volume for SQLite persistence.
- **Zod validation:** Environment variables are strictly validated at startup.

### What should be improved

The following items were identified through thorough code review as recommendations for next steps, ordered by priority.

---

## 2. Security Findings (Priority: HIGH)

### 2.1 MCP endpoints are unauthenticated

**Finding:** The `MCP_API_TOKEN` is defined as a required field in `config.ts`, but in `index.ts` it is **never checked**. The SSE and Streamable HTTP endpoints (`/mcp/sse`, `/mcp/message`, `/mcp/stream`) are accessible to anyone who knows the URL.

**Risk:** Anyone can invoke MCP tools and control appliances without a token.

**Recommendation:** Add middleware that validates `Authorization: Bearer <MCP_API_TOKEN>` on all `/mcp/*` routes.

### 2.2 Weak secrets in `.env.example`

**Finding:** `.env.example` contains values like `SESSION_SECRET=super_secret_session_key` and `MCP_API_TOKEN=your-very-secure-password-123`. The production `.env` also contained similarly weak, easily guessable values.

**Risk:** If these values are used in deployment, session hijacking and unauthorized MCP access are trivial.

**Recommendation:**
- Use genuine placeholders in `.env.example` (e.g. `SESSION_SECRET=<generate-with-openssl-rand-hex-32>`).
- Generate production secrets with `openssl rand -hex 32`.

### 2.3 OAuth endpoints without rate limiting

**Finding:** `/auth/login` creates a new `oauth_states` entry on every call. There is no rate limiting and no cleanup logic for old, unconsumed states.

**Risk:** Denial-of-service by flooding the SQLite table; state exhaustion attacks.

**Recommendation:**
- Give states a TTL (e.g. 10 minutes) and clean them up via cron/startup.
- Add rate limiting on `/auth/*` routes (e.g. `express-rate-limit`).

### 2.4 Hardcoded IP address in logs

**Finding:** In `index.ts` line 89, `http://192.168.1.251:${config.PORT}/health` is hardcoded. This should be derived dynamically from configuration.

---

## 3. Architecture Findings (Priority: MEDIUM)

### 3.1 Port mismatch in Docker Compose vs. Dockerfile

**Finding:** The `Dockerfile` sets `ENV PORT=3000` and `EXPOSE 3000`, while `docker-compose.yml` mapped port `8089:8089`. The `.env` sets `PORT=8089`. The container loads the port correctly from `.env` (via `env_file`), but `EXPOSE 3000` in the Dockerfile is misleading.

**Recommendation:** Remove `EXPOSE 3000` from the Dockerfile or change it to `EXPOSE 8089`. Alternatively, omit `EXPOSE` entirely and control it solely through docker-compose.

### 3.2 Dual MCP transports without clear separation

**Finding:** `index.ts` implements three different MCP transports in parallel:
1. Legacy SSE (`/mcp/sse` + `/mcp/message`)
2. Streamable HTTP (`/mcp/stream`)
3. Stdio (in `server.ts` via `runServer()`)

The Stdio variant in `server.ts` is used by `npm run inspector`, while the HTTP variants are for production. This is not documented.

**Recommendation:** Clearly document in the README or SPEC which transport is intended for which use case. Add a comment to the `require.main === module` block in `server.ts`.

### 3.3 Each SSE connection creates a new server instance

**Finding:** In `index.ts`, a new `createMcpServer()` is created on every call to `/mcp/sse` and `/mcp/stream` (new session). This is acceptable for the MVP but does not scale.

**Recommendation:** Evaluate for the next release whether a single server instance with multiple transports can be used.

### 3.4 `operation_log` table is never written to

**Finding:** The `operation_log` table exists in the schema (`db.ts`), but no code writes to it. Preflight results and write operations are not logged.

**Recommendation:** Record every preflight decision (allowed/blocked) and every executed write operation in `operation_log`. This is essential for audits and debugging.

### 3.5 `device_permissions` table is never used

**Finding:** The `device_permissions` table exists in the schema, but `extractPermittedDevices()` in `jwtClaims.ts` always returns `[]` (line 35: fallback to empty array). The results in `oauthRoutes.ts` are only logged, never stored.

**Recommendation:** Either analyze the actual JWT claim structure from Miele, correctly extract and store device permissions, or remove the table and code to avoid confusion.

---

## 4. Code Quality (Priority: MEDIUM)

### 4.1 No automated tests

**Finding:** `npm test` fails with a placeholder error. There are no unit or integration tests.

**Recommendation:** At minimum, test the following areas:
- Preflight logic in `putDeviceAction.ts` (blocked/allowed correctly)
- Token refresh logic in `tokenService.ts`
- OAuth state validation in `tokenRepository.ts`
- Config validation with missing/invalid values

### 4.2 Inconsistency in tool handler signatures

**Finding:** Most tools define `handler` as a method (`async handler(args)`), but `getDeviceCameraTool` uses an arrow function (`handler: async (args) =>`). The `inputSchema` objects sometimes include `additionalProperties: false`, sometimes not.

**Recommendation:** Establish a uniform pattern for all tools. All schemas should set `additionalProperties: false`.

### 4.3 Preflight validation in `startDeviceProgram.ts`

**Finding:** The preflight check assumes the API returns an array of objects containing `programId`. The actual response format from the Miele API must be validated.

**Recommendation:** Test with real API responses and adapt the comparison accordingly. Add defensive checks for the case where the API returns a different format.

### 4.4 Error handling is not uniform

**Finding:** Some tools set `isError: true` on errors, others do not (e.g. preflight failures return normal responses without `isError`).

**Recommendation:** Clear convention: preflight blocks are not errors (no `isError`), but technical failures (network, auth) set `isError: true`. This is currently partially the case but should be explicitly documented.

---

## 5. Documentation (Priority: LOW)

### 5.1 `appliance-sentinel-config.md` is outdated

**Finding:** The list of available tools in this file (lines 41–44) is incomplete. Missing: `get_device_camera`, `put_device_action`, `start_device_program`, `get_all_filling_levels`, `get_device_filling_levels`, `get_failure_details`.

**Recommendation:** Update the tool list or remove it from this file and reference the central SPEC instead.

### 5.2 `USE_CASES.md` does not reference new tools

**Finding:** The document does not mention `start_device_program`, `get_all_filling_levels`, `get_device_filling_levels`, or `get_failure_details`.

**Recommendation:** Update with scenarios for these new tools (e.g. "Is the rinse aid still full?" → `get_device_filling_levels`).

### 5.3 SPEC.md contains outdated acceptance criteria

**Finding:** Line 776 states "MCP server starts via systemd", which is no longer correct (Docker Compose).

**Recommendation:** Change to "MCP server starts via Docker Compose".

---

## 6. Recommended Roadmap

### Phase A: Security Hardening ✅ (completed 2026-06-02)

| # | Task | Status |
|---|------|--------|
| A1 | Implement MCP API token authentication as middleware | ✅ Done |
| A2 | Rotate production secrets and clean up `.env.example` | ✅ Done |
| A3 | Add OAuth state TTL and cleanup logic | ✅ Done |
| A4 | Remove hardcoded IP address | ✅ Done |

### Phase B: Production Readiness

| # | Task | Effort |
|---|------|--------|
| B1 | Populate `operation_log` for all write operations | Medium |
| B2 | Unify port configuration in Dockerfile/Compose | Small |
| B3 | Set up automated tests (Jest/Vitest) for core logic | Medium |
| B4 | Unify tool handler signatures and schemas | Small |

### Phase C: Extensions

| # | Task | Effort |
|---|------|--------|
| C1 | Correctly populate `device_permissions` from JWT claims or remove | Medium |
| C2 | Update documentation (Sentinel Config, Use Cases, SPEC) | Small |
| C3 | Structured logging (e.g. with Pino) instead of `console.log` | Medium |
| C4 | Extend health check (DB connectivity, token status) | Small |

---

## 7. Conclusion

The MVP achieves its purpose: it securely connects Miele appliances to MCP clients via OAuth2 and provides both read and write access with safety checks. The architecture is clearly structured and extensible.

The **most critical open vulnerability** was the missing authentication on the MCP endpoints themselves (point 2.1). Since the server is publicly accessible (`mielemcp.never2sunny.eu`), this was addressed first.

All remaining items are improvements that make the server more robust, maintainable, and production-ready, but do not affect core functionality.
