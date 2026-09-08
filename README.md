# Devcon1 Solutions API

TypeScript Express API (Firebase Cloud Functions) with MongoDB-backed API keys, mailer settings, HTML templates, and a single-admin console.

## Quick start

```bash
cd functions
cp .env.example .env   # fill MongoDB + secrets
npm install
npm run build
npm run server         # http://localhost:5050
```

Requires a running MongoDB (`MONGODB_URI`).

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
