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
 *   KAFKA_TOPIC    — topic to subscribe to (default: bridgewise.alerts.normalized)
 *   KAFKA_GROUP_ID — consumer group id (default: lovable-signals-app)
 *   PORT           — HTTP port (default: 3000)
 */

const { Kafka } = require("kafkajs");
const crypto = require("crypto");
const http = require("http");
const path = require("path");
const fs = require("fs");

// ── Config ──────────────────────────────────────────────────
const BROKERS = (process.env.KAFKA_BROKERS || "65.108.235.150:9092").split(",");
const TOPIC = process.env.KAFKA_TOPIC || "bridgewise.alerts.normalized";
const GROUP_ID = process.env.KAFKA_GROUP_ID || "lovable-signals-app";
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
  // Skip empty messages
  if (!raw || typeof raw !== "object" || Object.keys(raw).length === 0) {
    return null;
  }

  // 1. id
  const id = raw.event_id || `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

  // 2. timestamp
  const timestamp =
    raw.processed_at ||
    raw.raw_received_at ||
    raw.event_date_utc ||
    raw.timestamp ||
    new Date().toISOString();

  // 3. symbol
  const symbol =
    (raw.ticker && raw.ticker !== null ? raw.ticker : null) ||
    raw.asset_name_short ||
    raw.asset_name ||
    raw.symbol ||
    "UNKNOWN";

  // 4. action
  const action = raw.action
    ? raw.action.toUpperCase() === "BUY" ? "BUY" : raw.action.toUpperCase() === "SELL" ? "SELL" : "NEUTRAL"
    : mapSentiment(raw.sentiment);

  // 5. confidence
  const confidence = raw.importance_level != null
    ? Number(raw.importance_level)
    : (raw.confidence != null ? Number(raw.confidence) : null);

  // 6. source
  const source = raw.source || "bridgewise";

  // 7. eventName
  const eventName = raw.event_name || null;

  // 8. eventType
  const eventType = raw.event_type || null;

  // 9. title (es > en > pt)
  const title = raw.title_es || raw.title_en || raw.title_pt || null;

  // 10. description (es > en > pt)
  const description = raw.body_es || raw.body_en || raw.body_pt || null;

  return {
    id,
    timestamp,
    symbol,
    action,
    confidence,
    source,
    eventName,
    eventType,
    title,
    description,
    payload: raw,
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
          const raw = JSON.parse(message.value.toString());
          const signal = normalize(raw);
          if (signal) {
            signals.unshift(signal);
            if (signals.length > MAX_SIGNALS) signals = signals.slice(0, MAX_SIGNALS);
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
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

const DIST = path.join(__dirname, "dist");
const hasStatic = fs.existsSync(DIST);

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  if (req.url === "/health") {
    return json(res, 200, {
      status: kafkaConnected ? "ok" : "error",
      kafka: kafkaConnected ? "connected" : kafkaError || "disconnected",
      signals: signals.length,
      uptime: process.uptime(),
    });
  }

  if (req.url === "/api/signals") {
    return json(res, 200, signals);
  }

  if (req.url === "/api/signals/latest") {
    return json(res, 200, signals[0] || null);
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
