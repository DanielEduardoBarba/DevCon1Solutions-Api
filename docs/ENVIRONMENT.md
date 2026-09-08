# Environment variables

Copy `functions/.env.example` → `functions/.env`.

## Firebase / Firestore

Uses the **same project as site hosting**: `devcon1solutions`.

| Variable | Purpose |
| --- | --- |
| `FIREBASE_PROJECT_ID` | Firestore project (default `devcon1solutions`) |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to service account JSON (default `secrets/service-account.json`) |

### Service account setup

1. Firebase Console → **devcon1solutions** → Project settings → Service accounts  
2. Generate new private key  
3. Save as `functions/secrets/service-account.json` (gitignored)

On Cloud Functions in that same project, Application Default Credentials work and the JSON file is optional.

## Required secrets

| Variable | Purpose |
| --- | --- |
| `ENCRYPTION_KEY` | Encrypts SMTP/Resend secrets at rest |
| `JWT_SECRET` | Signs console admin session tokens |

## HTTP

| Variable | Purpose |
| --- | --- |
| `PORT` | Local server port (default `5050`) |
| `CORS_ORIGINS` | Comma-separated origins, or `*` |

## Auth / MFA

| Variable | Purpose |
| --- | --- |
| `JWT_EXPIRES_IN` | Session lifetime (default `8h`) |
| `MFA_PENDING_EXPIRES_IN` | MFA pending token lifetime |
| `EMAIL_OTP_TTL_SECONDS` | Email MFA code TTL |

## Bootstrap mailer (optional)

Seeded into Firestore `mailer_settings/default` on first boot. Manage later via `/console`.

## Legacy

| Variable | Purpose |
| --- | --- |
| `API_KEY` | Imported once into Firestore `api_keys` on first boot |
