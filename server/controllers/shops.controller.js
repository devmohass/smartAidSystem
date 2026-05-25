import pool from "../db.js";
import {ok} from "../utils/respond.js";

export async function listShops(req, res) {
  const {q = null, limit, offset} = req.query;
  const search = q ? `%${q}%` : null;

  const where = `
    WHERE s.deleted_at IS NULL
      AND ($1::text IS NULL OR s.name ILIKE $1 OR s.owner_name ILIKE $1 OR s.location ILIKE $1)`;

  const {rows} = await pool.query(
    `SELECT s.id, s.name, s.location, s.owner_name, s.created_by, s.created_at,
            COALESCE(tx.cnt, 0)::int     AS tx_count,
            COALESCE(tx.total, 0)::float AS total_disbursed
     FROM shops s
     LEFT JOIN (
       SELECT shop_id, COUNT(*) AS cnt, SUM(amount) AS total
       FROM transactions GROUP BY shop_id
     ) tx ON tx.shop_id = s.id
     ${where}
     ORDER BY s.id ASC LIMIT $2 OFFSET $3`,
    [search, limit, offset]
  );
  const {rows: countRows} = await pool.query(
    `SELECT COUNT(*)::int AS total FROM shops s ${where}`,
    [search]
  );

  return res.status(200).json({
    data: rows,
    pagination: {limit, offset, total: countRows[0].total},
    filters: {q},
  });
}

export async function getShop(req, res) {
  const {id} = req.params;
  const {rows} = await pool.query(
    "SELECT id, name, location, owner_name, created_by, created_at FROM shops WHERE id = $1 AND deleted_at IS NULL",
    [id]
  );
  if (!rows[0]) return res.status(404).json({error: "Shop not found"});
  return ok(res, rows[0]);
}

export async function createShop(req, res) {
  const {name, location, owner_name} = req.body;
  const {rows} = await pool.query(
    `INSERT INTO shops (name, location, owner_name, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, location, owner_name, created_by, created_at`,
    [name, location ?? null, owner_name ?? null, req.user.id]
  );
  return ok(res, rows[0], 201);
}

export async function updateShop(req, res) {
  const {id} = req.params;
  const {name, location, owner_name} = req.body;

  const fields = [];
  const values = [];
  let i = 1;
  if (name !== undefined) {
    fields.push(`name = $${i++}`);
    values.push(name);
  }
  if (location !== undefined) {
    fields.push(`location = $${i++}`);
    values.push(location);
  }
  if (owner_name !== undefined) {
    fields.push(`owner_name = $${i++}`);
    values.push(owner_name);
  }
  values.push(id);

  const {rows} = await pool.query(
    `UPDATE shops SET ${fields.join(", ")} WHERE id = $${i} AND deleted_at IS NULL
     RETURNING id, name, location, owner_name, created_by, created_at`,
    values
  );
  if (!rows[0]) return res.status(404).json({error: "Shop not found"});
  return ok(res, rows[0]);
}

export async function deleteShop(req, res) {
  const {id} = req.params;
  // Soft delete: retain the shop (and its transaction history) for audit.
  const result = await pool.query(
    "UPDATE shops SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
    [id]
  );
  if (result.rowCount === 0) return res.status(404).json({error: "Shop not found"});
  return res.status(204).send();
}

export async function listShopManagers(req, res) {
  const {id} = req.params;

  const shopExists = await pool.query(
    "SELECT 1 FROM shops WHERE id = $1 AND deleted_at IS NULL",
    [id]
  );
  if (shopExists.rowCount === 0) {
    return res.status(404).json({error: "Shop not found"});
  }

  const {rows} = await pool.query(
    `SELECT sm.id AS assignment_id, u.id AS user_id, u.name, u.email
     FROM shop_managers sm
     JOIN users u ON u.id = sm.user_id
     WHERE sm.shop_id = $1
     ORDER BY u.id ASC`,
    [id]
  );
  return ok(res, rows);
}

export async function assignShopManager(req, res) {
  const {id: shopId} = req.params;
  const {user_id: userId} = req.body;

  const client = await pool.connect();
  try {
    const shop = await client.query(
      "SELECT id FROM shops WHERE id = $1 AND deleted_at IS NULL",
      [shopId]
    );
    if (shop.rowCount === 0) return res.status(404).json({error: "Shop not found"});

    const user = await client.query(
      "SELECT id, role FROM users WHERE id = $1 AND deleted_at IS NULL",
      [userId]
    );
    if (user.rowCount === 0) return res.status(404).json({error: "User not found"});
    if (user.rows[0].role !== "shop_manager") {
      return res.status(400).json({error: "Target user must have role 'shop_manager'"});
    }

    const existing = await client.query(
      "SELECT shop_id FROM shop_managers WHERE user_id = $1",
      [userId]
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({
        error: "User is already assigned to a shop",
        details: {assigned_shop_id: existing.rows[0].shop_id},
      });
    }

    const {rows} = await client.query(
      `INSERT INTO shop_managers (user_id, shop_id) VALUES ($1, $2)
       RETURNING id, user_id, shop_id`,
      [userId, shopId]
    );
    return ok(res, rows[0], 201);
  } finally {
    client.release();
  }
}

export async function getShopReport(req, res) {
  const {id} = req.params;

  const {rows: shopRows} = await pool.query(
    "SELECT id, name, location, owner_name, created_at FROM shops WHERE id = $1 AND deleted_at IS NULL",
    [id]
  );
  const shop = shopRows[0];
  if (!shop) return res.status(404).json({error: "Shop not found"});

  const {rows: totalsRows} = await pool.query(
    `SELECT COUNT(*)::int AS transaction_count,
            COALESCE(SUM(amount), 0)::float AS total_amount,
            COUNT(DISTINCT beneficiary_id)::int AS unique_beneficiaries,
            COUNT(DISTINCT shop_manager_id)::int AS unique_managers
     FROM transactions WHERE shop_id = $1`,
    [id]
  );

  const {rows: byCampaign} = await pool.query(
    `SELECT c.id AS campaign_id, c.title AS campaign_title, c.status AS campaign_status,
            COUNT(t.id)::int AS transaction_count,
            COALESCE(SUM(t.amount), 0)::float AS total_amount
     FROM transactions t
     JOIN campaigns c ON c.id = t.campaign_id
     WHERE t.shop_id = $1
     GROUP BY c.id, c.title, c.status
     ORDER BY total_amount DESC`,
    [id]
  );

  const {rows: recent} = await pool.query(
    `SELECT t.id, t.campaign_id, t.beneficiary_id, t.amount, t.balance_after,
            t.transaction_at, r.receipt_code
     FROM transactions t
     LEFT JOIN receipts r ON r.transaction_id = t.id
     WHERE t.shop_id = $1
     ORDER BY t.id DESC
     LIMIT 10`,
    [id]
  );

  return ok(res, {
    shop,
    totals: totalsRows[0],
    by_campaign: byCampaign,
    recent_transactions: recent,
  });
}

export async function unassignShopManager(req, res) {
  const {id: shopId, userId} = req.params;
  const result = await pool.query(
    "DELETE FROM shop_managers WHERE shop_id = $1 AND user_id = $2",
    [shopId, userId]
  );
  if (result.rowCount === 0) {
    return res.status(404).json({error: "Assignment not found"});
  }
  return res.status(204).send();
}
