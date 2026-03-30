const crypto = require("crypto");
const { db } = require("./db");

// ── Webhooks table ──────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS webhooks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT,
    filter_symbol TEXT,
    filter_action TEXT,
    filter_event_type TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

const insertWebhook = db.prepare(
  `INSERT INTO webhooks (id, name, url, secret, filter_symbol, filter_action, filter_event_type, active)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);
const updateWebhook = db.prepare(
  `UPDATE webhooks SET name=?, url=?, secret=?, filter_symbol=?, filter_action=?, filter_event_type=?, active=? WHERE id=?`
);
const deleteWebhook = db.prepare(`DELETE FROM webhooks WHERE id = ?`);
const listWebhooks = db.prepare(`SELECT * FROM webhooks ORDER BY created_at DESC`);
const activeWebhooks = db.prepare(`SELECT * FROM webhooks WHERE active = 1`);

function createWebhook({ name, url, secret, filter_symbol, filter_action, filter_event_type }) {
  const id = crypto.randomUUID();
  insertWebhook.run(id, name, url, secret || null, filter_symbol || null, filter_action || null, filter_event_type || null, 1);
  return { id, name, url };
}

function editWebhook(id, { name, url, secret, filter_symbol, filter_action, filter_event_type, active }) {
  updateWebhook.run(name, url, secret || null, filter_symbol || null, filter_action || null, filter_event_type || null, active ? 1 : 0, id);
}

function removeWebhook(id) {
  return deleteWebhook.run(id).changes > 0;
}

function getAllWebhooks() {
  return listWebhooks.all().map(w => ({ ...w, active: !!w.active }));
}

// ── Dispatch signal to matching webhooks ────────────────────
function matchesFilter(webhook, signal) {
  if (webhook.filter_symbol && webhook.filter_symbol.toUpperCase() !== signal.symbol?.toUpperCase()) return false;
  if (webhook.filter_action && webhook.filter_action.toUpperCase() !== signal.action?.toUpperCase()) return false;
  if (webhook.filter_event_type && webhook.filter_event_type.toUpperCase() !== signal.eventType?.toUpperCase()) return false;
  return true;
}

async function dispatchSignal(signal) {
  const hooks = activeWebhooks.all();
  for (const hook of hooks) {
    if (!matchesFilter(hook, signal)) continue;
    try {
      const body = JSON.stringify(signal);
      const headers = { "Content-Type": "application/json" };
      if (hook.secret) {
        const sig = crypto.createHmac("sha256", hook.secret).update(body).digest("hex");
        headers["X-Webhook-Signature"] = sig;
      }
      fetch(hook.url, { method: "POST", headers, body }).catch(() => {});
    } catch {}
  }
}

// ── Route handler ───────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => { try { resolve(JSON.parse(body)); } catch { resolve(null); } });
  });
}

async function handleWebhookRoutes(req, res, json, requireAdmin) {
  const url = req.url;
  const method = req.method;

  if (!url.startsWith("/api/admin/webhooks")) return false;

  if (!requireAdmin(req)) return json(res, 403, { error: "Forbidden" });

  // GET /api/admin/webhooks
  if (url === "/api/admin/webhooks" && method === "GET") {
    return json(res, 200, getAllWebhooks());
  }

  // POST /api/admin/webhooks
  if (url === "/api/admin/webhooks" && method === "POST") {
    const body = await readBody(req);
    if (!body || !body.name || !body.url) return json(res, 400, { error: "Missing name/url" });
    const wh = createWebhook(body);
    return json(res, 201, wh);
  }

  // PUT /api/admin/webhooks/:id
  if (url.match(/^\/api\/admin\/webhooks\/[^/]+$/) && method === "PUT") {
    const id = url.split("/api/admin/webhooks/")[1];
    const body = await readBody(req);
    if (!body) return json(res, 400, { error: "Invalid body" });
    editWebhook(id, body);
    return json(res, 200, { ok: true });
  }

  // DELETE /api/admin/webhooks/:id
  if (url.match(/^\/api\/admin\/webhooks\/[^/]+$/) && method === "DELETE") {
    const id = url.split("/api/admin/webhooks/")[1];
    const deleted = removeWebhook(id);
    return json(res, 200, { deleted });
  }

  return json(res, 404, { error: "Not found" });
}

module.exports = { handleWebhookRoutes, dispatchSignal };
