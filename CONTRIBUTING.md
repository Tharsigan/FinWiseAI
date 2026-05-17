# Contributing to FinWise AI

## Setup

1. Clone the repository.
2. Install dependencies in **three** places:

   ```bash
   npm install
   npm install --prefix server
   npm install --prefix client
   ```

3. Copy or create `server/.env` — see [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md).

## Run locally

From the repo root:

```bash
npm run dev
```

Or run the API and client separately:

```bash
npm run dev --prefix server
npm run dev --prefix client
```

## Where things live

| Path | Role |
|------|------|
| `client/src/` | React app (pages, components, `services/api.js`) |
| `server/index.js` | Process entry: loads env, listens on `PORT` |
| `server/src/app.js` | Express app: middleware, health/meta, route mounts |
| `server/src/routes/` | HTTP route modules |
| `server/src/repos/` | Data access (e.g. SQLite) |
| `server/src/config/env.js` | Environment configuration |

For how requests reach the API in development vs production, see [docs/STRUCTURE.md](docs/STRUCTURE.md).

## Checks before you push

- Confirm `GET http://localhost:5001/api/health` (or via `http://localhost:5173/api/health` in dev) returns JSON with `ok: true`.
- If you change env vars, document them in [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md).
