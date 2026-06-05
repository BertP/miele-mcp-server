# Claude Desktop Integration – Miele MCP Server

## Übersicht

Der Miele MCP Server läuft auf **`192.168.1.251:8089`** und ist öffentlich erreichbar unter **`https://mielemcp.never2sunny.eu`**. Dieser Server stellt 12 MCP-Tools bereit, mit denen Claude auf Miele-Hausgeräte zugreifen kann.

---

## Voraussetzung: Miele OAuth-Login

**Einmalig** muss die Verbindung zu Miele autorisiert werden:

1. Öffne im Browser: `https://mielemcp.never2sunny.eu/auth/login`
2. Logge dich mit deinem Miele-Konto ein und erlaube den Zugriff auf deine Geräte.
3. Du wirst nach erfolgreicher Anmeldung auf eine Erfolgsseite weitergeleitet.
4. Der Server speichert die Tokens dauerhaft in der SQLite-Datenbank und erneuert sie automatisch.

Status jederzeit prüfbar unter: `https://mielemcp.never2sunny.eu/health`

---

## Claude Desktop Konfiguration

### Konfigurationsdatei finden

| Betriebssystem | Pfad |
|---|---|
| **Windows** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **macOS** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Linux** | `~/.config/Claude/claude_desktop_config.json` |

---

### Option A: Verbindung über SSE (Legacy – **nicht empfohlen**)

> ⚠️ **Veraltet:** Der Miele MCP Server unterstützt **keinen** SSE-Endpunkt (`/mcp/sse`). Diese Option führt zu einer endlosen Reconnect-Schleife und Token-Refresh-Fehlern. Bitte Option C verwenden.

```json
{
  "mcpServers": {
    "miele-appliance-sentinel": {
      "type": "sse",
      "url": "https://mielemcp.never2sunny.eu/mcp/sse?token=YOUR_MCP_API_TOKEN"
    }
  }
}
```

> **Hinweis:** Der Token `YOUR_MCP_API_TOKEN` entspricht dem `MCP_API_TOKEN` in der `.env`-Datei auf dem Server. Bei Rotation des Tokens muss diese Konfiguration entsprechend aktualisiert werden.

---

### Option B: Verbindung über lokales Netzwerk (schneller, kein SSL)

Falls Claude Desktop im gleichen Netzwerk wie der Server (192.168.1.251) betrieben wird:

```json
{
  "mcpServers": {
    "miele-appliance-sentinel": {
      "type": "sse",
      "url": "http://192.168.1.251:8089/mcp/sse?token=YOUR_MCP_API_TOKEN"
    }
  }
}
```

---

### Option C: Streamable HTTP – ✅ Empfohlen für Claude Desktop for Windows

Für Claude Desktop for Windows (ab Version 1.x) und andere moderne MCP-Clients. **Dies ist die einzige funktionierende Option für Claude Desktop**, da der Server nur Streamable HTTP (`/mcp/stream`) unterstützt:

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

---

## Verfügbare Tools nach der Verbindung

Sobald Claude Desktop verbunden ist, stehen automatisch diese 12 Tools zur Verfügung:

| Tool | Beschreibung |
|---|---|
| `list_devices` | Alle verbundenen Miele-Geräte anzeigen |
| `get_device` | Vollständige Details eines Geräts abrufen |
| `get_device_state` | Aktuellen Status (Temperatur, Restzeit, Programm) eines Geräts lesen |
| `get_device_actions` | Verfügbare Aktionen für ein Gerät abfragen |
| `get_device_programs` | Verfügbare Programme eines Geräts auflisten |
| `get_device_ident` | Identitätsdaten (Modell, Seriennummer) eines Geräts abrufen |
| `get_all_filling_levels` | Füllstände aller Geräte prüfen (Salz, Klarspüler, Waschmittel) |
| `get_device_filling_levels` | Füllstände eines bestimmten Geräts prüfen |
| `get_failure_details` | Fehlermeldungen und Störungsdetails eines Geräts abrufen |
| `get_device_camera` | Live-Kamerabild aus dem Backofen abrufen (benötigt `mcs_thirdparty_media` Scope) |
| `put_device_action` | Aktion an ein Gerät senden (mit Preflight-Prüfung & Dry-Run-Modus) |
| `start_device_program` | Programm auf einem Gerät starten (mit Preflight-Prüfung & Dry-Run-Modus) |

---

## Sicherheitshinweise

- Das `MCP_API_TOKEN` sichert den Zugriff auf den MCP-Server. Gib die Config-Datei nicht weiter.
- Der Miele OAuth-Token wird **nicht** in der URL exponiert – er läuft intern auf dem Server.
- Schreibende Aktionen (`put_device_action`, `start_device_program`) führen immer eine Preflight-Prüfung gegen die Miele API durch, bevor sie ausgeführt werden.
- Mit dem `dryRun: true`-Parameter kann jede Schreibaktion simuliert werden, ohne das Gerät tatsächlich zu steuern.

---

## Verbindung testen

### Health-Check (Server-Status & Token-Status):
```bash
curl https://mielemcp.never2sunny.eu/health
```

Erwartete Antwort (eingeloggt):
```json
{
  "status": "ok",
  "database": "connected",
  "auth": {
    "authenticated": true,
    "expiresInSeconds": 3542,
    "tokenStatus": "valid"
  }
}
```

### Tool-Liste per curl abrufen:

**Schritt 1 – Session initialisieren:**
```bash
curl -X POST https://mielemcp.never2sunny.eu/mcp/stream \
  -H "Authorization: Bearer YOUR_MCP_API_TOKEN" \
  -H "Accept: application/json, text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'
```
*(Speichere den `mcp-session-id`-Header aus der Antwort.)*

**Schritt 2 – Tool-Liste abrufen:**
```bash
curl -X POST https://mielemcp.never2sunny.eu/mcp/stream \
  -H "Authorization: Bearer YOUR_MCP_API_TOKEN" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: DEINE_SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

---

## Netzwerk-Topologie

```
Claude Desktop (beliebiger Rechner)
      |
      | HTTPS (Port 443)
      v
https://mielemcp.never2sunny.eu
      |
      | Nginx Reverse Proxy
      v
http://192.168.1.251:8089   ← Miele MCP Server (Docker Container)
      |
      | REST + OAuth2 Bearer Token
      v
https://api.mcs3.miele.com/v1  ← Miele 3rd Party API
```

---

## Fehlerbehebung

| Fehler | Ursache | Lösung |
|---|---|---|
| `401 Unauthorized` | Token fehlt oder falsch | Token in URL prüfen: `?token=7b26765...` |
| `auth.authenticated: false` | Kein Miele-Login | `https://mielemcp.never2sunny.eu/auth/login` aufrufen |
| `Cannot POST /register` | Inspector im Proxy-Modus | Connection Type auf `Direct` setzen |
| `SSE error: Failed to fetch` | CORS-Problem | Inkognito-Modus verwenden; Token in der URL nutzen (nicht als Header) |
| `No valid token available` + endlose Reconnect-Schleife in Logs | Refresh Token abgelaufen (`invalid_grant`) **und/oder** falscher Endpunkt (`/mcp/sse`) | 1. Re-Login: `https://mielemcp.never2sunny.eu/auth/login` 2. Config auf Option C (Streamable HTTP) umstellen |
| `Failed to refresh token` / `invalid_grant` | Miele hat den Refresh Token invalidiert (z.B. nach längerem Nichtgebrauch oder Server-Neustart) | Einmalig neu einloggen: `https://mielemcp.never2sunny.eu/auth/login` |

---

## Bekannte Einschränkungen

- Der Server unterstützt **kein** SSE-Protokoll (`/mcp/sse`). Nur Streamable HTTP (`/mcp/stream`) funktioniert.
- `mcp-remote` (Legacy-Wrapper) ist **nicht kompatibel** — direkt `type: http` in der `claude_desktop_config.json` verwenden.
- Der Miele OAuth Refresh Token kann ablaufen oder invalidiert werden. Bei `invalid_grant`-Fehlern im Server-Log ist ein Re-Login über `/auth/login` erforderlich.

---

## Incident-Log

### 2026-06-03 – Komplettausfall nach Token-Ablauf

**Symptome:**
- Claude meldet `No valid token available. User must authenticate first.`
- Server-Logs zeigen endlose `GET /mcp/sse`-Reconnects
- `Failed to refresh token | invalid_grant` im Container-Log

**Ursachen (zwei unabhängige Probleme):**
1. Miele OAuth Refresh Token abgelaufen/invalidiert
2. `claude_desktop_config.json` verwendete noch `mcp-remote` mit `/mcp/sse` (SSE-Protokoll), das der Server nicht unterstützt

**Lösung:**
1. Re-Login unter `https://mielemcp.never2sunny.eu/auth/login`
2. `claude_desktop_config.json` auf `type: http` mit `/mcp/stream` umgestellt (Option C)
3. Claude Desktop neugestartet

**Ergebnis:** Alle 9 Geräte wieder online, Verbindung stabil.
