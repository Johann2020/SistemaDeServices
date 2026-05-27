const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const TENANTS_DIR = path.join(DATA_DIR, "tenants");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

ensureStorage();

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    serveStatic(req, res, url);
  } catch (error) {
    if (error.public) {
      sendJson(res, 400, { error: error.message });
      return;
    }
    console.error(error);
    sendJson(res, 500, { error: "Error interno del servidor." });
  }
}).listen(PORT, () => {
  console.log(`Sistema de Services listo en http://localhost:${PORT}`);
});

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/me") {
    const user = currentUser(req);
    sendJson(res, 200, { authenticated: Boolean(user), user: publicUser(user) });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/register") {
    const body = await readJson(req);
    const result = registerUser(body);
    setSessionCookie(res, result.token);
    sendJson(res, 201, { user: publicUser(result.user) });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/login") {
    const body = await readJson(req);
    const result = loginUser(body);
    setSessionCookie(res, result.token);
    sendJson(res, 200, { user: publicUser(result.user) });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/logout") {
    const token = sessionToken(req);
    if (token) deleteSession(token);
    res.setHeader("Set-Cookie", "services_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
    sendJson(res, 200, { ok: true });
    return;
  }

  const user = currentUser(req);
  if (!user) {
    sendJson(res, 401, { error: "Debe iniciar sesion." });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/state") {
    sendJson(res, 200, readTenantState(user.id));
    return;
  }

  if (req.method === "PUT" && url.pathname.startsWith("/api/state/")) {
    const bucket = url.pathname.split("/").pop();
    const allowed = ["clients", "equipment", "products", "services", "settings"];
    if (!allowed.includes(bucket)) {
      sendJson(res, 404, { error: "Dato no valido." });
      return;
    }
    const value = await readJson(req);
    const state = readTenantState(user.id);
    state[bucket] = value;
    writeTenantState(user.id, state);
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 404, { error: "Ruta no encontrada." });
}

function serveStatic(req, res, url) {
  let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
  if (filePath === "/index.html" && !currentUser(req)) filePath = "/login.html";

  const resolved = path.normalize(path.join(ROOT, filePath));
  if (!resolved.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("No permitido");
    return;
  }

  fs.readFile(resolved, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("No encontrado");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME_TYPES[path.extname(resolved)] || "application/octet-stream" });
    res.end(data);
  });
}

function registerUser(body) {
  const name = String(body.name || "").trim();
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  if (!name || !email || password.length < 6) throw publicError("Complete nombre, email y clave de al menos 6 caracteres.");

  const users = readJsonFile(USERS_FILE, []);
  if (users.some((user) => user.email === email)) throw publicError("Ya existe un usuario con ese email.");

  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeJsonFile(USERS_FILE, users);
  writeTenantState(user.id, defaultTenantState());
  const token = createSession(user.id);
  return { user, token };
}

function loginUser(body) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  const users = readJsonFile(USERS_FILE, []);
  const user = users.find((item) => item.email === email);
  if (!user || !verifyPassword(password, user.passwordHash)) throw publicError("Email o clave incorrectos.");
  const token = createSession(user.id);
  return { user, token };
}

function createSession(userId) {
  const sessions = readJsonFile(SESSIONS_FILE, {});
  const token = crypto.randomBytes(32).toString("hex");
  sessions[token] = { userId, createdAt: new Date().toISOString() };
  writeJsonFile(SESSIONS_FILE, sessions);
  return token;
}

function deleteSession(token) {
  const sessions = readJsonFile(SESSIONS_FILE, {});
  delete sessions[token];
  writeJsonFile(SESSIONS_FILE, sessions);
}

function currentUser(req) {
  const token = sessionToken(req);
  if (!token) return null;
  const sessions = readJsonFile(SESSIONS_FILE, {});
  const session = sessions[token];
  if (!session) return null;
  return readJsonFile(USERS_FILE, []).find((user) => user.id === session.userId) || null;
}

function sessionToken(req) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)services_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie", `services_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const incoming = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), incoming);
}

function readTenantState(userId) {
  return readJsonFile(path.join(TENANTS_DIR, `${userId}.json`), defaultTenantState());
}

function writeTenantState(userId, state) {
  writeJsonFile(path.join(TENANTS_DIR, `${userId}.json`), state);
}

function defaultTenantState() {
  return {
    clients: [],
    equipment: [],
    products: [],
    services: [],
    settings: {
      transportCost: 0,
      margins: [],
      frequentWorks: [],
      serviceFilters: { all: true, statuses: [] },
    },
  };
}

function publicUser(user) {
  return user ? { id: user.id, name: user.name, email: user.email } : null;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(publicError("JSON invalido."));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function readJsonFile(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return structuredClone(fallback);
  }
}

function writeJsonFile(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function ensureStorage() {
  fs.mkdirSync(TENANTS_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) writeJsonFile(USERS_FILE, []);
  if (!fs.existsSync(SESSIONS_FILE)) writeJsonFile(SESSIONS_FILE, {});
}

function publicError(message) {
  const error = new Error(message);
  error.public = true;
  return error;
}

process.on("uncaughtException", (error) => console.error(error));
process.on("unhandledRejection", (error) => console.error(error));
