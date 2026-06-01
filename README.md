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

The easiest way to run the server in production is using Docker Compose.

1. Ensure your `.env` file is fully configured.
2. Build and start the container in detached mode:
   ```bash
   docker-compose up -d --build
   ```
3. The server will run on the port specified in your `docker-compose.yml` (default `8089`). Configure your Nginx Proxy Manager to forward traffic to this port. SQLite data is persisted locally in the `./data` directory.

## Demo Flow

The first version of this MVP is **read-only**.
1. Open the demo client or hit the login endpoint (`/auth/login`).
2. Log in using your Miele credentials and consent to specific appliances.
3. The server handles the callback (`/auth/callback`) and securely stores the refresh token.
4. MCP clients can now interact with the server using tools like `list_devices`, `get_device_state`, etc.
