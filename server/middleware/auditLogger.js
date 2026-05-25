import pool from "../db.js";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const SKIP_PATHS = new Set(["/api/auth/login"]);
const NON_PLURAL = new Set(["status", "me", "health", "search", "login", "logout"]);
const BODY_ID_KEYS = [
  "user", "shop", "beneficiary", "campaign", "transaction",
  "enrollment", "assignment", "receipt", "report", "summary",
];

function singularize(word) {
  if (NON_PLURAL.has(word)) return word;
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("sses")) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function deriveAction(path, method) {
  const verbMap = {POST: "CREATE", PUT: "UPDATE", PATCH: "UPDATE", DELETE: "DELETE"};
  const verb = verbMap[method];
  const segments = path.split("/").filter((p) => p && p !== "api");
  const resources = segments.filter((p) => !/^\d+$/.test(p));
  const name = resources.map(singularize).join("_").toUpperCase();
  return name ? `${verb}_${name}` : verb;
}

function deriveEntityType(path) {
  const segments = path.split("/").filter((p) => p && p !== "api");
  const first = segments.find((p) => !/^\d+$/.test(p));
  return first ? singularize(first) : null;
}

function extractEntityId(path, body) {
  const urlMatch = path.match(/\/(\d+)(?:\/|$)/);
  if (urlMatch) return Number(urlMatch[1]);

  // Success responses use the { data: <thing> } envelope, so the created
  // row's id lives at body.data.id — unwrap before probing.
  const payload = body && typeof body === "object" && "data" in body ? body.data : body;

  if (payload && typeof payload === "object") {
    for (const key of BODY_ID_KEYS) {
      const value = payload[key];
      if (value && typeof value === "object" && Number.isInteger(value.id)) {
        return value.id;
      }
    }
    if (Number.isInteger(payload.id)) return payload.id;
  }
  return null;
}

function stripQuery(url) {
  const i = url.indexOf("?");
  return i === -1 ? url : url.slice(0, i);
}

export default function auditLogger(req, res, next) {
  if (!WRITE_METHODS.has(req.method)) return next();

  // Capture the path NOW, before Express sub-routers strip mount prefixes
  // from req.url (and therefore from req.path).
  const capturedPath = stripQuery(req.originalUrl || req.url);

  if (SKIP_PATHS.has(capturedPath)) return next();

  const originalJson = res.json.bind(res);
  let captured = null;
  res.json = function (body) {
    captured = body;
    return originalJson(body);
  };

  res.on("finish", () => {
    if (res.statusCode < 200 || res.statusCode >= 300) return;

    const action = deriveAction(capturedPath, req.method);
    const entityType = deriveEntityType(capturedPath);
    const entityId = extractEntityId(capturedPath, captured);
    const userId = req.user?.id ?? null;

    pool
      .query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
         VALUES ($1, $2, $3, $4)`,
        [userId, action, entityType, entityId]
      )
      .catch((err) => console.error("auditLogger insert error:", err.message));
  });

  next();
}
