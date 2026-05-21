import pool from "../db.js";

export async function listAuditLogs(req, res) {
  const {
    user_id: userId = null,
    action = null,
    entity_type: entityType = null,
    entity_id: entityId = null,
    from = null,
    to = null,
    limit,
    offset,
  } = req.query;

  // Joi gives Date objects for from/to; pg expects ISO strings for timestamptz casts.
  const fromIso = from ? new Date(from).toISOString() : null;
  const toIso = to ? new Date(to).toISOString() : null;

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
      [userId, action, entityType, entityId, fromIso, toIso, limit, offset]
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
      [userId, action, entityType, entityId, fromIso, toIso]
    );

    return res.status(200).json({
      filters: {
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        from: fromIso,
        to: toIso,
      },
      pagination: {limit, offset, total: countRows[0].total},
      audit_logs: rows,
    });
  } catch (err) {
    console.error("listAuditLogs error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
}
