/**
 * Proxy to fetch users from external Supabase manage-users Edge Function.
 * Includes configurable connection settings stored in SQLite.
 */

const crypto = require("crypto");
const { db } = require("./db");

// ── Table ───────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS external_user_sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    function_url TEXT NOT NULL,
    anon_key TEXT NOT NULL,
    auth_token TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// ── Cached external users table ─────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS cached_external_users (
    id TEXT NOT NULL,
    source_id TEXT NOT NULL REFERENCES external_user_sources(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT,
    raw_json TEXT,
    cached_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (id, source_id)
  )
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_cached_ext_users_source ON cached_external_users(source_id)`);

// ── Defaults ────────────────────────────────────────────────
const DEFAULT_URL =
  process.env.SUPABASE_MANAGE_USERS_URL ||
  "https://tnjcigqqmwahnxcsljgk.supabase.co/functions/v1/manage-users";

const DEFAULT_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuamNpZ3FxbXdhaG54Y3NsamdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDk2NjQsImV4cCI6MjA4NjkyNTY2NH0.Q7R51xWL23UZegJyaZVUJibNQ1FeMcYHMtmoY1rNBIk";

// Seed default if empty
const count = db.prepare("SELECT COUNT(*) as c FROM external_user_sources").get().c;
if (count === 0) {
  db.prepare(
    "INSERT INTO external_user_sources (id, name, function_url, anon_key) VALUES (?, ?, ?, ?)"
  ).run(crypto.randomUUID(), "Supabase (default)", DEFAULT_URL, DEFAULT_ANON_KEY);
}

// ── Stmts ───────────────────────────────────────────────────
const stmts = {
  list: db.prepare("SELECT * FROM external_user_sources ORDER BY created_at DESC"),
  get: db.prepare("SELECT * FROM external_user_sources WHERE id = ?"),
  insert: db.prepare(
    "INSERT INTO external_user_sources (id, name, function_url, anon_key, auth_token) VALUES (?, ?, ?, ?, ?)"
  ),
  update: db.prepare(
    "UPDATE external_user_sources SET name=?, function_url=?, anon_key=?, auth_token=? WHERE id=?"
  ),
  del: db.prepare("DELETE FROM external_user_sources WHERE id = ?"),
};

// ── Cache stmts ─────────────────────────────────────────────
const cacheStmts = {
  upsert: db.prepare(
    `INSERT OR REPLACE INTO cached_external_users (id, source_id, email, full_name, role, raw_json, cached_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
  ),
  deleteBySource: db.prepare("DELETE FROM cached_external_users WHERE source_id = ?"),
  getBySource: db.prepare("SELECT * FROM cached_external_users WHERE source_id = ? ORDER BY full_name"),
  getAll: db.prepare("SELECT * FROM cached_external_users ORDER BY full_name"),
};

function cacheUsersForSource(sourceId, users) {
  cacheStmts.deleteBySource.run(sourceId);
  for (const u of users) {
    cacheStmts.upsert.run(
      u.id || crypto.randomUUID(),
      sourceId,
      u.email || null,
      u.full_name || null,
      u.role || null,
      JSON.stringify(u)
    );
  }
}

function getCachedUsers(sourceId) {
  const rows = sourceId ? cacheStmts.getBySource.all(sourceId) : cacheStmts.getAll.all();
  return rows.map(r => ({
    id: r.id,
    email: r.email,
    full_name: r.full_name,
    role: r.role,
    _source_id: r.source_id,
    _cached_at: r.cached_at,
    ...(r.raw_json ? JSON.parse(r.raw_json) : {}),
  }));
}

// ── Fetch users from a source ───────────────────────────────
async function fetchUsersFromSource(source, bearerToken) {
  const response = await fetch(source.function_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: source.auth_token ? `Bearer ${source.auth_token}` : (bearerToken || ""),
      apikey: source.anon_key,
    },
    body: JSON.stringify({ action: "list-emails" }),
  });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Failed to fetch users");
  }
  return data.users || [];
}

// ── Body parser helper ──────────────────────────────────────
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try { resolve(JSON.parse(body)); } catch { reject(new Error("Invalid JSON")); }
    });
  });
}

// ── Routes ──────────────────────────────────────────────────
async function handleExternalUsersRoutes(req, res, json, requireAdmin) {
  const url = req.url.split("?")[0];

  // GET /api/admin/external-users — fetch users from all active sources
  if (url === "/api/admin/external-users" && req.method === "GET") {
    if (!requireAdmin(req)) return json(res, 403, { error: "Admin only" });
    try {
      const sources = stmts.list.all().filter((s) => s.active);
      const allUsers = [];
      for (const src of sources) {
        try {
          const users = await fetchUsersFromSource(src, req.headers.authorization);
          users.forEach((u) => { u._source = src.name; u._source_id = src.id; });
          allUsers.push(...users);
        } catch (err) {
          console.error(`Source ${src.name} error:`, err.message);
        }
      }
      return json(res, 200, { users: allUsers });
    } catch (err) {
      return json(res, 502, { error: err.message });
    }
  }

  // GET /api/admin/external-users/sources — list sources
  if (url === "/api/admin/external-users/sources" && req.method === "GET") {
    if (!requireAdmin(req)) return json(res, 403, { error: "Admin only" });
    const sources = stmts.list.all().map((s) => ({ ...s, anon_key: s.anon_key ? "***" + s.anon_key.slice(-8) : "", auth_token: s.auth_token ? "***" + s.auth_token.slice(-8) : "" }));
    return json(res, 200, { sources });
  }

  // POST /api/admin/external-users/sources — create source
  if (url === "/api/admin/external-users/sources" && req.method === "POST") {
    if (!requireAdmin(req)) return json(res, 403, { error: "Admin only" });
    try {
      const body = await parseBody(req);
      const id = crypto.randomUUID();
      stmts.insert.run(id, body.name || "New source", body.function_url, body.anon_key, body.auth_token || null);
      return json(res, 201, { ok: true, id });
    } catch (err) {
      return json(res, 400, { error: err.message });
    }
  }

  // PUT /api/admin/external-users/sources/:id — update source
  const putMatch = url.match(/^\/api\/admin\/external-users\/sources\/(.+)$/);
  if (putMatch && req.method === "PUT") {
    if (!requireAdmin(req)) return json(res, 403, { error: "Admin only" });
    try {
      const body = await parseBody(req);
      const existing = stmts.get.get(putMatch[1]);
      if (!existing) return json(res, 404, { error: "Not found" });
      stmts.update.run(
        body.name ?? existing.name,
        body.function_url ?? existing.function_url,
        body.anon_key ?? existing.anon_key,
        body.auth_token ?? existing.auth_token,
        putMatch[1]
      );
      return json(res, 200, { ok: true });
    } catch (err) {
      return json(res, 400, { error: err.message });
    }
  }

  // DELETE /api/admin/external-users/sources/:id
  const delMatch = url.match(/^\/api\/admin\/external-users\/sources\/(.+)$/);
  if (delMatch && req.method === "DELETE") {
    if (!requireAdmin(req)) return json(res, 403, { error: "Admin only" });
    stmts.del.run(delMatch[1]);
    return json(res, 200, { ok: true });
  }

  // POST /api/admin/external-users/sources/:id/test — test a source
  const testMatch = url.match(/^\/api\/admin\/external-users\/sources\/(.+)\/test$/);
  if (testMatch && req.method === "POST") {
    if (!requireAdmin(req)) return json(res, 403, { error: "Admin only" });
    const source = stmts.get.get(testMatch[1]);
    if (!source) return json(res, 404, { error: "Not found" });
    try {
      const users = await fetchUsersFromSource(source, req.headers.authorization);
      return json(res, 200, { ok: true, count: users.length });
    } catch (err) {
      return json(res, 200, { ok: false, error: err.message });
    }
  }

  return false;
}

module.exports = { handleExternalUsersRoutes, fetchUsersFromSource, stmts };
