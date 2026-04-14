---
name: Client groups & notifications
description: SQLite client groups with group_type (clients/broadcast), signal filters, Metabase integration, notification dispatch
type: feature
---
- Tables: `client_groups`, `group_signal_filters`, `metabase_config`, `metabase_queries`, `notification_logs`
- Groups have name, description, endpoint_url, group_type (clients|broadcast), active flag
- `broadcast` groups skip Metabase queries and POST signal to endpoint for all users
- `clients` groups fetch client lists from Metabase queries, POST per-client to endpoint
- Each group has signal filters (symbol, action, event_type, event_name)
- On each signal, `dispatchNotifications()` matches groups by filters, then dispatches
- Notification payload: `{ signal, client: {id, name, email}, group: {id, name}, sent_at }`
- Admin APIs: CRUD `/api/admin/groups`, `/api/admin/groups/:id/queries`, `/api/admin/metabase`, `/api/admin/notifications/logs`
- Frontend: `/groups` page, `/settings/metabase` page
