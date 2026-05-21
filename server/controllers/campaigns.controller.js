import pool from "../db.js";

const SELECT_FIELDS = `id, title, location, start_date, end_date, budget,
                       status, created_by, created_at`;

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseDate(value) {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseBudget(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export async function listCampaigns(req, res) {
  try {
    const {rows} = await pool.query(
      `SELECT ${SELECT_FIELDS} FROM campaigns ORDER BY id ASC`
    );
    return res.status(200).json({campaigns: rows});
  } catch (err) {
    console.error("listCampaigns error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
}

export async function getCampaign(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({error: "Invalid campaign id"});

  try {
    const {rows} = await pool.query(
      `SELECT ${SELECT_FIELDS} FROM campaigns WHERE id = $1`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({error: "Campaign not found"});
    return res.status(200).json({campaign: rows[0]});
  } catch (err) {
    console.error("getCampaign error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
}

export async function createCampaign(req, res) {
  const {title, location, start_date, end_date, budget} = req.body || {};

  if (!title || typeof title !== "string" || title.trim() === "") {
    return res.status(400).json({error: "title is required"});
  }
  const start = parseDate(start_date);
  const end = parseDate(end_date);
  if (!start) return res.status(400).json({error: "start_date is required and must be a valid date"});
  if (!end) return res.status(400).json({error: "end_date is required and must be a valid date"});
  if (end < start) return res.status(400).json({error: "end_date must be on or after start_date"});

  const budgetValue = parseBudget(budget);
  if (budgetValue === null) {
    return res.status(400).json({error: "budget is required and must be a positive number"});
  }

  try {
    const {rows} = await pool.query(
      `INSERT INTO campaigns (title, location, start_date, end_date, budget, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${SELECT_FIELDS}`,
      [title.trim(), location ?? null, start_date, end_date, budgetValue, req.user.id]
    );
    return res.status(201).json({campaign: rows[0]});
  } catch (err) {
    console.error("createCampaign error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
}

async function activateCampaign(client, campaign) {
  const {rows: accountRows} = await client.query(
    "SELECT id, balance FROM ngo_accounts WHERE user_id = $1 FOR UPDATE",
    [campaign.created_by]
  );
  const account = accountRows[0];
  if (!account) {
    throw {http: 409, message: "Campaign creator has no NGO virtual account"};
  }

  const balance = Number(account.balance);
  const budget = Number(campaign.budget);

  if (balance < budget) {
    throw {
      http: 409,
      message: "Insufficient NGO account balance to activate campaign",
      details: {ngo_balance: balance, campaign_budget: budget},
    };
  }

  await client.query(
    "UPDATE ngo_accounts SET balance = balance - $1, updated_at = NOW() WHERE id = $2",
    [budget, account.id]
  );

  await client.query(
    `INSERT INTO ngo_account_transactions (ngo_account_id, type, amount, reference_id, note)
     VALUES ($1, 'campaign_fund', $2, $3, $4)`,
    [account.id, budget, campaign.id, `Funded campaign #${campaign.id} (${campaign.title})`]
  );

  const {rows} = await client.query(
    `UPDATE campaigns SET status = 'active' WHERE id = $1
     RETURNING ${SELECT_FIELDS}`,
    [campaign.id]
  );

  return {campaign: rows[0], deducted: budget, ngo_account_id: account.id};
}

async function closeCampaign(client, campaign) {
  const {rows: sumRows} = await client.query(
    `SELECT COALESCE(SUM(remaining_balance), 0) AS total
     FROM campaign_beneficiaries WHERE campaign_id = $1`,
    [campaign.id]
  );
  const refund = Number(sumRows[0].total);

  await client.query(
    "UPDATE campaign_beneficiaries SET remaining_balance = 0 WHERE campaign_id = $1",
    [campaign.id]
  );

  let ngoAccountId = null;
  if (refund > 0) {
    const {rows: accountRows} = await client.query(
      "SELECT id FROM ngo_accounts WHERE user_id = $1 FOR UPDATE",
      [campaign.created_by]
    );
    const account = accountRows[0];
    if (!account) {
      throw {http: 409, message: "Campaign creator has no NGO virtual account to refund into"};
    }
    ngoAccountId = account.id;

    await client.query(
      "UPDATE ngo_accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2",
      [refund, account.id]
    );
    await client.query(
      `INSERT INTO ngo_account_transactions (ngo_account_id, type, amount, reference_id, note)
       VALUES ($1, 'campaign_refund', $2, $3, $4)`,
      [account.id, refund, campaign.id, `Closed campaign #${campaign.id} (${campaign.title})`]
    );
  }

  const {rows} = await client.query(
    `UPDATE campaigns SET status = 'closed' WHERE id = $1
     RETURNING ${SELECT_FIELDS}`,
    [campaign.id]
  );

  return {campaign: rows[0], refunded: refund, ngo_account_id: ngoAccountId};
}

export async function getCampaignSummary(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({error: "Invalid campaign id"});

  try {
    const {rows: campaignRows} = await pool.query(
      `SELECT id, title, location, start_date, end_date, budget, status, created_by, created_at
       FROM campaigns WHERE id = $1`,
      [id]
    );
    const campaign = campaignRows[0];
    if (!campaign) return res.status(404).json({error: "Campaign not found"});

    const {rows: enrollRows} = await pool.query(
      `SELECT COALESCE(SUM(allocated_balance), 0)::float AS total_allocated,
              COALESCE(SUM(remaining_balance), 0)::float AS total_remaining_in_wallets,
              COUNT(*)::int AS beneficiary_count
       FROM campaign_beneficiaries WHERE campaign_id = $1`,
      [id]
    );
    const {rows: txnRows} = await pool.query(
      `SELECT COUNT(*)::int AS transaction_count,
              COALESCE(SUM(amount), 0)::float AS total_spent
       FROM transactions WHERE campaign_id = $1`,
      [id]
    );

    const budget = Number(campaign.budget);
    const totalAllocated = enrollRows[0].total_allocated;

    return res.status(200).json({
      summary: {
        campaign,
        beneficiary_count: enrollRows[0].beneficiary_count,
        total_allocated: totalAllocated,
        unallocated_budget: budget - totalAllocated,
        total_spent: txnRows[0].total_spent,
        total_remaining_in_wallets: enrollRows[0].total_remaining_in_wallets,
        transaction_count: txnRows[0].transaction_count,
      },
    });
  } catch (err) {
    console.error("getCampaignSummary error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
}

export async function changeCampaignStatus(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({error: "Invalid campaign id"});

  const {status: target} = req.body || {};
  if (target !== "active" && target !== "closed") {
    return res.status(400).json({error: "status must be 'active' or 'closed'"});
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {rows: lockRows} = await client.query(
      `SELECT ${SELECT_FIELDS} FROM campaigns WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const campaign = lockRows[0];
    if (!campaign) {
      await client.query("ROLLBACK");
      return res.status(404).json({error: "Campaign not found"});
    }

    let result;
    if (target === "active") {
      if (campaign.status !== "draft") {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: `Cannot activate: campaign is '${campaign.status}'. Only 'draft' campaigns can be activated.`,
        });
      }
      result = await activateCampaign(client, campaign);
    } else {
      if (campaign.status !== "active") {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: `Cannot close: campaign is '${campaign.status}'. Only 'active' campaigns can be closed.`,
        });
      }
      result = await closeCampaign(client, campaign);
    }

    await client.query("COMMIT");
    return res.status(200).json(result);
  } catch (err) {
    await client.query("ROLLBACK");
    if (err && err.http) {
      return res.status(err.http).json({error: err.message, ...(err.details ? {details: err.details} : {})});
    }
    console.error("changeCampaignStatus error:", err);
    return res.status(500).json({error: "Internal server error"});
  } finally {
    client.release();
  }
}
