# FinWise AI

FinWise AI is a banking-style web app built for university students: track expenses, manage balances, and build savings habits. It pairs a **React** SPA with an **Express** API backed by **SQLite**.

## Features

- **Dashboard** — balances, recent activity, savings goals, and alerts  
- **Insights** — spending and financial health views  
- **Transactions** — transaction history  
- **Savings planner** — goal planning  
- **Scholarships** — scholarship-related content  
- **Transfer** — money movement flows (integrated with configured bank/payment sandboxes where enabled)  
- **AI assistant** — conversational help when OpenAI is configured  
- **Settings** — profile and preferences  
- **Auth** — register, login, forgot password, reset password (email when SMTP is configured)

## Stack

| Area | Technology |
|------|------------|
| Frontend | React 19, Vite 7, React Router 7, Tailwind CSS 4 |
| Backend | Node.js (ESM), Express 4 |
| Data | SQLite via `better-sqlite3` |
| Auth | Password hashing (`argon2`), HTTP-only session cookie |
| Optional | OpenAI API, Nodemailer (SMTP), Seylan sandbox / MPGS-related settings |

## Prerequisites

- **Node.js** (current LTS recommended)
- **Native build tools** for `better-sqlite3` where required (Windows may need Visual Studio Build Tools; macOS/Linux typically work out of the box with Xcode CLT / build-essential)

## Install

This repo uses **three separate `package.json` files**. Install dependencies in each:

```bash
npm install                 # root: concurrently for combined dev script
npm install --prefix server
npm install --prefix client
```

Create a **`server/.env`** file for local configuration. See [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for every variable and default. Never commit secrets; `.env` is gitignored.

## Run (development)

From the repository root:

```bash
npm run dev
```

This starts the API and the Vite dev server together.

Alternatively, in two terminals:

```bash
npm run dev --prefix server
npm run dev --prefix client
```

### Ports and proxying

- **API** — default [http://localhost:5001](http://localhost:5001) (`PORT` in `server/.env`)
- **Web UI** — [http://localhost:5173](http://localhost:5173) (Vite)

In development, the client proxies **`/api`** to the API server (see `client/vite.config.js`). The browser can call paths like `/api/health` on port 5173 and they reach Express.

### Sanity checks

- `GET /api/health` — service name, uptime, environment, route list  
- `GET /api/meta` — build/metadata payload used by the UI

Example (API direct):

```bash
curl -s http://localhost:5001/api/health | head
```

## Build (production assets)

```bash
npm run build --prefix client
```

Static output is written under `client/dist/`. The dev-only Vite proxy is **not** used in production: you must serve the SPA and API with a correct **origin** and routing strategy (e.g. reverse proxy forwarding `/api` to the Node process, or configuring the SPA to use the API’s public URL).

## Production notes

- **CORS** is configured for a single origin: set `CLIENT_ORIGIN` to your real frontend URL.
- **Cookies** — in production, `COOKIE_SECURE` defaults to on unless you override with `COOKIE_INSECURE=true` for testing. Use HTTPS in real deployments.
- **Data** — default SQLite path and avatar uploads live under `server/data/` (see `DATABASE_PATH` and `AVATAR_UPLOAD_DIR`). That directory is gitignored; back it up if you rely on it.

## Configuration

Full environment variable reference: **[docs/ENVIRONMENT.md](docs/ENVIRONMENT.md)**

Repository layout and request flow: **[docs/STRUCTURE.md](docs/STRUCTURE.md)**

Contributor quick start: **[CONTRIBUTING.md](CONTRIBUTING.md)**
