import pool from "../db.js";

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function listShops(req, res) {
  try {
    const {rows} = await pool.query(
      "SELECT id, name, location, owner_name, created_by, created_at FROM shops ORDER BY id ASC"
    );
    return res.status(200).json({shops: rows});
  } catch (err) {
    console.error("listShops error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
}

export async function getShop(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({error: "Invalid shop id"});

  try {
    const {rows} = await pool.query(
      "SELECT id, name, location, owner_name, created_by, created_at FROM shops WHERE id = $1",
      [id]
    );
    if (!rows[0]) return res.status(404).json({error: "Shop not found"});
    return res.status(200).json({shop: rows[0]});
  } catch (err) {
    console.error("getShop error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
}

export async function createShop(req, res) {
  const {name, location, owner_name} = req.body || {};

  if (!name || typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({error: "name is required"});
  }

  try {
    const {rows} = await pool.query(
      `INSERT INTO shops (name, location, owner_name, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, location, owner_name, created_by, created_at`,
      [name.trim(), location ?? null, owner_name ?? null, req.user.id]
    );
    return res.status(201).json({shop: rows[0]});
  } catch (err) {
    console.error("createShop error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
}

export async function updateShop(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({error: "Invalid shop id"});

  const {name, location, owner_name} = req.body || {};

  if (name === undefined && location === undefined && owner_name === undefined) {
    return res.status(400).json({error: "Provide at least one field to update (name, location, owner_name)"});
  }
  if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
    return res.status(400).json({error: "name must be a non-empty string"});
  }

  const fields = [];
  const values = [];
  let i = 1;
  if (name !== undefined) {
    fields.push(`name = $${i++}`);
    values.push(name.trim());
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

  try {
    const {rows} = await pool.query(
      `UPDATE shops SET ${fields.join(", ")} WHERE id = $${i}
       RETURNING id, name, location, owner_name, created_by, created_at`,
      values
    );
    if (!rows[0]) return res.status(404).json({error: "Shop not found"});
    return res.status(200).json({shop: rows[0]});
  } catch (err) {
    console.error("updateShop error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
}

export async function listShopManagers(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({error: "Invalid shop id"});

  try {
    const shopExists = await pool.query("SELECT 1 FROM shops WHERE id = $1", [id]);
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
    return res.status(200).json({managers: rows});
  } catch (err) {
    console.error("listShopManagers error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
}

export async function assignShopManager(req, res) {
  const shopId = parseId(req.params.id);
  if (!shopId) return res.status(400).json({error: "Invalid shop id"});

  const {user_id} = req.body || {};
  const userId = parseId(user_id);
  if (!userId) return res.status(400).json({error: "user_id is required and must be a positive integer"});

  const client = await pool.connect();
  try {
    const shop = await client.query("SELECT id FROM shops WHERE id = $1", [shopId]);
    if (shop.rowCount === 0) return res.status(404).json({error: "Shop not found"});

    const user = await client.query("SELECT id, role FROM users WHERE id = $1", [userId]);
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
        assigned_shop_id: existing.rows[0].shop_id,
      });
    }

    const {rows} = await client.query(
      `INSERT INTO shop_managers (user_id, shop_id) VALUES ($1, $2)
       RETURNING id, user_id, shop_id`,
      [userId, shopId]
    );
    return res.status(201).json({assignment: rows[0]});
  } catch (err) {
    console.error("assignShopManager error:", err);
    return res.status(500).json({error: "Internal server error"});
  } finally {
    client.release();
  }
}

export async function getShopReport(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({error: "Invalid shop id"});

  try {
    const {rows: shopRows} = await pool.query(
      "SELECT id, name, location, owner_name, created_at FROM shops WHERE id = $1",
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

    return res.status(200).json({
      report: {
        shop,
        totals: totalsRows[0],
        by_campaign: byCampaign,
        recent_transactions: recent,
      },
    });
  } catch (err) {
    console.error("getShopReport error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
}

export async function unassignShopManager(req, res) {
  const shopId = parseId(req.params.id);
  const userId = parseId(req.params.userId);
  if (!shopId || !userId) return res.status(400).json({error: "Invalid id"});

  try {
    const result = await pool.query(
      "DELETE FROM shop_managers WHERE shop_id = $1 AND user_id = $2",
      [shopId, userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({error: "Assignment not found"});
    }
    return res.status(204).send();
  } catch (err) {
    console.error("unassignShopManager error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
}
