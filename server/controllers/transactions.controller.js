import pool from "../db.js";
import {ok} from "../utils/respond.js";

function formatDateYYYYMMDD(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export async function processTransaction(req, res) {
  const {
    campaign_id: campaignId,
    beneficiary_id: benId,
    shop_id: shopId,
    amount: txnAmount,
    goods_description,
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {rows: campaignRows} = await client.query(
      "SELECT id, status FROM campaigns WHERE id = $1 FOR UPDATE",
      [campaignId]
    );
    const campaign = campaignRows[0];
    if (!campaign) {
      await client.query("ROLLBACK");
      return res.status(404).json({error: "Campaign not found"});
    }
    if (campaign.status !== "active") {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: `Cannot process: campaign is '${campaign.status}'. Only 'active' campaigns accept transactions.`,
      });
    }

    // A soft-deleted beneficiary or shop must not accept new redemptions, even
    // if an old enrollment/manager link still exists.
    const benActive = await client.query(
      "SELECT 1 FROM beneficiaries WHERE id = $1 AND deleted_at IS NULL",
      [benId]
    );
    if (benActive.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({error: "Beneficiary not found"});
    }
    const shopActive = await client.query(
      "SELECT 1 FROM shops WHERE id = $1 AND deleted_at IS NULL",
      [shopId]
    );
    if (shopActive.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({error: "Shop not found"});
    }

    const {rows: enrollRows} = await client.query(
      `SELECT id, remaining_balance FROM campaign_beneficiaries
       WHERE campaign_id = $1 AND beneficiary_id = $2 FOR UPDATE`,
      [campaignId, benId]
    );
    const enrollment = enrollRows[0];
    if (!enrollment) {
      await client.query("ROLLBACK");
      return res.status(409).json({error: "Beneficiary is not enrolled in this campaign"});
    }

    const balanceBefore = Number(enrollment.remaining_balance);
    if (txnAmount > balanceBefore) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "Insufficient balance",
        details: {remaining_balance: balanceBefore, requested: txnAmount},
      });
    }
    const balanceAfter = balanceBefore - txnAmount;

    const {rows: linkRows} = await client.query(
      "SELECT id FROM shop_managers WHERE user_id = $1 AND shop_id = $2",
      [req.user.id, shopId]
    );
    if (linkRows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({error: "You are not assigned to this shop"});
    }

    await client.query(
      "UPDATE campaign_beneficiaries SET remaining_balance = $1 WHERE id = $2",
      [balanceAfter, enrollment.id]
    );

    const {rows: txnRows} = await client.query(
      `INSERT INTO transactions
         (campaign_id, beneficiary_id, shop_id, shop_manager_id, amount,
          goods_description, balance_before, balance_after)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, campaign_id, beneficiary_id, shop_id, shop_manager_id,
                 amount, goods_description, balance_before, balance_after,
                 status, transaction_at`,
      [campaignId, benId, shopId, req.user.id, txnAmount,
       goods_description ?? null, balanceBefore, balanceAfter]
    );
    const transaction = txnRows[0];

    const dateStr = formatDateYYYYMMDD(new Date(transaction.transaction_at));
    const lockKey = Number(dateStr);
    await client.query("SELECT pg_advisory_xact_lock($1)", [lockKey]);

    const {rows: countRows} = await client.query(
      "SELECT COUNT(*)::int AS count FROM receipts WHERE receipt_code LIKE $1",
      [`RCP-${dateStr}-%`]
    );
    const nextSeq = countRows[0].count + 1;
    const receiptCode = `RCP-${dateStr}-${String(nextSeq).padStart(4, "0")}`;

    const {rows: receiptRows} = await client.query(
      `INSERT INTO receipts (transaction_id, receipt_code)
       VALUES ($1, $2)
       RETURNING id, transaction_id, receipt_code, issued_at`,
      [transaction.id, receiptCode]
    );

    await client.query("COMMIT");
    return ok(res, {transaction, receipt: receiptRows[0]}, 201);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// The name joins deliberately omit the `deleted_at IS NULL` filter: a
// transaction is an immutable audit record, so it must keep showing the
// beneficiary/shop name even after that beneficiary or shop is soft-deleted.
const TXN_SELECT = `
  t.id, t.campaign_id, t.beneficiary_id, t.shop_id, t.shop_manager_id,
  t.amount, t.goods_description, t.balance_before, t.balance_after,
  t.status, t.transaction_at,
  r.receipt_code, r.issued_at AS receipt_issued_at,
  b.name  AS beneficiary_name,
  s.name  AS shop_name,
  c.title AS campaign_title
  FROM transactions t
  LEFT JOIN receipts r      ON r.transaction_id = t.id
  LEFT JOIN beneficiaries b ON b.id = t.beneficiary_id
  LEFT JOIN shops s         ON s.id = t.shop_id
  LEFT JOIN campaigns c     ON c.id = t.campaign_id`;

export async function listTransactions(req, res) {
  const {
    campaign_id: campaignId = null,
    shop_id: shopId = null,
    status = null,
    q = null,
    limit,
    offset,
  } = req.query;
  const search = q ? `%${q}%` : null;

  // Same predicate for the page and the count. b/r are joined so search can hit
  // beneficiary name and receipt code.
  const where = `
    WHERE ($1::int  IS NULL OR t.campaign_id = $1)
      AND ($2::int  IS NULL OR t.shop_id = $2)
      AND ($3::text IS NULL OR t.status = $3)
      AND ($4::text IS NULL OR b.name ILIKE $4 OR r.receipt_code ILIKE $4)`;

  const {rows} = await pool.query(
    `SELECT ${TXN_SELECT} ${where} ORDER BY t.id DESC LIMIT $5 OFFSET $6`,
    [campaignId, shopId, status, search, limit, offset]
  );
  // total + filtered sum so the screen's stat cards reflect the whole result
  // set, not just the current page.
  const {rows: aggRows} = await pool.query(
    `SELECT COUNT(*)::int AS total, COALESCE(SUM(t.amount), 0)::float AS total_amount
     FROM transactions t
     LEFT JOIN receipts r      ON r.transaction_id = t.id
     LEFT JOIN beneficiaries b ON b.id = t.beneficiary_id
     ${where}`,
    [campaignId, shopId, status, search]
  );

  return res.status(200).json({
    data: rows,
    pagination: {limit, offset, total: aggRows[0].total},
    summary: {total_amount: aggRows[0].total_amount},
    filters: {campaign_id: campaignId, shop_id: shopId, status, q},
  });
}

export async function getTransaction(req, res) {
  const {id} = req.params;
  const {rows} = await pool.query(`SELECT ${TXN_SELECT} WHERE t.id = $1`, [id]);
  if (!rows[0]) return res.status(404).json({error: "Transaction not found"});
  return ok(res, rows[0]);
}
