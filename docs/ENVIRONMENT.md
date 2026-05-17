# Environment variables

Configure the API by placing a **`.env`** file in the **`server/`** directory (loaded in `server/index.js` via `dotenv`).

Variables are read in [`server/src/config/env.js`](../server/src/config/env.js) unless noted. Values shown are **defaults when unset** (or typical development behavior).

## Core server

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `5001` | HTTP port for the Express API |
| `NODE_ENV` | *(unset → treated as development in health checks)* | Standard Node environment; affects cookie secure default (see Auth) |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed CORS origin (single origin, credentials enabled) |

## Seylan sandbox / bank integration

Used for sandbox URLs and team credentials. All default to empty strings unless set.

| Variable | Default | Purpose |
|----------|---------|---------|
| `SEYLAN_SANDBOX_URL` | `""` | Base URL reused for sandbox, LankaQR, inquiry, and transfer endpoints in config |
| `SEYLAN_TEAM_API_KEY` | `""` | Team API key |
| `SEYLAN_SOURCE_ACCOUNT` | `""` | Source account identifier |
| `SEYLAN_INTERNAL_DESTINATION_ACCOUNT` | `""` | Internal destination account |

**Local dev:** Optional if you only exercise auth and static flows. **Production / demos:** Set when bank features should call real sandbox endpoints.

## MPGS (Mastercard Payment Gateway Services)

| Variable | Default | Purpose |
|----------|---------|---------|
| `MPGS_MERCHANT_ID` | `TESTCURSOR6` | Merchant ID |
| `MPGS_API_PASSWORD` | `""` | API password |
| `MPGS_BASE_URL` | `https://test-seylan.mtf.gateway.mastercard.com/api/rest/version/62` | REST API base |
| `MPGS_CHECKOUT_JS_URL` | `https://test-seylan.mtf.gateway.mastercard.com/checkout/version/62/checkout.js` | Checkout JS |
| `MPGS_MERCHANT_NAME` | `Cursor Buildathon 6` | Display merchant name |

**Local dev:** Optional unless testing hosted checkout / payments.

## Auth, database, sessions

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_PATH` | `{server cwd}/data/finwise-auth.sqlite` | SQLite database file path |
| `SESSION_TTL_MS` | `1209600000` (14 days) | Session lifetime |
| `SESSION_COOKIE_NAME` | `fw_session` | Session cookie name |
| `COOKIE_SECURE` | `true` if `NODE_ENV === "production"` and **`COOKIE_INSECURE` is not truthy** | Send cookie only over HTTPS when true |
| `COOKIE_INSECURE` | — | If truthy (`1`, `true`, `yes`), allows non-secure cookies even in production (testing only) |
| `PASSWORD_RESET_EXPIRY_MS` | `3600000` (1 hour) | Reset token validity |
| `PASSWORD_RESET_FRONTEND_ORIGIN` | `CLIENT_ORIGIN` or `http://localhost:5173` | Base URL for password-reset links emailed to users |
| `AVATAR_UPLOAD_DIR` | `{server cwd}/data/uploads/avatars` | Directory for uploaded avatars |

Truthy helpers for `COOKIE_SECURE`, `COOKIE_INSECURE`: `1`, `true`, `yes` (case-insensitive) in [`env.js`](../server/src/config/env.js).

## Email (password reset, etc.)

From address falls back to `SMTP_USER` or `no-reply@localhost`.

| Variable | Default | Purpose |
|----------|---------|---------|
| `SMTP_FROM` | `SMTP_USER` or `no-reply@localhost` | From header for outbound mail |
| `SMTP_URL` | `""` | Connection URL if your mail provider supplies one |
| `SMTP_HOST` | `""` | SMTP host |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | `""` | SMTP username |
| `SMTP_PASS` | `""` | SMTP password |

**Local dev:** Without SMTP, password-reset emails may not send; the UI may still allow requesting a reset depending on server behavior.

## OpenAI (AI assistant / money advice routes)

Defined in [`server/src/services/openaiClient.js`](../server/src/services/openaiClient.js), not `env.js`.

| Variable | Default | Purpose |
|----------|---------|---------|
| `OPENAI_API_KEY` | *(unset)* | If unset, `getOpenAI()` returns `null` and AI features that need the client may be limited or error |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model name passed to the API |

**Local dev:** Optional for core banking UI; set when testing AI endpoints.

## Quick minimal `.env` for local UI + API

```env
# Often enough to match README defaults
CLIENT_ORIGIN=http://localhost:5173
PORT=5001
```

Add Seylan, MPGS, SMTP, and OpenAI variables as you enable those features.
