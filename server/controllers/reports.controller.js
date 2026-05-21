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

export async function reportTransactions(req, res) {
  const campaignId = parseOptionalId(req.query.campaign_id);
  const beneficiaryId = parseOptionalId(req.query.beneficiary_id);
  const shopId = parseOptionalId(req.query.shop_id);
  const managerId = parseOptionalId(req.query.shop_manager_id);
  const from = parseOptionalDate(req.query.from);
  const to = parseOptionalDate(req.query.to);
  const limit = parseLimit(req.query.limit);
  const offset = parseOffset(req.query.offset);

  if (campaignId === undefined) return res.status(400).json({error: "campaign_id must be a positive integer"});
  if (beneficiaryId === undefined) return res.status(400).json({error: "beneficiary_id must be a positive integer"});
  if (shopId === undefined) return res.status(400).json({error: "shop_id must be a positive integer"});
  if (managerId === undefined) return res.status(400).json({error: "shop_manager_id must be a positive integer"});
  if (from === undefined) return res.status(400).json({error: "from must be a valid date"});
  if (to === undefined) return res.status(400).json({error: "to must be a valid date"});
  if (limit === undefined) return res.status(400).json({error: "limit must be a positive integer"});
  if (offset === undefined) return res.status(400).json({error: "offset must be a non-negative integer"});

  try {
    const {rows} = await pool.query(
      `SELECT t.id, t.campaign_id, t.beneficiary_id, t.shop_id, t.shop_manager_id,
              t.amount, t.goods_description, t.balance_before, t.balance_after,
              t.status, t.transaction_at, r.receipt_code
       FROM transactions t
       LEFT JOIN receipts r ON r.transaction_id = t.id
       WHERE ($1::int IS NULL OR t.campaign_id = $1)
         AND ($2::int IS NULL OR t.beneficiary_id = $2)
         AND ($3::int IS NULL OR t.shop_id = $3)
         AND ($4::int IS NULL OR t.shop_manager_id = $4)
         AND ($5::timestamptz IS NULL OR t.transaction_at >= $5::timestamptz)
         AND ($6::timestamptz IS NULL OR t.transaction_at <= $6::timestamptz)
       ORDER BY t.id DESC
       LIMIT $7 OFFSET $8`,
      [campaignId, beneficiaryId, shopId, managerId, from, to, limit, offset]
    );

    const {rows: countRows} = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM transactions t
       WHERE ($1::int IS NULL OR t.campaign_id = $1)
         AND ($2::int IS NULL OR t.beneficiary_id = $2)
         AND ($3::int IS NULL OR t.shop_id = $3)
         AND ($4::int IS NULL OR t.shop_manager_id = $4)
         AND ($5::timestamptz IS NULL OR t.transaction_at >= $5::timestamptz)
         AND ($6::timestamptz IS NULL OR t.transaction_at <= $6::timestamptz)`,
      [campaignId, beneficiaryId, shopId, managerId, from, to]
    );

    return res.status(200).json({
      filters: {
        campaign_id: campaignId,
        beneficiary_id: beneficiaryId,
        shop_id: shopId,
        shop_manager_id: managerId,
        from,
        to,
      },
      pagination: {limit, offset, total: countRows[0].total},
      transactions: rows,
    });
  } catch (err) {
    console.error("reportTransactions error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
}

export async function reportCampaigns(req, res) {
  try {
    const {rows} = await pool.query(`
      SELECT
        c.id, c.title, c.location, c.status, c.budget, c.start_date, c.end_date,
        COALESCE(cb.beneficiary_count, 0)::int           AS beneficiary_count,
        COALESCE(cb.total_allocated, 0)::float           AS total_allocated,
        COALESCE(cb.total_remaining, 0)::float           AS total_remaining_in_wallets,
        COALESCE(t.transaction_count, 0)::int            AS transaction_count,
        COALESCE(t.total_spent, 0)::float                AS total_spent
      FROM campaigns c
      LEFT JOIN (
        SELECT campaign_id,
               COUNT(*)                AS beneficiary_count,
               SUM(allocated_balance)  AS total_allocated,
               SUM(remaining_balance)  AS total_remaining
        FROM campaign_beneficiaries
        GROUP BY campaign_id
      ) cb ON cb.campaign_id = c.id
      LEFT JOIN (
        SELECT campaign_id, COUNT(*) AS transaction_count, SUM(amount) AS total_spent
        FROM transactions
        GROUP BY campaign_id
      ) t ON t.campaign_id = c.id
      ORDER BY c.id ASC
    `);

    return res.status(200).json({campaigns: rows});
  } catch (err) {
    console.error("reportCampaigns error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
}
