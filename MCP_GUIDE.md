# MCP Guide

Dieses Dokument beschreibt, wie du den Miele MCP Server mit verschiedenen Clients verbinden, testen und nutzen kannst.

---

## 1. Testen mit dem MCP Inspector

Der offizielle [MCP Inspector](https://github.com/modelcontextprotocol/inspector) ist das empfohlene Tool, um den Miele MCP Server zu testen. Er bietet eine interaktive Weboberfläche, um alle verfügbaren MCP Tools bequem aufzurufen.

### Option A: Verbindung mit lokalem Server (Stdio)

Wenn du den Server lokal auf deinem Entwicklungsrechner ausführst:

1. Starte den Inspector über das bereitgestellte npm-Skript:
   ```bash
   npm run inspector
   ```
2. Der Inspector startet und bindet den lokalen Server automatisch über **Stdio** an (kein API-Token erforderlich, da es eine direkte Prozesskopplung ist).
3. Öffne die Weboberfläche des Inspectors (standardmäßig unter `http://localhost:5173`).

### Option B: Verbindung mit deploytem Server (SSE)

Wenn du den Inspector mit dem bereits deployten und abgesicherten Server (z. B. unter `https://mielemcp.never2sunny.eu`) verbinden möchtest:

1. Starte den Inspector ohne Argumente oder nutze den gehosteten Inspector unter `https://todesktop.com/mcp/inspector` (oder lokal über `npx @modelcontextprotocol/inspector`).
2. Wähle als **Transport Type** `SSE` aus.
3. Gib unter **URL** die SSE-Adresse deines Servers ein. Hier musst du das API-Token übergeben. Es gibt zwei Wege, den Token als Parameter zu übergeben:
   
   * **Weg 1: Direkt in der URL als Query-Parameter (Empfohlen)**
     * Trage in das URL-Feld Folgendes ein:
       ```
       https://mielemcp.never2sunny.eu/mcp/sse?token=DEIN_MCP_API_TOKEN
       ```
       *(Ersetze `DEIN_MCP_API_TOKEN` mit dem echten Wert aus deiner `.env`)*
   
   * **Weg 2: Über Custom Headers**
     * Klappe die Sektion **Authentication** auf.
     * Aktiviere (Schalter auf blau) und trage ein:
       * **Header Name:** `Authorization`
       * **Header Value:** `Bearer DEIN_MCP_API_TOKEN`

### Authentifizierung am Server (OAuth Consent)
Bevor du Tools nutzen kannst, die eine Verbindung zur Miele API herstellen, muss der MCP Server autorisiert werden:
1. Öffne einen **neuen Browser-Tab**.
2. Navigiere zum Login-Endpunkt des Servers (lokal z. B. `http://localhost:8089/auth/login`, remote z. B. `https://mielemcp.never2sunny.eu/auth/login`).
3. Logge dich mit deinen Miele-Zugangsdaten ein und wähle die Geräte aus (Consent).
4. Nach erfolgreicher Autorisierung leitet dich die Miele API auf den Server zurück.

---

## 2. Verbindung mit Claude Desktop

Die offizielle Claude Desktop-App unterstützt Model Context Protocol (MCP) und kann mit diesem Server verbunden werden. 

Je nachdem, ob du die deployte Instanz über das Internet (per **SSE**) oder eine lokale Instanz direkt starten möchtest (per **Stdio**), konfiguriere die entsprechende Sektion in deiner Konfigurationsdatei.

### Speicherort der Konfigurationsdatei
Die Datei `claude_desktop_config.json` befindet sich an folgendem Pfad:
* **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
* **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Linux:** `~/.config/Claude/claude_desktop_config.json`

### Option A: Anbindung per SSE (Empfohlen für den deployten Server)
Wenn der Server bereits läuft und über Nginx/HTTPS erreichbar ist (z. B. unter `https://mielemcp.never2sunny.eu`), kannst du Claude Desktop per SSE (Server-Sent Events) anbinden.

Füge unter `mcpServers` folgenden Eintrag hinzu:

```json
{
  "mcpServers": {
    "miele-mcp-server": {
      "type": "sse",
      "url": "https://mielemcp.never2sunny.eu/mcp/sse?token=DEIN_MCP_API_TOKEN"
    }
  }
}
```

> [!IMPORTANT]
> Ersetze `DEIN_MCP_API_TOKEN` mit dem echten Wert der Variable `MCP_API_TOKEN` aus deiner `.env`-Datei.

### Option B: Anbindung per Stdio (Für lokale Entwicklung)
Falls du den Server direkt lokal von Claude Desktop starten lassen möchtest, kannst du die Verbindung per Stdio herstellen.

1. Baue das Projekt lokal (`npm run build`).
2. Trage folgendes in die Konfigurationsdatei ein:

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
        "MIELE_CLIENT_ID": "DEIN_MIELE_CLIENT_ID",
        "MIELE_CLIENT_SECRET": "DEIN_MIELE_CLIENT_SECRET",
        "SESSION_SECRET": "DEIN_SESSION_SECRET",
        "MCP_API_TOKEN": "DEIN_MCP_API_TOKEN",
        "MIELE_SCOPES": "mcs_thirdparty_read mcs_thirdparty_media mcs_thirdparty_write"
      }
    }
  }
}
```

> [!NOTE]
> * Passe die Pfade und Umgebungsvariablen an deine lokale Umgebung an.
> * Nach jeder Änderung an der `claude_desktop_config.json` musst du Claude Desktop **vollständig neu starten** (Beenden und neu öffnen), damit die Änderungen wirksam werden.

---

## 3. Tools interaktiv testen

Sobald die Verbindung steht (entweder im Inspector oder in Claude Desktop), kannst du folgende Tools nutzen:

### Lese-Tools (Read)
* **`list_devices`**: Listet alle autorisierten Miele-Geräte auf.
* **`get_device_state`**: Liefert den genauen Status eines bestimmten Geräts (z.B. Restlaufzeit, Temperatur).
* **`get_device_actions`** / **`get_device_programs`**: Zeigt an, welche Programme oder Befehle das Gerät im aktuellen Zustand akzeptiert.
* **`get_all_filling_levels`** / **`get_device_filling_levels`**: Zeigt Füllstände an (z. B. für Waschmittel, Klarspüler).
* **`get_failure_details`**: Zeigt Fehlermeldungen des Geräts.

### Schreib-Tools (Write)
* **`put_device_action`**: Sendet Befehle wie Start, Stopp oder Einstellungen an das Gerät.
  * **Tipp für Demos:** Nutze den Parameter `dryRun: true`. Der Server führt dann die logische Validierung (Preflight-Check) aus, sendet aber keinen echten Befehl an die Miele API.
