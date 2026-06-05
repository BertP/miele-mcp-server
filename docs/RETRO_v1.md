# Projekt-Retrospektive: Miele MCP Server MVP

**Version:** 1.0  
**Datum:** 2026-06-02  
**Status:** MVP Feature Complete  

---

## 1. Zusammenfassung

Der Miele MCP Server verbindet die Miele 3rd Party API (OAuth2, REST) mit dem Model Context Protocol (MCP) und ermöglicht KI-Clients den Zugriff auf Hausgeräte. Der MVP ist funktional vollständig: OAuth2-Login, Token-Verwaltung mit automatischem Refresh, 12 MCP-Tools (Lesen + Schreiben mit Preflight & Dry-Run), Docker-Deployment und Dokumentation sind implementiert.

### Was gut gelaufen ist

- **Klare Architektur:** Saubere Trennung in Module (`auth/`, `miele/`, `mcp/`, `storage/`).
- **Schnelle Iteration:** Vom Bootstrap bis zum lauffähigen MVP in wenigen Commits.
- **Robuster OAuth-Flow:** State-Validierung, Token-Refresh mit 5-Minuten-Puffer, kein Logging von Secrets.
- **Preflight-Sicherheit:** Schreiboperationen prüfen vorab die verfügbaren Aktionen/Programme.
- **Docker-first:** Multi-Stage Build, non-root User, Volume für SQLite-Persistenz.
- **Zod-Validierung:** Umgebungsvariablen werden beim Start strikt validiert.

### Was verbessert werden sollte

Die folgenden Punkte sind nach gründlicher Code-Review als Empfehlungen für das weitere Vorgehen identifiziert worden, geordnet nach Priorität.

---

## 2. Sicherheitsbefunde (Priorität: HOCH)

### 2.1 MCP-Endpunkte sind nicht authentifiziert

**Befund:** Der `MCP_API_TOKEN` wird in `config.ts` als Pflichtfeld definiert, aber in `index.ts` wird er **nirgends geprüft**. Die SSE- und Streamable-HTTP-Endpunkte (`/mcp/sse`, `/mcp/message`, `/mcp/stream`) sind für jeden erreichbar, der die URL kennt.

**Risiko:** Jeder kann ohne Token MCP-Tools aufrufen und damit Geräte steuern.

**Empfehlung:** Middleware einbauen, die `Authorization: Bearer <MCP_API_TOKEN>` auf allen `/mcp/*`-Routen prüft.

### 2.2 Schwache Secrets in `.env.example`

**Befund:** Die `.env.example` enthält Werte wie `SESSION_SECRET=super_secret_session_key` und `MCP_API_TOKEN=your-very-secure-password-123`. In der produktiven `.env` stehen ebenfalls schwache, leicht erratbare Werte (`super_secret_session_key`, `super_secret_mcp_token_2026`).

**Risiko:** Werden diese Werte im Deployment übernommen, sind Session-Hijacking und unautorisierter MCP-Zugriff trivial.

**Empfehlung:** 
- In `.env.example` Platzhalter ohne echte Werte verwenden (z.B. `SESSION_SECRET=<generate-with-openssl-rand-hex-32>`).
- Produktive Secrets mit `openssl rand -hex 32` erzeugen.

### 2.3 OAuth-Endpunkte ohne Rate-Limiting

**Befund:** `/auth/login` erzeugt bei jedem Aufruf einen neuen `oauth_states`-Eintrag. Es gibt kein Rate-Limiting und keine Aufräum-Logik für alte, unverbrauchte States.

**Risiko:** Denial-of-Service durch Fluten der SQLite-Tabelle; State-Exhaustion-Angriffe.

**Empfehlung:** 
- States mit TTL versehen (z.B. 10 Minuten) und per Cronjob/Startup aufräumen.
- Rate-Limiting auf `/auth/*`-Routen (z.B. `express-rate-limit`).

### 2.4 Hardcoded IP-Adresse in Logs

**Befund:** In `index.ts` Zeile 89 steht `http://192.168.1.251:${config.PORT}/health` hardcoded. Das sollte dynamisch aus der Konfiguration kommen.

---

## 3. Architektur-Befunde (Priorität: MITTEL)

### 3.1 Port-Mismatch in Docker Compose vs. Dockerfile

**Befund:** Das `Dockerfile` setzt `ENV PORT=3000` und `EXPOSE 3000`, während `docker-compose.yml` den Port `8089:8089` mapped. Die `.env` setzt `PORT=8089`. Im Container wird der Port aus der `.env` (über `env_file`) korrekt geladen, aber das `EXPOSE 3000` im Dockerfile ist irreführend.

**Empfehlung:** `EXPOSE 3000` im Dockerfile entfernen oder auf `EXPOSE 8089` ändern. Alternativ `EXPOSE` weglassen und rein über docker-compose steuern.

### 3.2 Duale MCP-Transporte ohne klare Abgrenzung

**Befund:** `index.ts` implementiert drei verschiedene MCP-Transporte parallel:
1. Legacy SSE (`/mcp/sse` + `/mcp/message`)
2. Streamable HTTP (`/mcp/stream`)
3. Stdio (in `server.ts` via `runServer()`)

Die Stdio-Variante in `server.ts` wird durch `npm run inspector` genutzt, während die HTTP-Varianten für den Produktivbetrieb gedacht sind. Das ist nicht dokumentiert.

**Empfehlung:** Im README oder der SPEC klar dokumentieren, welcher Transport für welchen Anwendungsfall gedacht ist. Den `require.main === module`-Block in `server.ts` mit einem Kommentar versehen.

### 3.3 Jede SSE-Verbindung erzeugt eine neue Server-Instanz

**Befund:** In `index.ts` wird bei jedem Aufruf von `/mcp/sse` und `/mcp/stream` (neue Session) ein neuer `createMcpServer()` erstellt. Das ist für den MVP akzeptabel, skaliert aber nicht.

**Empfehlung:** Für das nächste Release evaluieren, ob eine einzelne Server-Instanz mit mehreren Transports genutzt werden kann.

### 3.4 `operation_log`-Tabelle wird nie beschrieben

**Befund:** Die `operation_log`-Tabelle existiert im Schema (`db.ts`), wird aber von keinem Code beschrieben. Die Preflight-Ergebnisse und Schreiboperationen werden nicht protokolliert.

**Empfehlung:** Jede Preflight-Entscheidung (erlaubt/blockiert) und jede ausgeführte Schreiboperation im `operation_log` festhalten. Das ist essenziell für Audits und Fehlersuche.

### 3.5 `device_permissions`-Tabelle wird nie genutzt

**Befund:** Die Tabelle `device_permissions` existiert im Schema, aber `extractPermittedDevices()` in `jwtClaims.ts` gibt immer `[]` zurück (Zeile 35: Fallback auf leeres Array). Die Ergebnisse werden in `oauthRoutes.ts` nur geloggt, aber nie gespeichert.

**Empfehlung:** Entweder die tatsächliche JWT-Claim-Struktur von Miele analysieren und die Geräteberechtigungen korrekt extrahieren und speichern, oder die Tabelle und den Code entfernen, um Verwirrung zu vermeiden.

---

## 4. Code-Qualität (Priorität: MITTEL)

### 4.1 Keine automatisierten Tests

**Befund:** `npm test` schlägt mit einem Platzhalter-Fehler fehl. Es gibt keine Unit- oder Integrationstests.

**Empfehlung:** Mindestens folgende Bereiche testen:
- Preflight-Logik in `putDeviceAction.ts` (blockiert/erlaubt korrekt)
- Token-Refresh-Logik in `tokenService.ts`
- OAuth-State-Validierung in `tokenRepository.ts`
- Config-Validierung mit fehlenden/ungültigen Werten

### 4.2 Konsistenz der Tool-Handler-Signaturen

**Befund:** Die meisten Tools definieren `handler` als Methode (`async handler(args)`), aber `getDeviceCameraTool` nutzt eine Arrow-Function (`handler: async (args) =>`). Die `inputSchema`-Objekte verwenden teilweise `additionalProperties: false`, teilweise nicht.

**Empfehlung:** Einheitliches Pattern für alle Tools etablieren. Alle Schemas sollten `additionalProperties: false` setzen.

### 4.3 Preflight-Validierung in `startDeviceProgram.ts`

**Befund:** Die Preflight-Prüfung geht davon aus, dass die API ein Array mit Objekten zurückgibt, die `programId` enthalten. Das tatsächliche Antwortformat der Miele API muss validiert werden.

**Empfehlung:** Mit echten API-Antworten testen und den Vergleich anpassen. Defensive Prüfung hinzufügen für den Fall, dass die API ein anderes Format liefert.

### 4.4 Error-Handling ist nicht einheitlich

**Befund:** Manche Tools setzen `isError: true` bei Fehlern, andere nicht (z.B. Preflight-Failures geben normale Responses ohne `isError` zurück).

**Empfehlung:** Klare Konvention: Preflight-Blockaden sind keine Fehler (kein `isError`), aber technische Fehler (Netzwerk, Auth) setzen `isError: true`. Das ist aktuell teilweise so, sollte aber explizit dokumentiert werden.

---

## 5. Dokumentation (Priorität: NIEDRIG)

### 5.1 `appliance-sentinel-config.md` ist veraltet

**Befund:** Die Liste der verfügbaren Tools in dieser Datei (Zeile 41-44) ist unvollständig. Es fehlen `get_device_camera`, `put_device_action`, `start_device_program`, `get_all_filling_levels`, `get_device_filling_levels`, `get_failure_details`.

**Empfehlung:** Tool-Liste aktualisieren oder aus dieser Datei entfernen und auf die zentrale SPEC verweisen.

### 5.2 `USE_CASES.md` referenziert keine neuen Tools

**Befund:** Das Dokument erwähnt `start_device_program`, `get_all_filling_levels`, `get_device_filling_levels` und `get_failure_details` nicht.

**Empfehlung:** Aktualisieren mit Szenarien für diese neuen Tools (z.B. "Ist der Klarspüler noch voll?" → `get_device_filling_levels`).

### 5.3 SPEC.md enthält veraltete Acceptance Criteria

**Befund:** Zeile 776 sagt "MCP server starts via systemd", was nicht mehr zutrifft (Docker Compose).

**Empfehlung:** Auf "MCP server starts via Docker Compose" ändern.

---

## 6. Empfohlene Roadmap

### Phase A: Sicherheitshärtung ✅ (abgeschlossen 2026-06-02)

| # | Aufgabe | Status |
|---|---------|--------|
| A1 | MCP-API-Token-Authentifizierung als Middleware implementieren | ✅ Erledigt |
| A2 | Produktive Secrets rotieren und `.env.example` bereinigen | ✅ Erledigt |
| A3 | OAuth-State-TTL und Aufräumlogik einbauen | ✅ Erledigt |
| A4 | Hardcoded IP-Adresse entfernen | ✅ Erledigt |

### Phase B: Betriebsreife

| # | Aufgabe | Aufwand |
|---|---------|--------|
| B1 | `operation_log` für alle Write-Operationen befüllen | Mittel |
| B2 | Port-Konfiguration in Dockerfile/Compose vereinheitlichen | Klein |
| B3 | Automatisierte Tests (Jest/Vitest) für Kernlogik aufsetzen | Mittel |
| B4 | Tool-Handler-Signaturen und Schemas vereinheitlichen | Klein |

### Phase C: Erweiterung

| # | Aufgabe | Aufwand |
|---|---------|--------|
| C1 | `device_permissions` korrekt aus JWT Claims befüllen oder entfernen | Mittel |
| C2 | Dokumentation aktualisieren (Sentinel-Config, Use Cases, SPEC) | Klein |
| C3 | Structured Logging (z.B. mit Pino) statt `console.log` | Mittel |
| C4 | Health-Check erweitern (DB-Konnektivität, Token-Status) | Klein |

---

## 7. Fazit

Das MVP erreicht seinen Zweck: Es verbindet Miele-Geräte sicher über OAuth2 mit MCP-Clients und bietet sowohl Lese- als auch Schreibzugriff mit Sicherheitsprüfungen. Die Architektur ist klar strukturiert und erweiterbar.

Die **kritischste offene Flanke** ist die fehlende Authentifizierung auf den MCP-Endpunkten selbst (Punkt 2.1). Da der Server öffentlich erreichbar ist (`mielemcp.never2sunny.eu`), sollte dies als erstes adressiert werden.

Alle weiteren Punkte sind Verbesserungen, die den Server robuster, wartbarer und produktionsreifer machen, aber das Kernfunktionieren nicht beeinträchtigen.
