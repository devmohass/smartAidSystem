import pool from "../db.js";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

function parseOptionalId(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

function parseOptionalDate(value) {
  if (value === undefined || value === null || value === "") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function parseLimit(value) {
  if (value === undefined || value === null || value === "") return DEFAULT_LIMIT;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return undefined;
  return Math.min(n, MAX_LIMIT);
}

function parseOffset(value) {
  if (value === undefined || value === null || value === "") return 0;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return undefined;
  return n;
}

export async function listAuditLogs(req, res) {
  const userId = parseOptionalId(req.query.user_id);
  const action = req.query.action ? String(req.query.action) : null;
  const entityType = req.query.entity_type ? String(req.query.entity_type) : null;
  const entityId = parseOptionalId(req.query.entity_id);
  const from = parseOptionalDate(req.query.from);
  const to = parseOptionalDate(req.query.to);
  const limit = parseLimit(req.query.limit);
  const offset = parseOffset(req.query.offset);

  if (userId === undefined) return res.status(400).json({error: "user_id must be a positive integer"});
  if (entityId === undefined) return res.status(400).json({error: "entity_id must be a positive integer"});
  if (from === undefined) return res.status(400).json({error: "from must be a valid date"});
  if (to === undefined) return res.status(400).json({error: "to must be a valid date"});
  if (limit === undefined) return res.status(400).json({error: "limit must be a positive integer"});
  if (offset === undefined) return res.status(400).json({error: "offset must be a non-negative integer"});

  try {
    const {rows} = await pool.query(
      `SELECT al.id, al.user_id, u.email AS user_email, u.role AS user_role,
              al.action, al.entity_type, al.entity_id, al.logged_at
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE ($1::int IS NULL OR al.user_id = $1)
         AND ($2::text IS NULL OR al.action = $2)
         AND ($3::text IS NULL OR al.entity_type = $3)
         AND ($4::int IS NULL OR al.entity_id = $4)
         AND ($5::timestamptz IS NULL OR al.logged_at >= $5::timestamptz)
         AND ($6::timestamptz IS NULL OR al.logged_at <= $6::timestamptz)
       ORDER BY al.id DESC
       LIMIT $7 OFFSET $8`,
      [userId, action, entityType, entityId, from, to, limit, offset]
    );

    const {rows: countRows} = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM audit_logs al
       WHERE ($1::int IS NULL OR al.user_id = $1)
         AND ($2::text IS NULL OR al.action = $2)
         AND ($3::text IS NULL OR al.entity_type = $3)
         AND ($4::int IS NULL OR al.entity_id = $4)
         AND ($5::timestamptz IS NULL OR al.logged_at >= $5::timestamptz)
         AND ($6::timestamptz IS NULL OR al.logged_at <= $6::timestamptz)`,
      [userId, action, entityType, entityId, from, to]
    );

    return res.status(200).json({
      filters: {user_id: userId, action, entity_type: entityType, entity_id: entityId, from, to},
      pagination: {limit, offset, total: countRows[0].total},
      audit_logs: rows,
    });
  } catch (err) {
    console.error("listAuditLogs error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
}
