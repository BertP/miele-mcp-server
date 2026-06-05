# Kompakte MCP-Konfiguration für KI-Agenten

Diese Übersicht zeigt, wie der Miele MCP Server (`https://mielemcp.never2sunny.eu` / `192.168.1.251:8089`) mit den wichtigsten KI-Agenten und Clients verbunden wird.

> [!IMPORTANT]
> **Empfohlener Verbindungstyp:** Verwende bevorzugt **Streamable HTTP** (`/mcp/stream`). Das klassische SSE-Protokoll (`/mcp/sse`) führt bei remote gehosteten Servern unter Claude Desktop zu Reconnect-Schleifen und Authentifizierungsproblemen.

---

## 1. Claude (Claude Desktop & Claude Code)

### Claude Desktop
Trage Folgendes in deine `claude_desktop_config.json` ein (Pfade: Windows `%APPDATA%\Claude\`, macOS `~/Library/Application Support/Claude/`, Linux `~/.config/Claude/`):

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

### Claude Code (CLI)
Füge den Server über das CLI hinzu:
```bash
claude mcp add miele-appliance-sentinel https://mielemcp.never2sunny.eu/mcp/stream --auth "Bearer YOUR_MCP_API_TOKEN"
```

---

## 2. Gemini (Android Studio & Gemini CLI / Project IDX)

### Android Studio (Gemini in Android Studio)
Unter **Settings > Tools > AI > MCP Servers** aktivieren und in die `mcp.json` eintragen:

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

### Gemini CLI
Falls du das offizielle Gemini CLI nutzt, füge den Server in die globale `settings.json` unter `mcpServers` hinzu:
```json
"miele-appliance-sentinel": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/client-http", "https://mielemcp.never2sunny.eu/mcp/stream", "--auth", "Bearer YOUR_MCP_API_TOKEN"]
}
```

---

## 3. ChatGPT & IDE-Agenten (Cursor / Windsurf / Custom GPTs)

### Cursor & Windsurf (Empfohlen für Entwickler-Agenten)
Für Cursor/Windsurf empfiehlt sich die Anbindung direkt über das UI:

1. Öffne die **Settings** (Zahnrad oben rechts in Cursor).
2. Gehe zu **Features > MCP**.
3. Klicke auf **"+ Add New MCP Server"**.
4. Trage folgende Werte ein:
   - **Name:** `miele-appliance-sentinel`
   - **Type:** `HTTP` (falls verfügbar) oder `SSE`
   - **URL:** 
     - Für **HTTP**: `https://mielemcp.never2sunny.eu/mcp/stream` (mit Header `Authorization: Bearer YOUR_MCP_API_TOKEN`)
     - Für **SSE**: `https://mielemcp.never2sunny.eu/mcp/sse?token=YOUR_MCP_API_TOKEN` (Falls der Client keine HTTP-Header im SSE-Modus unterstützt)

### Custom GPTs (ChatGPT Plus)
Für Custom GPTs in der ChatGPT-Weboberfläche wird der Server als **Action** über OpenAPI registriert. Da der MCP-Standard über HTTP-Endpunkte abgebildet wird, kannst du die Tools über die `/mcp/stream` Route mit Bearer-Token absichern. Alternativ greifen Gateways wie `mcp-gateway` die JSON-RPC-Anfragen ab.

---

## 4. MCP Inspector (Debugging Tool)

### Option A: Über Streamable HTTP (Empfohlen)
Verbinde den Inspector direkt mit dem sicheren HTTP-Stream:

1. Starte den Inspector lokal:
   ```bash
   npx @modelcontextprotocol/inspector
   ```
2. Wähle im Dropdown **Transport Type**: `HTTP` oder `Stream`
3. Trage als **URL** ein: `https://mielemcp.never2sunny.eu/mcp/stream`
4. Klappe **Headers** auf und füge hinzu:
   - **Key:** `Authorization`
   - **Value:** `Bearer YOUR_MCP_API_TOKEN`

### Option B: Über SSE (Fallback)
1. Wähle im Inspector **Transport Type**: `SSE`
2. Trage als **URL** ein:
   ```
   https://mielemcp.never2sunny.eu/mcp/sse?token=YOUR_MCP_API_TOKEN
   ```
