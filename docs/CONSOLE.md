# Admin console

There is **one** console admin for the site + API. Manage it at:

`https://devcon1solutions.com/console/`  
(local: `http://localhost:3000/console/`)

The console is a static Next.js page that talks to the API under `/admin/*`.

## First-time setup

If no admin exists in MongoDB:

1. Open `/console`
2. Enter admin **email** + **password** (min 10 characters)
3. You are signed in immediately

After setup, `/console` always asks for the **admin password** (and MFA if enabled).

## Login + MFA

1. Enter password
2. If MFA is enabled:
   - **TOTP** — code from an authenticator app
   - **Email** — 6-digit code sent to the admin email on file (resend available)
3. Session JWT is stored in `sessionStorage` (`devcon1_console_token`) and sent as `Authorization: Bearer …`

## Console tabs

### API keys

- Create / disable / delete keys for external apps
- Secret shown **once** at creation — store it in the client site’s env (`NEXT_PUBLIC_API_KEY` for this site)

### Mailer

- Select active provider: **SMTP (Nodemailer)** or **Resend**
- Store / rotate SMTP user + app password, or Resend API key + from address
- Secrets are encrypted with `ENCRYPTION_KEY` before MongoDB storage
- Set default deliver-to inbox and brand name/URL
- Send a test email

### Templates

- Edit system default notification + confirmation HTML
- Create custom templates and bind them to API keys (via key settings / request `templateId`)

### Security

- Change password
- Enable TOTP (QR + confirm) or email MFA
- Disable MFA (requires password)

## Admin HTTP API (summary)

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/admin/auth/status` | `{ setupRequired }` |
| `POST` | `/admin/auth/setup` | Create the single admin |
| `POST` | `/admin/auth/login` | Password → session or MFA pending |
| `POST` | `/admin/auth/mfa/verify` | Complete MFA |
| `POST` | `/admin/auth/mfa/email/resend` | Resend email OTP |
| `GET` | `/admin/auth/me` | Session required |
| `POST` | `/admin/auth/password` | Change password |
| `POST` | `/admin/auth/mfa/totp/setup` | Begin TOTP |
| `POST` | `/admin/auth/mfa/totp/enable` | Confirm TOTP |
| `POST` | `/admin/auth/mfa/email/enable` | Enable email MFA |
| `POST` | `/admin/auth/mfa/disable` | Disable MFA |
| `GET/POST/PATCH/DELETE` | `/admin/keys` | API key CRUD |
| `GET/PUT` | `/admin/mailer` | Mailer settings |
| `POST` | `/admin/mailer/test` | Test send |
| `GET/POST/PUT/DELETE` | `/admin/templates` | Template CRUD |

## MongoDB collections

| Collection | Contents |
| --- | --- |
| `admin` | Single admin user |
| `api_keys` | Hashed keys + per-key contact options |
| `mailer_settings` | Active provider + encrypted credentials |
| `email_templates` | Subject/HTML/text templates |
| `mfa_challenges` | Short-lived email OTP hashes |

## Security notes

- Prefer strong `ENCRYPTION_KEY` and `JWT_SECRET` in production
- Do not commit `.env`
- Console is `noindex` and disallowed in `robots.txt`
- API keys are hashed; rotate by creating a new key and deleting the old one
