---
name: Client groups & notifications
description: SQLite client groups with signal filters, Metabase integration for client queries, notification dispatch to group endpoints
type: feature
---
- Tables: `client_groups`, `group_signal_filters`, `metabase_config`, `metabase_queries`, `notification_logs`
- Groups have name, description, endpoint_url, active flag
- Each group has signal filters (symbol, action, event_type, event_name)
- Each group can have Metabase queries (question_id) to fetch client lists
- On each signal, `dispatchNotifications()` matches groups by filters, queries Metabase for clients, POSTs to endpoint
- Notification payload: `{ signal, client: {id, name, email}, group: {id, name}, sent_at }`
- Admin APIs: CRUD `/api/admin/groups`, `/api/admin/groups/:id/queries`, `/api/admin/metabase`, `/api/admin/notifications/logs`
- Frontend: `/groups` page, `/settings/metabase` page
- Metabase config (base_url, api_token) can be set up later when tables are created in Metabase
