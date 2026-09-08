# Environment variables

Copy `functions/.env.example` → `functions/.env`.

## Required for production

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string (Atlas or self-hosted) |
| `MONGODB_DB_NAME` | Database name (default `devcon1`) |
| `ENCRYPTION_KEY` | Encrypts SMTP/Resend secrets at rest (long random string) |
| `JWT_SECRET` | Signs console admin session tokens |

## HTTP

| Variable | Purpose |
| --- | --- |
| `PORT` | Local server port (default `5050`) |
| `CORS_ORIGINS` | Comma-separated allowed origins, or `*` |

## Auth / MFA

| Variable | Purpose |
| --- | --- |
| `JWT_EXPIRES_IN` | Session lifetime (default `8h`) |
| `MFA_PENDING_EXPIRES_IN` | MFA challenge token lifetime (default `10m`) |
| `EMAIL_OTP_TTL_SECONDS` | Email MFA code TTL (default `600`) |

## Bootstrap mailer (optional)

Used only to **seed** `mailer_settings` on first boot. After that, edit credentials in `/console`.

| Variable | Purpose |
| --- | --- |
| `DEFAULT_TRANSPORTER_USER` | SMTP username |
| `DEFAULT_TRANSPORTER_PASS` | SMTP / Gmail app password |
| `DEFAULT_TRANSPORTER_HOST` | SMTP host (default `smtp.gmail.com`) |
| `DEFAULT_TRANSPORTER_PORT` | SMTP port (default `465`) |
| `DEFAULT_TRANSPORTER_DELIVER_TO` | Default inbox for contact notifications |
| `DEFAULT_BRAND_NAME` / `DEFAULT_BRAND_URL` | Branding defaults |

## Legacy

| Variable | Purpose |
| --- | --- |
| `API_KEY` | If set, imported once into MongoDB as an API key on first boot |

## Site (Next.js)

In `devcon1solutions-site/.env.local`:

```bash
NEXT_PUBLIC_API_KEY=<key-from-console>
```

Point the site at a local API by setting `USE_LOCAL_API = true` in `src/lib/server.ts` and ensuring `src/config.json` `dev` is `http://localhost:5050`.
