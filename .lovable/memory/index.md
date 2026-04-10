# Project Memory

## Core
Dark trading dashboard. Primary cyan (173 80% 50%), bg dark blue-gray (220 20% 7%).
Inter + JetBrains Mono. BUY=green, SELL=red. No mocks — real Kafka backend.
Backend in backend/ folder — Node.js + kafkajs, deployed separately via Docker.
Frontend fetches from VITE_API_URL env var.

## Memories
- [Kafka config](mem://features/kafka) — broker, topic, group id, signal format
- [Auth system](mem://features/auth) — SQLite JWT auth, admin user mgmt, protected routes
- [Webhook system](mem://features/webhooks) — SQLite webhooks with filters, HMAC, dispatch logs
- [Normalization](mem://features/normalization) — Rules for normalizing Kafka messages
- [Client groups](mem://features/groups) — Groups with signal filters, Metabase queries, notification dispatch to endpoints
