# Contact mailer API

Generic contact-form endpoint. Any site with a **registered API key** can relay submissions through this service. Mail is sent with the active provider (SMTP/Nodemailer or Resend) and HTML templates stored in Firestore.

## Endpoints

| Method | Path | Auth |
| --- | --- | --- |
| `POST` | `/v1/contact` | API key |
| `POST` | `/v1/contact/form` | API key |
| `POST` | `/devcon/contact/form` | API key (legacy path used by the public site) |

## Authenticating

Send the key in **one** of:

1. Header: `X-API-Key: dc1_...`
2. Header: `Authorization: Bearer dc1_...`
3. JSON body: `{ "key": "dc1_..." }` or `{ "apiKey": "dc1_..." }`

Keys are created in the [admin console](./CONSOLE.md). Only the SHA-256 hash is stored; the raw secret is shown once at creation.

## Request body

All fields are optional, but at least one of `name`, `email`, `phone`, `comment`/`message`, or `fields` is required.

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "phone": "+1 555 0100",
  "comment": "I'd like a quote.",
  "message": "alias of comment",
  "subject": "Optional custom subject",
  "fields": {
    "Company": "Analytical Engines Ltd",
    "Budget": "50k"
  },
  "replyTo": "ada@example.com",
  "to": "overrides-inbox@yourdomain.com",
  "sendNotification": true,
  "sendConfirmation": true,
  "templateId": "<mongo ObjectId>",
  "confirmationTemplateId": "<mongo ObjectId>",
  "brand": {
    "name": "My Product",
    "url": "https://myproduct.example"
  },
  "meta": { "source": "marketing-site", "page": "/pricing" }
}
```

### Per-key defaults

Each API key can set:

- `deliverTo`, `brandName`, `brandUrl`
- `sendNotification` / `sendConfirmation`
- default notification / confirmation template IDs
- `allowOverrides` — when `false`, request-level `to`, `brand`, and template IDs are ignored

### Behavior

1. Validate API key (must be active).
2. Resolve deliver-to and brand (request → key → global mailer settings).
3. Render notification + confirmation HTML/text from templates (`{{PLACEHOLDERS}}`).
4. Send notification to the inbox (unless `sendNotification: false`).
5. Best-effort confirmation to the visitor email (unless disabled / no email).

## Template placeholders

| Token | Meaning |
| --- | --- |
| `{{NAME}}` / `{{NAME_DISPLAY}}` / `{{NAME_CELL}}` | Visitor name |
| `{{EMAIL}}` / `{{EMAIL_CELL}}` | Visitor email |
| `{{PHONE}}` / `{{PHONE_CELL}}` | Phone |
| `{{MESSAGE}}` / `{{COMMENT}}` | Message body (HTML-escaped; multiline → `<br />` in HTML cells) |
| `{{SUBJECT}}` | Subject line |
| `{{BRAND_NAME}}` / `{{BRAND_URL}}` | Branding |
| `{{SUBMITTED_AT}}` | UTC timestamp |
| `{{YEAR}}` | Current year |
| `{{REPLY_BUTTON}}` | Optional HTML reply CTA (when email present) |
| `{{EXTRA_FIELDS_HTML}}` / `{{EXTRA_FIELDS_TEXT}}` | Custom `fields` map |
| `{{PREHEADER}}` | Email preheader |
| `{{META_JSON}}` | Escaped JSON of `meta` |

## Example (curl)

```bash
curl -X POST https://devcon1solutions-api.web.app/v1/contact \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dc1_your_key_here" \
  -d '{
    "name": "Jordan",
    "email": "jordan@client.com",
    "comment": "Hello from our marketing site",
    "brand": { "name": "Client Co", "url": "https://client.com" }
  }'
```

## Responses

| Status | Meaning |
| --- | --- |
| `200` | Sent (`{ ok: true, response: "..." }`) |
| `400` | Empty / invalid payload |
| `401` | Missing or invalid API key |
| `500` | Mailer failure on the primary notification |

## Health

`GET /health` → `{ ok: true, service: "devcon1solutions-api" }`
