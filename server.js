require("dotenv").config();
const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.set("trust proxy", 1); // Render runs Express behind a reverse proxy.
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const REQUESTS_FILE = path.join(DATA_DIR, "requests.json");

if (!ADMIN_PASSWORD) {
  console.error("Missing ADMIN_PASSWORD environment variable.");
  process.exit(1);
}
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(REQUESTS_FILE)) fs.writeFileSync(REQUESTS_FILE, "[]");

function readRequests() {
  try { return JSON.parse(fs.readFileSync(REQUESTS_FILE, "utf8")); }
  catch { return []; }
}
function writeRequests(items) {
  fs.writeFileSync(REQUESTS_FILE, JSON.stringify(items, null, 2));
}
function clean(value, max = 4000) {
  return String(value || "").trim().slice(0, max);
}
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: "Please sign in first." });
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(session({
  store: new SQLiteStore({ db: "sessions.sqlite", dir: DATA_DIR }),
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 8
  }
}));

const publicLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
app.use("/api/requests", publicLimiter);
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/requests", (req, res) => {
  const prompt = clean(req.body.prompt, 2500);
  const kind = req.body.kind === "drawing" ? "drawing" : "chat";
  if (prompt.length < 2) return res.status(400).json({ error: "Write a little more before sending." });
  const items = readRequests();
  const item = {
    id: crypto.randomUUID(),
    kind,
    prompt,
    createdAt: new Date().toISOString(),
    status: "pending",
    response: "",
    image: ""
  };
  items.unshift(item);
  writeRequests(items);
  res.status(201).json({ id: item.id, message: "Your request has been sent to Pessiai." });
});

app.get("/api/requests/:id", (req, res) => {
  const item = readRequests().find(x => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Request not found." });
  res.json({ id: item.id, status: item.status, response: item.response, image: item.image });
});

app.post("/api/admin/login", (req, res) => {
  const password = String(req.body.password || "");
  if (password.length > 200 || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Incorrect password." });
  }
  req.session.isAdmin = true;
  res.json({ ok: true });
});
app.post("/api/admin/logout", requireAdmin, (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});
app.get("/api/admin/me", (req, res) => res.json({ authenticated: !!(req.session && req.session.isAdmin) }));
app.get("/api/admin/requests", requireAdmin, (req, res) => res.json(readRequests()));
app.post("/api/admin/requests/:id/reply", requireAdmin, (req, res) => {
  const response = clean(req.body.response, 5000);
  const image = String(req.body.image || "");
  if (image && (!image.startsWith("data:image/png;base64,") || image.length > 6_000_000)) {
    return res.status(400).json({ error: "The drawing must be a PNG under 4.5 MB." });
  }
  const items = readRequests();
  const item = items.find(x => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: "Request not found." });
  if (!response && !image) return res.status(400).json({ error: "Add a written response or a drawing." });
  item.response = response;
  item.image = image;
  item.status = "answered";
  item.answeredAt = new Date().toISOString();
  writeRequests(items);
  res.json({ ok: true });
});
app.delete("/api/admin/requests/:id", requireAdmin, (req, res) => {
  const items = readRequests().filter(x => x.id !== req.params.id);
  writeRequests(items);
  res.json({ ok: true });
});

app.get("/ai", (req, res) => res.sendFile(path.join(__dirname, "public", "ai.html")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`Pessiai running on port ${PORT}`));
