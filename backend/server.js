/**
 * Kafka Signal Monitor — Backend
 *
 * Signals are persisted in SQLite (signals.db).
 */

const { Kafka } = require("kafkajs");
const crypto = require("crypto");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { insertSignal, getSignals, getCount } = require("./db");
const { handleAuthRoutes, requireAuth, requireAdmin } = require("./auth");
const { handleWebhookRoutes, dispatchSignal } = require("./webhooks");
// ── Config ──────────────────────────────────────────────────
const BROKERS = (process.env.KAFKA_BROKERS || "65.108.235.150:9092").split(",");
const TOPIC = process.env.KAFKA_TOPIC || "bridgewise.alerts.normalized";
const GROUP_ID = process.env.KAFKA_GROUP_ID || "lovable-signals-reprocess-v1";
const PORT = parseInt(process.env.PORT || "3000", 10);

// ── State ───────────────────────────────────────────────────
let kafkaConnected = false;
let kafkaError = null;

// ── Normalize ───────────────────────────────────────────────
function mapSentiment(sentiment) {
  if (!sentiment) return "NEUTRAL";
  const s = sentiment.toUpperCase();
  if (s === "POSITIVE" || s === "BULLISH") return "BUY";
  if (s === "NEGATIVE" || s === "BEARISH") return "SELL";
  return "NEUTRAL";
}

function normalize(raw) {
  if (!raw || typeof raw !== "object" || Object.keys(raw).length === 0) {
    return null;
  }

  const meta = raw.eventMetadata || {};
  const assets = raw.assetsDetails || {};
  const content = raw.eventContent || {};

  // Pick best locale: es > en > any
  const loc = content["es-ES"] || content["en-US"] || content[Object.keys(content)[0]] || {};

  // 1. id
  const id = meta.uniqueEventId || raw.event_id || `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

  // 2. timestamp
  const timestamp = meta.eventDate || raw.processed_at || raw.timestamp || new Date().toISOString();

  // 3. symbol — from assetsDetails first, then flat fields
  const symbol =
    assets.tickerSymbol ||
    assets.assetNameShort ||
    assets.assetName ||
    raw.ticker ||
    raw.asset_name_short ||
    raw.symbol ||
    "UNKNOWN";

  // 4. action
  const action = raw.action
    ? (raw.action.toUpperCase() === "BUY" ? "BUY" : raw.action.toUpperCase() === "SELL" ? "SELL" : "NEUTRAL")
    : mapSentiment(meta.eventSentiment || raw.sentiment);

  // 5. confidence
  const confidence = meta.eventImportanceLevel != null
    ? Number(meta.eventImportanceLevel)
    : (raw.importance_level != null ? Number(raw.importance_level) : null);

  // 6. source
  const source = raw.source || "bridgewise";

  // 7. eventName & eventType
  const eventName = meta.eventName || raw.event_name || null;
  const eventType = meta.eventType || raw.event_type || null;

  // 8. title & description from localized content
  const title = loc.eventTitle || raw.title_es || raw.title_en || null;
  const description = loc.eventBody || raw.body_es || raw.body_en || null;

  return {
    id, timestamp, symbol, action, confidence, source,
    eventName, eventType, title, description, payload: raw,
  };
}

// ── Kafka Consumer ──────────────────────────────────────────
const kafka = new Kafka({
  clientId: "signal-monitor",
  brokers: BROKERS,
  retry: { initialRetryTime: 1000, retries: 10 },
});

const consumer = kafka.consumer({ groupId: GROUP_ID });

async function startConsumer() {
  try {
    await consumer.connect();
    kafkaConnected = true;
    kafkaError = null;
    console.log(`✓ Connected to Kafka: ${BROKERS.join(", ")}`);

    await consumer.subscribe({ topic: TOPIC, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          // Strip first 5 bytes (schema registry header)
          let buf = message.value;
          let str = buf.toString();
          // Find first '{' to skip binary/garbage prefix
          const jsonStart = str.indexOf("{");
          if (jsonStart === -1) return;
          if (jsonStart > 0) str = str.slice(jsonStart);

          const raw = JSON.parse(str);
          const signal = normalize(raw);
          if (signal) {
            insertSignal(signal);
            dispatchSignal(signal);
          }
        } catch (err) {
          console.error("⚠ Parse error:", err.message);
        }
      },
    });
  } catch (err) {
    kafkaConnected = false;
    kafkaError = err.message;
    console.error("✗ Kafka connection error:", err.message);
    setTimeout(startConsumer, 5000);
  }
}

consumer.on("consumer.disconnect", () => {
  kafkaConnected = false;
  kafkaError = "Disconnected";
  console.warn("⚠ Kafka disconnected — will retry…");
  setTimeout(startConsumer, 5000);
});

// ── HTTP Server ─────────────────────────────────────────────
function json(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(data));
}

const DIST = path.join(__dirname, "dist");
const hasStatic = fs.existsSync(DIST);

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    return res.end();
  }

  if (req.url === "/health") {
    return json(res, 200, {
      status: kafkaConnected ? "ok" : "error",
      kafka: kafkaConnected ? "connected" : kafkaError || "disconnected",
      signals: getCount(),
      uptime: process.uptime(),
    });
  }

  // Auth routes
  const authHandled = await handleAuthRoutes(req, res, json);
  if (authHandled !== false) return;

  // Webhook routes
  const whHandled = await handleWebhookRoutes(req, res, json, requireAdmin);
  if (whHandled !== false) return;

  // Protected API routes
  if (req.url.startsWith("/api/signals") && !req.url.startsWith("/api/signals/")) {
    if (!requireAuth(req)) return json(res, 401, { error: "Unauthorized" });
    const url = new URL(req.url, `http://localhost`);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
    const offset = (page - 1) * limit;
    const data = getSignals(limit, offset);
    const total = getCount();
    return json(res, 200, { data, total, page, limit, totalPages: Math.ceil(total / limit) });
  }

  if (req.url === "/api/signals/latest") {
    if (!requireAuth(req)) return json(res, 401, { error: "Unauthorized" });
    const all = getSignals(1);
    return json(res, 200, all[0] || null);
  }

  if (hasStatic) {
    let filePath = path.join(DIST, req.url === "/" ? "index.html" : req.url);
    if (!fs.existsSync(filePath)) filePath = path.join(DIST, "index.html");
    const ext = path.extname(filePath);
    const mimeTypes = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
    };
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    return fs.createReadStream(filePath).pipe(res);
  }

  json(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  startConsumer();
});

process.on("SIGTERM", async () => {
  console.log("Shutting down…");
  await consumer.disconnect();
  server.close();
  process.exit(0);
});
