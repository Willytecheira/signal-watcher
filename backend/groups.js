const crypto = require("crypto");
const { fetchUsersFromSource: fetchExtUsers, stmts: extStmts } = (() => {
  try { return require("./external-users"); } catch { return {}; }
})();
const { db } = require("./db");

// ── Tables ──────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS client_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    endpoint_url TEXT,
    group_type TEXT NOT NULL DEFAULT 'clients',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Migration: add group_type column if missing
try {
  db.exec(`ALTER TABLE client_groups ADD COLUMN group_type TEXT NOT NULL DEFAULT 'clients'`);
} catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS group_signal_filters (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES client_groups(id) ON DELETE CASCADE,
    filter_type TEXT NOT NULL,
    filter_value TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// ── Multiple Metabase Connections ───────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS metabase_connections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    api_token TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

// Migrate old single config to new connections table
try {
  const oldConfig = db.prepare(`SELECT * FROM metabase_config WHERE id = 'default'`).get();
  if (oldConfig && oldConfig.base_url) {
    const exists = db.prepare(`SELECT COUNT(*) as c FROM metabase_connections`).get();
    if (exists.c === 0) {
      db.prepare(`INSERT INTO metabase_connections (id, name, base_url, api_token) VALUES (?, ?, ?, ?)`)
        .run('migrated-default', 'Metabase (migrado)', oldConfig.base_url, oldConfig.api_token || '');
    }
  }
} catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS metabase_queries (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES client_groups(id) ON DELETE CASCADE,
    connection_id TEXT REFERENCES metabase_connections(id),
    question_id INTEGER NOT NULL,
    label TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Migration: add connection_id column to metabase_queries if missing
try {
  db.exec(`ALTER TABLE metabase_queries ADD COLUMN connection_id TEXT REFERENCES metabase_connections(id)`);
} catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS notification_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id TEXT,
    group_name TEXT,
    signal_id TEXT,
    signal_symbol TEXT,
    client_id TEXT,
    client_name TEXT,
    status TEXT NOT NULL,
    http_status INTEGER,
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON notification_logs(created_at DESC)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_group_filters_group ON group_signal_filters(group_id)`);

// ── Group ↔ External User Sources ───────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS group_external_sources (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES client_groups(id) ON DELETE CASCADE,
    source_id TEXT NOT NULL REFERENCES external_user_sources(id) ON DELETE CASCADE,
    role_filter TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_group_ext_sources_group ON group_external_sources(group_id)`);

// ── Prepared statements ─────────────────────────────────────
const insertGroup = db.prepare(
  `INSERT INTO client_groups (id, name, description, endpoint_url, group_type, active) VALUES (?, ?, ?, ?, ?, ?)`
);
const updateGroup = db.prepare(
  `UPDATE client_groups SET name=?, description=?, endpoint_url=?, group_type=?, active=? WHERE id=?`
);
const deleteGroup = db.prepare(`DELETE FROM client_groups WHERE id = ?`);
const listGroups = db.prepare(`SELECT * FROM client_groups ORDER BY created_at DESC`);
const getGroupById = db.prepare(`SELECT * FROM client_groups WHERE id = ?`);

const insertFilter = db.prepare(
  `INSERT INTO group_signal_filters (id, group_id, filter_type, filter_value) VALUES (?, ?, ?, ?)`
);
const deleteFiltersByGroup = db.prepare(`DELETE FROM group_signal_filters WHERE group_id = ?`);
const getFiltersByGroup = db.prepare(`SELECT * FROM group_signal_filters WHERE group_id = ?`);

// Metabase connections
const insertConnection = db.prepare(
  `INSERT INTO metabase_connections (id, name, base_url, api_token) VALUES (?, ?, ?, ?)`
);
const updateConnection = db.prepare(
  `UPDATE metabase_connections SET name=?, base_url=?, api_token=?, updated_at=datetime('now') WHERE id=?`
);
const deleteConnection = db.prepare(`DELETE FROM metabase_connections WHERE id = ?`);
const listConnections = db.prepare(`SELECT id, name, base_url, created_at, updated_at FROM metabase_connections ORDER BY created_at DESC`);
const getConnectionById = db.prepare(`SELECT * FROM metabase_connections WHERE id = ?`);

const insertQuery = db.prepare(
  `INSERT INTO metabase_queries (id, group_id, connection_id, question_id, label) VALUES (?, ?, ?, ?, ?)`
);
const deleteQueriesByGroup = db.prepare(`DELETE FROM metabase_queries WHERE group_id = ?`);
const getQueriesByGroup = db.prepare(`SELECT * FROM metabase_queries WHERE group_id = ?`);

// External sources per group
const insertGroupExtSource = db.prepare(
  `INSERT INTO group_external_sources (id, group_id, source_id, role_filter) VALUES (?, ?, ?, ?)`
);
const deleteExtSourcesByGroup = db.prepare(`DELETE FROM group_external_sources WHERE group_id = ?`);
const getExtSourcesByGroup = db.prepare(`SELECT * FROM group_external_sources WHERE group_id = ?`);

const insertNotifLog = db.prepare(
  `INSERT INTO notification_logs (group_id, group_name, signal_id, signal_symbol, client_id, client_name, status, http_status, error_message)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
const selectNotifLogs = db.prepare(`SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT ? OFFSET ?`);
const countNotifLogs = db.prepare(`SELECT COUNT(*) as count FROM notification_logs`);

// ── CRUD Functions ──────────────────────────────────────────
function createGroup({ name, description, endpoint_url, group_type, filters }) {
  const id = crypto.randomUUID();
  insertGroup.run(id, name, description || null, endpoint_url || null, group_type || "clients", 1);
  if (filters && Array.isArray(filters)) {
    for (const f of filters) {
      insertFilter.run(crypto.randomUUID(), id, f.filter_type, f.filter_value);
    }
  }
  return { id, name, group_type: group_type || "clients" };
}

function editGroup(id, { name, description, endpoint_url, group_type, active, filters }) {
  updateGroup.run(name, description || null, endpoint_url || null, group_type || "clients", active ? 1 : 0, id);
  if (filters !== undefined) {
    deleteFiltersByGroup.run(id);
    if (Array.isArray(filters)) {
      for (const f of filters) {
        insertFilter.run(crypto.randomUUID(), id, f.filter_type, f.filter_value);
      }
    }
  }
}

function removeGroup(id) {
  deleteFiltersByGroup.run(id);
  deleteQueriesByGroup.run(id);
  return deleteGroup.run(id).changes > 0;
}

function getAllGroups() {
  const groups = listGroups.all().map(g => ({ ...g, active: !!g.active }));
  for (const g of groups) {
    g.filters = getFiltersByGroup.all(g.id);
    g.metabase_queries = getQueriesByGroup.all(g.id);
  }
  return groups;
}

function getGroup(id) {
  const g = getGroupById.get(id);
  if (!g) return null;
  g.active = !!g.active;
  g.filters = getFiltersByGroup.all(id);
  g.metabase_queries = getQueriesByGroup.all(id);
  return g;
}

// ── Metabase Connections CRUD ───────────────────────────────
function createConnection({ name, base_url, api_token }) {
  const id = crypto.randomUUID();
  insertConnection.run(id, name, base_url, api_token);
  return { id, name, base_url };
}

function editConnection(id, { name, base_url, api_token }) {
  updateConnection.run(name, base_url, api_token, id);
}

function removeConnection(id) {
  // Nullify references in queries
  db.prepare(`UPDATE metabase_queries SET connection_id = NULL WHERE connection_id = ?`).run(id);
  return deleteConnection.run(id).changes > 0;
}

function getAllConnections() {
  return listConnections.all();
}

function getConnection(id) {
  return getConnectionById.get(id) || null;
}

function saveGroupQueries(groupId, queries) {
  deleteQueriesByGroup.run(groupId);
  for (const q of queries) {
    insertQuery.run(crypto.randomUUID(), groupId, q.connection_id || null, q.question_id, q.label || null);
  }
}

// ── Metabase API helper ─────────────────────────────────────
async function queryMetabaseWithConnection(connectionId, questionId) {
  const conn = getConnectionById.get(connectionId);
  if (!conn || !conn.base_url || !conn.api_token) return null;

  const url = `${conn.base_url.replace(/\/$/, "")}/api/card/${questionId}/query/json`;
  try {
    const resp = await fetch(url, {
      headers: { "X-Metabase-Session": conn.api_token },
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

// Fallback: try first available connection
async function queryMetabaseFallback(questionId) {
  const conns = listConnections.all();
  if (conns.length === 0) return null;
  const conn = getConnectionById.get(conns[0].id);
  if (!conn) return null;
  return queryMetabaseWithConnection(conn.id, questionId);
}

// ── Notification dispatch ───────────────────────────────────
function matchesGroupFilters(group, signal) {
  if (!group.filters || group.filters.length === 0) return true;
  for (const f of group.filters) {
    const type = f.filter_type;
    const val = f.filter_value.toUpperCase();
    if (type === "symbol" && signal.symbol?.toUpperCase() !== val) return false;
    if (type === "action" && signal.action?.toUpperCase() !== val) return false;
    if (type === "event_type" && signal.eventType?.toUpperCase() !== val) return false;
    if (type === "event_name" && signal.eventName?.toUpperCase() !== val) return false;
  }
  return true;
}

async function dispatchNotifications(signal) {
  const groups = listGroups.all().filter(g => g.active);
  for (const group of groups) {
    group.filters = getFiltersByGroup.all(group.id);
    if (!matchesGroupFilters(group, signal)) continue;
    if (!group.endpoint_url) continue;

    let clients = [];
    if (group.group_type === "broadcast") {
      clients = [{ id: null, name: "broadcast" }];
    } else {
      const queries = getQueriesByGroup.all(group.id);
      for (const q of queries) {
        let rows;
        if (q.connection_id) {
          rows = await queryMetabaseWithConnection(q.connection_id, q.question_id);
        } else {
          rows = await queryMetabaseFallback(q.question_id);
        }
        if (rows && Array.isArray(rows)) {
          clients.push(...rows);
        }
      }
      if (clients.length === 0) {
        clients = [{ id: null, name: "no_clients" }];
      }
    }

    for (const client of clients) {
      const payload = {
        signal: {
          id: signal.id, symbol: signal.symbol, action: signal.action,
          confidence: signal.confidence, eventName: signal.eventName,
          eventType: signal.eventType, title: signal.title,
          description: signal.description, timestamp: signal.timestamp,
        },
        client: {
          id: client.id || client.client_id || null,
          name: client.name || client.client_name || null,
          email: client.email || client.client_email || null,
        },
        group: { id: group.id, name: group.name },
        sent_at: new Date().toISOString(),
      };

      try {
        const resp = await fetch(group.endpoint_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        insertNotifLog.run(group.id, group.name, signal.id, signal.symbol, payload.client.id, payload.client.name,
          resp.ok ? "success" : "error", resp.status, resp.ok ? null : `HTTP ${resp.status}`);
      } catch (err) {
        insertNotifLog.run(group.id, group.name, signal.id, signal.symbol, payload.client.id, payload.client.name,
          "error", null, err.message);
      }
    }
  }
}

// ── Notification logs ───────────────────────────────────────
function getNotificationLogs(limit = 50, offset = 0) {
  return selectNotifLogs.all(limit, offset);
}
function getNotificationLogCount() {
  return countNotifLogs.get().count;
}

// ── Route handler ───────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => { try { resolve(JSON.parse(body)); } catch { resolve(null); } });
  });
}

async function handleGroupRoutes(req, res, json, requireAdmin) {
  const url = req.url;
  const method = req.method;

  // ── Metabase Connections CRUD ──
  if (url === "/api/admin/metabase/connections" && method === "GET") {
    if (!requireAdmin(req)) return json(res, 403, { error: "Forbidden" });
    return json(res, 200, getAllConnections());
  }
  if (url === "/api/admin/metabase/connections" && method === "POST") {
    if (!requireAdmin(req)) return json(res, 403, { error: "Forbidden" });
    const body = await readBody(req);
    if (!body || !body.name || !body.base_url) return json(res, 400, { error: "Missing name or base_url" });
    const conn = createConnection(body);
    return json(res, 201, conn);
  }
  if (url.match(/^\/api\/admin\/metabase\/connections\/[^/]+$/) && method === "PUT") {
    if (!requireAdmin(req)) return json(res, 403, { error: "Forbidden" });
    const id = url.split("/api/admin/metabase/connections/")[1];
    const body = await readBody(req);
    if (!body) return json(res, 400, { error: "Invalid body" });
    editConnection(id, body);
    return json(res, 200, { ok: true });
  }
  if (url.match(/^\/api\/admin\/metabase\/connections\/[^/]+$/) && method === "DELETE") {
    if (!requireAdmin(req)) return json(res, 403, { error: "Forbidden" });
    const id = url.split("/api/admin/metabase/connections/")[1];
    const deleted = removeConnection(id);
    return json(res, 200, { deleted });
  }
  if (url.match(/^\/api\/admin\/metabase\/connections\/[^/]+\/test$/) && method === "POST") {
    if (!requireAdmin(req)) return json(res, 403, { error: "Forbidden" });
    const id = url.split("/api/admin/metabase/connections/")[1].replace("/test", "");
    const body = await readBody(req);
    if (!body || !body.question_id) return json(res, 400, { error: "Missing question_id" });
    const data = await queryMetabaseWithConnection(id, body.question_id);
    if (!data) return json(res, 500, { error: "Failed to query Metabase" });
    return json(res, 200, { rows: data.length, sample: data.slice(0, 5) });
  }

  // Keep old metabase config endpoint for backwards compat (redirect to connections)
  if (url === "/api/admin/metabase" && method === "GET") {
    if (!requireAdmin(req)) return json(res, 403, { error: "Forbidden" });
    const conns = getAllConnections();
    return json(res, 200, conns.length > 0 ? { base_url: conns[0].base_url, api_token: "***" } : { base_url: null, api_token: null });
  }

  // ── Notification logs ──
  if (url.startsWith("/api/admin/notifications/logs") && method === "GET") {
    if (!requireAdmin(req)) return json(res, 403, { error: "Forbidden" });
    const params = new URL(url, "http://localhost").searchParams;
    const page = Math.max(1, parseInt(params.get("page") || "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(params.get("limit") || "50", 10)));
    const offset = (page - 1) * limit;
    const data = getNotificationLogs(limit, offset);
    const total = getNotificationLogCount();
    return json(res, 200, { data, total, page, limit, totalPages: Math.ceil(total / limit) });
  }

  // ── Notification payload example ──
  if (url === "/api/admin/notifications/example-payload" && method === "GET") {
    if (!requireAdmin(req)) return json(res, 403, { error: "Forbidden" });
    return json(res, 200, {
      signal: { id: "abc-123", symbol: "AAPL", action: "BUY", confidence: 85, eventName: "earnings_surprise", eventType: "fundamental", title: "Apple supera expectativas", description: "Apple reportó ganancias...", timestamp: "2025-01-15T10:30:00Z" },
      client: { id: "client-456", name: "Juan Pérez", email: "juan@example.com" },
      group: { id: "group-789", name: "Premium Traders" },
      sent_at: "2025-01-15T10:30:05Z",
    });
  }

  // ── Groups CRUD ──
  if (!url.startsWith("/api/admin/groups")) return false;
  if (!requireAdmin(req)) return json(res, 403, { error: "Forbidden" });

  if (url === "/api/admin/groups" && method === "GET") {
    return json(res, 200, getAllGroups());
  }

  if (url.match(/^\/api\/admin\/groups\/[^/]+$/) && method === "GET") {
    const id = url.split("/api/admin/groups/")[1];
    const group = getGroup(id);
    if (!group) return json(res, 404, { error: "Group not found" });
    return json(res, 200, group);
  }

  if (url === "/api/admin/groups" && method === "POST") {
    const body = await readBody(req);
    if (!body || !body.name) return json(res, 400, { error: "Missing name" });
    const g = createGroup(body);
    return json(res, 201, g);
  }

  if (url.match(/^\/api\/admin\/groups\/[^/]+$/) && method === "PUT") {
    const id = url.split("/api/admin/groups/")[1];
    const body = await readBody(req);
    if (!body) return json(res, 400, { error: "Invalid body" });
    editGroup(id, body);
    return json(res, 200, { ok: true });
  }

  if (url.match(/^\/api\/admin\/groups\/[^/]+\/queries$/) && method === "PUT") {
    const id = url.split("/api/admin/groups/")[1].replace("/queries", "");
    const body = await readBody(req);
    if (!body || !Array.isArray(body.queries)) return json(res, 400, { error: "Invalid body" });
    saveGroupQueries(id, body.queries);
    return json(res, 200, { ok: true });
  }

  if (url.match(/^\/api\/admin\/groups\/[^/]+$/) && method === "DELETE") {
    const id = url.split("/api/admin/groups/")[1];
    const deleted = removeGroup(id);
    return json(res, 200, { deleted });
  }

  return json(res, 404, { error: "Not found" });
}

module.exports = { handleGroupRoutes, dispatchNotifications };
