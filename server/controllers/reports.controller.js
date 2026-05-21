import pool from "../db.js";

export async function reportTransactions(req, res) {
  const {
    campaign_id: campaignId = null,
    beneficiary_id: beneficiaryId = null,
    shop_id: shopId = null,
    shop_manager_id: managerId = null,
    from = null,
    to = null,
    limit,
    offset,
  } = req.query;

  // Joi gives Date objects for from/to; pg expects ISO strings for timestamptz casts.
  const fromIso = from ? new Date(from).toISOString() : null;
  const toIso = to ? new Date(to).toISOString() : null;

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
    [campaignId, beneficiaryId, shopId, managerId, fromIso, toIso, limit, offset]
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
    [campaignId, beneficiaryId, shopId, managerId, fromIso, toIso]
  );

  return res.status(200).json({
    filters: {
      campaign_id: campaignId,
      beneficiary_id: beneficiaryId,
      shop_id: shopId,
      shop_manager_id: managerId,
      from: fromIso,
      to: toIso,
    },
    pagination: {limit, offset, total: countRows[0].total},
    transactions: rows,
  });
}

export async function reportCampaigns(_req, res) {
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
}
