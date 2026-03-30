---
name: Webhook system
description: SQLite-based webhook dispatch with optional filters (symbol, action, event_type), HMAC signing, admin CRUD, dispatch logs
type: feature
---
- Table: `webhooks` in SQLite (id, name, url, secret, filter_symbol, filter_action, filter_event_type, active)
- Table: `webhook_logs` in SQLite (id, webhook_id, webhook_name, signal_id, signal_symbol, status, http_status, error_message, created_at)
- On each Kafka signal, `dispatchSignal()` sends POST to all matching active webhooks and logs result
- HMAC-SHA256 signature in `X-Webhook-Signature` header if secret is set
- Admin CRUD: GET/POST/PUT/DELETE `/api/admin/webhooks`
- Logs API: GET `/api/admin/webhooks/logs?page=&limit=`
- Frontend: `WebhookPanel` with tabs (Configuración / Logs), `WebhookLogs` component
