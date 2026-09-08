# Devcon1 Solutions API

TypeScript Express API (Firebase Cloud Functions) with Firestore-backed API keys, mailer settings, HTML templates, and a single-admin console.

## Quick start

```bash
cd functions
cp .env.example .env   # fill Firebase service account path + secrets
npm install
npm run build
npm run server         # http://localhost:5050
```

Requires Firestore in Firebase project `devcon1solutions` and a service account at `functions/secrets/service-account.json` for local runs.

Deploy:

```bash
npm run deploy   # from repo root or functions/ (runs tsc predeploy)
```

## Documentation

- [Contact mailer API](./docs/CONTACT_API.md) — how external sites use the route
- [Admin console](./docs/CONSOLE.md) — setup, MFA, keys, mailer, templates
- [Environment variables](./docs/ENVIRONMENT.md)

## Layout

```
functions/
  src/           TypeScript source
  lib/           Compiled output (deployed)
  templates/     Default HTML email templates (copied into lib on build)
```
