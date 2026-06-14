const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_DIR = __dirname;
const DB_FILE = path.join(__dirname, "database.json");
const sessions = new Map();

const initialUserData = {
  transactions: [],
  budgets: [],
  bills: [],
  freedomGoal: null,
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "null",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function readDb() {
  try {
    return JSON.parse(await fs.readFile(DB_FILE, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const db = { users: [] };
    await writeDb(db);
    return db;
  }
}

async function writeDb(db) {
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...corsHeaders, ...headers });
  res.end(JSON.stringify(body));
}

function parseCookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((cookie) => cookie.trim().split("="))
      .filter(([key, value]) => key && value)
  );
}

function createPasswordHash(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  return { salt, hash };
}

function verifyPassword(password, user) {
  const { hash } = createPasswordHash(password, user.passwordSalt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(user.passwordHash, "hex"));
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

async function readBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error("Request terlalu besar");
  }
  return body ? JSON.parse(body) : {};
}

async function getSessionUser(req) {
  const token = parseCookies(req).ff_session;
  if (!token) return null;
  const userId = sessions.get(token);
  if (!userId) return null;
  const db = await readDb();
  const user = db.users.find((item) => item.id === userId);
  return user ? { db, user, token } : null;
}

async function handleApi(req, res) {
  if (req.method === "POST" && req.url === "/api/register") {
    const body = await readBody(req);
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!name || !email || password.length < 6) {
      sendJson(res, 400, { error: "Nama, email, dan password minimal 6 karakter wajib diisi." });
      return;
    }

    const db = await readDb();
    if (db.users.some((user) => user.email === email)) {
      sendJson(res, 409, { error: "Email sudah terdaftar." });
      return;
    }

    const passwordData = createPasswordHash(password);
    const user = {
      id: crypto.randomUUID(),
      name,
      email,
      passwordSalt: passwordData.salt,
      passwordHash: passwordData.hash,
      data: structuredClone(initialUserData),
      createdAt: new Date().toISOString(),
    };

    db.users.push(user);
    await writeDb(db);

    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, user.id);
    sendJson(res, 201, { user: publicUser(user), data: user.data }, {
      "Set-Cookie": `ff_session=${token}; HttpOnly; Path=/; SameSite=Lax`,
    });
    return;
  }

  if (req.method === "POST" && req.url === "/api/login") {
    const body = await readBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const db = await readDb();
    const user = db.users.find((item) => item.email === email);

    if (!user || !verifyPassword(password, user)) {
      sendJson(res, 401, { error: "Email atau password salah." });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, user.id);
    sendJson(res, 200, { user: publicUser(user), data: user.data || structuredClone(initialUserData) }, {
      "Set-Cookie": `ff_session=${token}; HttpOnly; Path=/; SameSite=Lax`,
    });
    return;
  }

  if (req.method === "POST" && req.url === "/api/logout") {
    const token = parseCookies(req).ff_session;
    if (token) sessions.delete(token);
    sendJson(res, 200, { ok: true }, { "Set-Cookie": "ff_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax" });
    return;
  }

  const session = await getSessionUser(req);
  if (!session) {
    sendJson(res, 401, { error: "Belum login." });
    return;
  }

  if (req.method === "GET" && req.url === "/api/me") {
    sendJson(res, 200, { user: publicUser(session.user), data: session.user.data || structuredClone(initialUserData) });
    return;
  }

  if (req.method === "PUT" && req.url === "/api/data") {
    const body = await readBody(req);
    session.user.data = {
      transactions: Array.isArray(body.transactions) ? body.transactions : [],
      budgets: Array.isArray(body.budgets) ? body.budgets : [],
      bills: Array.isArray(body.bills) ? body.bills : [],
      freedomGoal: body.freedomGoal || null,
    };
    await writeDb(session.db);
    sendJson(res, 200, { ok: true, data: session.user.data });
    return;
  }

  sendJson(res, 404, { error: "Endpoint tidak ditemukan." });
}

async function serveStatic(req, res) {
  const requestedPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const relativePath = requestedPath === "/" ? "index.html" : requestedPath.slice(1);
  const filePath = path.normalize(path.join(PUBLIC_DIR, relativePath));

  if (!filePath.startsWith(PUBLIC_DIR) || path.basename(filePath) === "database.json") {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

function getLanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((address) => address && address.family === "IPv4" && !address.internal)
    .map((address) => `http://${address.address}:${PORT}`);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }
    if (req.url.startsWith("/api/")) {
      await handleApi(req, res);
      return;
    }
    await serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Server error" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Financial Freedom running at http://localhost:${PORT}`);
  getLanAddresses().forEach((url) => console.log(`Android/LAN: ${url}`));
});
