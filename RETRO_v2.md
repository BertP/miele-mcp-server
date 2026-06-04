# Projekt-Retrospektive: Miele MCP Server – Betriebsreife & Stabilitätshärtung

**Version:** 2.0  
**Datum:** 2026-06-04  
**Status:** Produktionsbereit mit offenen Optimierungspunkten  

---

## 1. Zusammenfassung

Aufbauend auf dem abgeschlossenen MVP (Phase A: Sicherheitshärtung) wurden in dieser Iteration alle Punkte der Phasen B und C aus der RETRO_v1.md adressiert. Darüber hinaus wurden durch den produktiven Einsatz neue Erkenntnisse gewonnen – insbesondere rund um das Verbindungsprotokoll (SSE vs. Streamable HTTP), CORS-Konfiguration und die Dauerhaftigkeit der Miele-OAuth-Session.

### Was gut gelaufen ist

- **Phase B & C vollständig abgeschlossen:** Operation Log, Port-Alignment, Tests, Docs, Logger und Health-Check sind implementiert.
- **Erkenntnisse aus dem Produktivbetrieb:** Der erste echte Ausfall hat die Architektur-Entscheidung für Streamable HTTP über SSE bewiesen und in der Dokumentation verankert.
- **Schnelle Fehlerdiagnose:** Der neue strukturierte Logger und der erweiterte `/health`-Endpunkt haben die Ursachenforschung beim Incident erheblich beschleunigt.
- **Umfassende Dokumentation für Integrationspartner:** `CLAUDE_CONFIG.md` und `MCP_AGENT_CONFIG.md` decken alle wichtigen KI-Agenten ab.

### Was verbessert werden sollte

Die folgenden Punkte wurden durch den Produktivbetrieb und eine erneute Code-Review identifiziert.

---

## 2. Stabilitätsbefunde (Priorität: HOCH)

### 2.1 Miele OAuth Session bricht durch Inaktivität ab (BEKANNTES PROBLEM)

**Befund:** Der Miele OAuth Refresh Token wird serverseitig invalidiert (`invalid_grant`), wenn:
- Die Verbindung über einen längeren Zeitraum (ca. 30+ Tage) nicht genutzt wird.
- Miele serverseitig Sicherheits-Updates durchführt oder das Passwort geändert wird.
- Der Refresh-Zyklus durch einen Netzwerkabriss unterbrochen wird (Token-Rotation fehlgeschlagen, alte Token entwertet, neue nicht gespeichert).

Der Background-Refresh-Interval (alle 15 Minuten) verhindert das Ablaufen des **Access Tokens** (1h TTL), kann aber einen durch Miele serverseitig invalidierten **Refresh Token** nicht reparieren.

**Aktuelles Verhalten:** Bei einem ungültigen Refresh Token gibt `/health` weiterhin `"tokenStatus": "expired"` zurück, obwohl der Hintergrund-Refresh aktiv versucht (und scheitert), ihn zu erneuern.

**Empfehlung:**
- `/health` soll explizit unterscheiden zwischen:
  - `"tokenStatus": "valid"` – Token aktiv und frisch
  - `"tokenStatus": "refresh_failed"` – Refresh Token ungültig, manueller Re-Login nötig
  - `"tokenStatus": "none"` – Keine Session vorhanden
- Eine optionale E-Mail- oder Webhook-Benachrichtigung einbauen, wenn der Refresh fehlschlägt, damit der Administrator ohne Log-Beobachtung informiert wird.

### 2.2 Keine Retry-Logik beim Token-Refresh

**Befund:** `TokenService.refreshAccessToken()` gibt bei einem Fehler (z.B. Netzwerkfehler) sofort `null` zurück. Bei einem kurzen Netzwerkausfall zwischen Server und Miele API wird der Refresh nicht wiederholt.

**Risiko:** Ein kurzer Netzwerkausfall (1-2 Sekunden) kann dazu führen, dass der Server für bis zu 15 Minuten (bis zum nächsten Interval-Tick) keine gültigen Tokens abrufen kann.

**Empfehlung:** Exponentielles Backoff mit 2-3 Versuchen im `refreshAccessToken()` implementieren.

---

## 3. Architektur-Befunde (Priorität: MITTEL)

### 3.1 Imports nach Applikationsstart in `index.ts`

**Befund:** In `index.ts` werden mehrere `import`-Statements *nach* dem `const app = express()` und nach dem ersten `app.use(...)` platziert (Zeilen 13–20). Das ist in modernem JavaScript/TypeScript syntaktisch zwar erlaubt (alle Imports werden gehoisted), gilt aber als schlechter Stil und kann bei zukünftigen Refactorings zu Verwirrung führen.

**Empfehlung:** Alle Imports an den Anfang der Datei verschieben.

### 3.2 Unused Import `isInitializeRequest`

**Befund:** `isInitializeRequest` wird in `index.ts` (Zeile 17) aus dem MCP SDK importiert, aber nie verwendet.

**Empfehlung:** Ungenutzten Import entfernen.

### 3.3 MCP-Session-Verwaltung ohne Memory-Limit

**Befund:** Die Maps `streamableTransports` und `sseTransports` in `index.ts` wachsen mit jeder neuen Client-Verbindung. Sessions werden zwar beim Close-Event entfernt, aber es gibt keinen Mechanismus, um verwaiste Sessions (z. B. bei abrupt abgebrochenen Verbindungen ohne Close-Event) zu bereinigen.

**Risiko:** Bei vielen kurzlebigen Verbindungen (z.B. mehrere KI-Agenten hintereinander) wächst der Speicherbedarf unbegrenzt.

**Empfehlung:** Einen TTL-basierten Purge-Mechanismus für Sessions einbauen (z.B. Sessions, die seit >30 Minuten keine Aktivität hatten, aus der Map entfernen).

### 3.4 CORS-Middleware gibt Wildcard-Origin zurück bei fehlendem Origin-Header

**Befund:** Die CORS-Middleware in `index.ts` (Zeile 23) setzt bei fehlendem `Origin`-Header `'*'` als Access-Control-Allow-Origin:
```typescript
const origin = req.headers.origin || '*';
```
Damit wird `Access-Control-Allow-Credentials: true` mit `Access-Control-Allow-Origin: *` kombiniert, was von Browsern abgelehnt wird (Sicherheitsspezifikation).

**Empfehlung:** Nur einen echo-Origin zurückgeben wenn ein Origin-Header vorhanden ist. Ohne Origin-Header keinen CORS-Header setzen:
```typescript
const origin = req.headers.origin;
if (origin) {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}
```

### 3.5 Kein Health-Check für SSE-Endpunkt

**Befund:** Der `/health`-Endpunkt prüft DB-Konnektivität und Miele-Token-Status, aber gibt keinen Hinweis über den Zustand aktiver Verbindungen (wie viele Sessions aktiv sind, ob SSE- oder Streamable-HTTP-Transports geöffnet sind).

**Empfehlung:** Aktive Session-Anzahl in `/health` aufnehmen:
```json
"sessions": {
  "streamable": 2,
  "sse": 0
}
```

---

## 4. Token-Management-Befunde (Priorität: MITTEL)

### 4.1 `getValidToken()` wird bei jedem `/health`-Aufruf ausgeführt

**Befund:** Seit dem letzten Update ruft der `/health`-Endpoint `TokenService.getValidToken()` auf. Bei schnell aufeinanderfolgenden Anfragen (z. B. Monitoring-Systeme, die alle 10 Sekunden prüfen) kann dies zu unnötiger Last auf dem Miele OAuth-Endpunkt führen, falls der Token knapp vor dem Ablauf steht.

**Empfehlung:** Im `getValidToken()` oder im `/health`-Handler ein kurzes Debouncing einbauen: Refresh nicht häufiger als einmal pro Minute wirklich durchführen.

### 4.2 Kein Logging des Refresh-Token-Ablaufdatums

**Befund:** Beim erfolgreichen Token-Refresh wird lediglich `✅ Access token refreshed successfully.` geloggt, aber nicht, wann der neue Token abläuft. Bei der Fehlersuche ist es hilfreich zu wissen, wie lange der frische Token noch gültig ist.

**Empfehlung:** Nach erfolgreichem Refresh den neuen `expires_at`-Zeitstempel im Log ausgeben.

---

## 5. Code-Qualität (Priorität: NIEDRIG)

### 5.1 Logger gibt `config` als Wildcard ohne Nullprüfung weiter

**Befund:** In `logger.ts` wird `config?.LOG_LEVEL` und `config?.NODE_ENV` mit optionalem Chaining verwendet, was impliziert, dass `config` zur Laufzeit `undefined` sein könnte. Da `config` aus Zod-validiertem Import kommt und immer vorhanden ist, ist das optionale Chaining redundant und kann die statische Analyse täuschen.

**Empfehlung:** Optionales Chaining in `logger.ts` entfernen, da `config` garantiert vorhanden ist.

### 5.2 `OperationLogRepository` hat keine Abfrage-Methode

**Befund:** Das `OperationLogRepository` kann nur schreiben (`log()`), aber nicht lesen. Es gibt kein Tool und keinen Endpunkt, über den die KI oder der Administrator die protokollierten Operationen abrufen kann.

**Empfehlung:** Eine `getRecentLogs(limit: number)`-Methode implementieren und optional ein MCP-Tool `get_operation_log` hinzufügen, über das die KI die letzten Schreiboperationen abrufen kann (nützlich für Audits: „Was hat die KI zuletzt mit meinen Geräten gemacht?").

### 5.3 `docker-compose.yml` enthält veraltetes `version`-Attribut

**Befund:** Die `docker-compose.yml` enthält `version: '3.8'`, was seit Docker Compose v2 als obsolet gilt und beim Starten eine Warnung erzeugt.

**Empfehlung:** `version: '3.8'`-Zeile entfernen.

### 5.4 `CLAUDE_CONFIG.md` und `MCP_AGENT_CONFIG.md` enthalten sicherheitskritische Tokens

**Befund:** Beide Dokumentationsdateien enthalten den echten `MCP_API_TOKEN` (`7b26765fc6b1819fb90545bf17c54558`) im Klartext. Diese Dateien sind im Git-Repository committed und damit potenziell öffentlich sichtbar (je nach Repository-Sichtbarkeit).

**Risiko:** Falls das Repository öffentlich ist oder wird, ist der Token sofort kompromittiert.

**Empfehlung:** Token in Dokumenten durch einen Platzhalter ersetzen (`YOUR_MCP_API_TOKEN`) und eine `.gitignore`-Regel oder einen Repository-Scan (z.B. `gitleaks`) einrichten.

---

## 6. Betriebserkenntnisse aus dem Incident 2026-06-03

### 6.1 Incident: Komplettausfall durch Token-Ablauf + Falsches Protokoll

**Symptome:** Endlose Reconnect-Schleife in den Logs, Claude Desktop zeigt „No valid token available".

**Root Causes:**
1. Miele Refresh Token war serverseitig invalidiert (`invalid_grant`).
2. Claude Desktop Config verwendete noch `mcp-remote` mit dem SSE-Endpunkt `/mcp/sse`, welcher bei dieser Server-Implementierung nicht stabil genug für Remote-Verbindungen über einen Nginx-Proxy ist.

**Lektionen:**
- **SSE ist für den Produktivbetrieb mit Reverse Proxies ungeeignet.** Der SSE-Endpunkt `/mcp/sse` bleibt im Code für Entwickler-Tools (MCP Inspector) erhalten, sollte aber in der Dokumentation noch klarer als „nicht für Produktion" markiert werden.
- **Streamable HTTP (`/mcp/stream`) ist der einzige offiziell supportete Verbindungsweg.**
- **Ein abgelaufener Refresh Token erfordert manuelles Eingreifen**, was besser kommuniziert werden muss (siehe Punkt 2.1).

---

## 7. Empfohlene Roadmap

### Phase D: Stabilität & Betrieb

| # | Aufgabe | Aufwand | Priorität |
|---|---------|---------|-----------|
| D1 | Retry-Logik (exponentielles Backoff) in `TokenService.refreshAccessToken()` | Klein | Hoch |
| D2 | Differenzierter `tokenStatus` in `/health` (`valid` / `refresh_failed` / `none`) | Klein | Hoch |
| D3 | CORS-Wildcard-Bug bei fehlendem Origin-Header beheben | Klein | Mittel |
| D4 | Ungenutzten Import `isInitializeRequest` und Import-Reihenfolge in `index.ts` bereinigen | Sehr Klein | Niedrig |
| D5 | `version`-Attribut aus `docker-compose.yml` entfernen | Sehr Klein | Niedrig |

### Phase E: Erweiterung & Observability

| # | Aufgabe | Aufwand | Priorität |
|---|---------|---------|-----------|
| E1 | `get_operation_log` MCP-Tool implementieren (Audit-Log per KI abrufbar) | Mittel | Mittel |
| E2 | Aktive Session-Zahl in `/health` aufnehmen | Klein | Niedrig |
| E3 | TTL-basierter Purge verwaister Transport-Sessions | Mittel | Mittel |
| E4 | Webhook/E-Mail-Benachrichtigung bei Token-Refresh-Fehlschlag | Mittel | Mittel |
| E5 | Tokens in Markdown-Dokumentation durch Platzhalter ersetzen | Klein | Hoch |

---

## 8. Fazit

Der Miele MCP Server hat seinen ersten Produktivbetrieb erfolgreich bestanden. Die Architektur ist solide; die identifizierten Schwachstellen liegen hauptsächlich im Bereich **Betriebsstabilität bei langen Laufzeiten** (Token-Refresh-Robustheit, Session-Management) und **Observability** (klarere Health-Meldungen, Audit-Log-Abfrage).

Die **dringendste offene Schwachstelle** ist die fehlende Unterscheidung zwischen einem durch Inaktivität abgelaufenem Access Token (selbst heilend) und einem durch Miele serverseitig invalidierten Refresh Token (erfordert manuellen Re-Login). Diese zwei Zustände müssen in `/health` sauber getrennt kommuniziert werden, damit KI-Agenten und Administratoren ohne Log-Analyse reagieren können.
