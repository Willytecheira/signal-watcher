/**
 * Kafka Signal Monitor — Backend
 *
 * This server connects to a remote Kafka cluster and exposes
 * consumed signals via a REST API for the frontend dashboard.
 *
 * Environment variables:
 *   KAFKA_BROKERS  — comma-separated broker list (default: 65.108.235.150:9092)
 *   KAFKA_TOPIC    — topic to subscribe to (default: bridgewise.alerts.normalized)
 *   KAFKA_GROUP_ID — consumer group id (default: lovable-signals-app)
 *   PORT           — HTTP port (default: 3000)
 */

const { Kafka } = require("kafkajs");
const http = require("http");
const path = require("path");
const fs = require("fs");

// ── Config ──────────────────────────────────────────────────
const BROKERS = (process.env.KAFKA_BROKERS || "65.108.235.150:9092").split(",");
const TOPIC = process.env.KAFKA_TOPIC || "bridgewise.alerts.normalized";
const GROUP_ID = process.env.KAFKA_GROUP_ID || "lovable-signals-app";
const PORT = parseInt(process.env.PORT || "3000", 10);

// ── State ───────────────────────────────────────────────────
const MAX_SIGNALS = 100;
let signals = [];
let kafkaConnected = false;
let kafkaError = null;

// ── Normalize ───────────────────────────────────────────────
function normalize(raw) {
  return {
    timestamp: raw.timestamp || new Date().toISOString(),
    symbol: raw.symbol || "UNKNOWN",
    action: (raw.action || "UNKNOWN").toUpperCase(),
    price: typeof raw.price === "number" ? raw.price : parseFloat(raw.price) || 0,
    confidence: typeof raw.confidence === "number" ? raw.confidence : parseInt(raw.confidence, 10) || 0,
    source: raw.source || "unknown",
    payload: raw.payload || raw,
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
          signals.unshift(signal);
          if (signals.length > MAX_SIGNALS) signals = signals.slice(0, MAX_SIGNALS);
        } catch (err) {
          console.error("⚠ Parse error:", err.message);
          // Continue consuming — don't crash
        }
      },
    });
  } catch (err) {
    kafkaConnected = false;
    kafkaError = err.message;
    console.error("✗ Kafka connection error:", err.message);
    // Retry after 5 seconds
    setTimeout(startConsumer, 5000);
  }
}

// Handle disconnects
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

// Serve static frontend if dist/ exists
const DIST = path.join(__dirname, "dist");
const hasStatic = fs.existsSync(DIST);

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  // API routes
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

  // Static file serving (production)
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

// ── Start ───────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  startConsumer();
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down…");
  await consumer.disconnect();
  server.close();
  process.exit(0);
});
