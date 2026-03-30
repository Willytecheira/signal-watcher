const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db } = require("./db");

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production-" + crypto.randomBytes(16).toString("hex");
const JWT_EXPIRES = "24h";

// ── Users table ─────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Seed admin user
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const adminExists = db.prepare("SELECT 1 FROM users WHERE username = 'admin'").get();
if (!adminExists) {
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  db.prepare("INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)").run(
    crypto.randomUUID(), "admin", hash, "admin"
  );
  console.log("✓ Default admin user created (admin / env:ADMIN_PASSWORD)");
}

// ── DB helpers ──────────────────────────────────────────────
const findByUsername = db.prepare("SELECT * FROM users WHERE username = ?");
const listUsers = db.prepare("SELECT id, username, role, created_at FROM users ORDER BY created_at");
const deleteById = db.prepare("DELETE FROM users WHERE id = ? AND username != 'admin'");
const insertUser = db.prepare("INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)");

function createUser(username, password, role = "user") {
  const existing = findByUsername.get(username);
  if (existing) return { error: "Username already exists" };
  const id = crypto.randomUUID();
  const hash = bcrypt.hashSync(password, 10);
  insertUser.run(id, username, hash, role);
  return { id, username, role };
}

// ── JWT helpers ─────────────────────────────────────────────
function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

// ── Middleware-style helpers ────────────────────────────────
function getAuthUser(req) {
  const auth = req.headers["authorization"];
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return verifyToken(auth.slice(7));
}

function requireAuth(req) {
  return getAuthUser(req);
}

function requireAdmin(req) {
  const user = getAuthUser(req);
  return user && user.role === "admin" ? user : null;
}

// ── Route handler ───────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try { resolve(JSON.parse(body)); } catch { resolve(null); }
    });
  });
}

async function handleAuthRoutes(req, res, json) {
  const url = req.url;
  const method = req.method;

  // POST /api/auth/login
  if (url === "/api/auth/login" && method === "POST") {
    const body = await readBody(req);
    if (!body || !body.username || !body.password) return json(res, 400, { error: "Missing credentials" });
    const user = findByUsername.get(body.username);
    if (!user || !bcrypt.compareSync(body.password, user.password_hash)) {
      return json(res, 401, { error: "Invalid credentials" });
    }
    const token = signToken(user);
    return json(res, 200, { token, user: { id: user.id, username: user.username, role: user.role } });
  }

  // GET /api/auth/me
  if (url === "/api/auth/me" && method === "GET") {
    const user = requireAuth(req);
    if (!user) return json(res, 401, { error: "Unauthorized" });
    return json(res, 200, { id: user.id, username: user.username, role: user.role });
  }

  // GET /api/admin/users
  if (url === "/api/admin/users" && method === "GET") {
    if (!requireAdmin(req)) return json(res, 403, { error: "Forbidden" });
    return json(res, 200, listUsers.all());
  }

  // POST /api/admin/users
  if (url === "/api/admin/users" && method === "POST") {
    if (!requireAdmin(req)) return json(res, 403, { error: "Forbidden" });
    const body = await readBody(req);
    if (!body || !body.username || !body.password) return json(res, 400, { error: "Missing username/password" });
    const result = createUser(body.username, body.password, body.role || "user");
    if (result.error) return json(res, 409, result);
    return json(res, 201, result);
  }

  // DELETE /api/admin/users/:id
  if (url.startsWith("/api/admin/users/") && method === "DELETE") {
    if (!requireAdmin(req)) return json(res, 403, { error: "Forbidden" });
    const id = url.split("/api/admin/users/")[1];
    const changes = deleteById.run(id).changes;
    return json(res, 200, { deleted: changes > 0 });
  }

  return false; // not handled
}

module.exports = { handleAuthRoutes, requireAuth, getAuthUser };
