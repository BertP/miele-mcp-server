# Miele 3rd Party API MCP Server MVP

This repository contains the Model Context Protocol (MCP) server for the Miele 3rd Party API. 
It provides an OAuth2-authenticated bridge to read data from consented Miele domestic IoT appliances and expose them as MCP tools.

## Requirements

- Node.js LTS
- SQLite

## Setup (Local Development)

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in the required values.
   ```bash
   cp .env.example .env
   ```
4. Start the server in development mode:
   ```bash
   npm run dev
   ```

## Deployment (Docker Compose)

> **⚠️ WICHTIGER HINWEIS / IMPORTANT NOTE:**
> Für das Deployment und Server-Neustarts ist der KI-Assistent (Antigravity) verantwortlich. Bitte keine manuellen Deployments durchführen. 

The easiest way to run the server in production is using Docker Compose.

1. Ensure your `.env` file is fully configured.
2. Build and start the container in detached mode:
   ```bash
   docker compose up -d --build
   ```
3. The server will run on the port specified in your `docker-compose.yml` (default `8089`). In this network environment, the server runs on the local IP **`192.168.1.251`**. Configure your Nginx Proxy Manager / reverse proxy to forward traffic to `http://192.168.1.251:8089`. SQLite data is persisted locally in the `./data` directory.

## Demo Flow / Testing

The MVP includes read and write operations protected by robust preflight checks.
We recommend using the official MCP Inspector to test and demonstrate the server's capabilities.

1. Start the inspector: `npm run inspector`
2. Open the displayed inspector URL (usually `http://localhost:5173`) in your browser.
3. In a separate tab, hit the login endpoint (`http://localhost:3000/auth/login`) to log in using your Miele credentials and consent to specific appliances.
4. Go back to the MCP Inspector. You can now safely interact with the server using tools like `list_devices`, `get_device_state`, and `put_device_action`.

For a detailed step-by-step tutorial, please see the [MCP Guide](MCP_GUIDE.md).
