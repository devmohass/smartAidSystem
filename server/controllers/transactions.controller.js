import pool from "../db.js";

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
    return res.status(201).json({
      transaction,
      receipt: receiptRows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("processTransaction error:", err);
    return res.status(500).json({error: "Internal server error"});
  } finally {
    client.release();
  }
}

export async function listTransactions(_req, res) {
  try {
    const {rows} = await pool.query(
      `SELECT t.id, t.campaign_id, t.beneficiary_id, t.shop_id, t.shop_manager_id,
              t.amount, t.goods_description, t.balance_before, t.balance_after,
              t.status, t.transaction_at,
              r.receipt_code, r.issued_at AS receipt_issued_at
       FROM transactions t
       LEFT JOIN receipts r ON r.transaction_id = t.id
       ORDER BY t.id DESC`
    );
    return res.status(200).json({transactions: rows});
  } catch (err) {
    console.error("listTransactions error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
}

export async function getTransaction(req, res) {
  const {id} = req.params;

  try {
    const {rows} = await pool.query(
      `SELECT t.id, t.campaign_id, t.beneficiary_id, t.shop_id, t.shop_manager_id,
              t.amount, t.goods_description, t.balance_before, t.balance_after,
              t.status, t.transaction_at,
              r.receipt_code, r.issued_at AS receipt_issued_at
       FROM transactions t
       LEFT JOIN receipts r ON r.transaction_id = t.id
       WHERE t.id = $1`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({error: "Transaction not found"});
    return res.status(200).json({transaction: rows[0]});
  } catch (err) {
    console.error("getTransaction error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
}
