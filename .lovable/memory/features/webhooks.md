---
name: Webhook system
description: SQLite-based webhook dispatch with optional filters (symbol, action, event_type), HMAC signing, admin CRUD
type: feature
---
- Table: `webhooks` in SQLite (id, name, url, secret, filter_symbol, filter_action, filter_event_type, active)
- On each Kafka signal, `dispatchSignal()` sends POST to all matching active webhooks
- HMAC-SHA256 signature in `X-Webhook-Signature` header if secret is set
- Admin CRUD: GET/POST/PUT/DELETE `/api/admin/webhooks`
- Frontend: `WebhookPanel` component, accessible via Webhook icon in header (admin only)
