import pool from "../db.js";

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseAmount(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function enrollBeneficiary(req, res) {
  const campaignId = parseId(req.params.id);
  if (!campaignId) return res.status(400).json({error: "Invalid campaign id"});

  const {beneficiary_id, allocated_balance} = req.body || {};
  const benId = parseId(beneficiary_id);
  if (!benId) return res.status(400).json({error: "beneficiary_id is required and must be a positive integer"});

  const amount = parseAmount(allocated_balance);
  if (amount === null) {
    return res.status(400).json({error: "allocated_balance must be a positive number"});
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {rows: campaignRows} = await client.query(
      "SELECT id, status, budget FROM campaigns WHERE id = $1 FOR UPDATE",
      [campaignId]
    );
    const campaign = campaignRows[0];
    if (!campaign) {
      await client.query("ROLLBACK");
      return res.status(404).json({error: "Campaign not found"});
    }
    if (campaign.status === "closed") {
      await client.query("ROLLBACK");
      return res.status(409).json({error: "Cannot enroll into a closed campaign"});
    }

    const benCheck = await client.query("SELECT id FROM beneficiaries WHERE id = $1", [benId]);
    if (benCheck.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({error: "Beneficiary not found"});
    }

    const existing = await client.query(
      "SELECT id FROM campaign_beneficiaries WHERE campaign_id = $1 AND beneficiary_id = $2",
      [campaignId, benId]
    );
    if (existing.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({error: "Beneficiary is already enrolled in this campaign"});
    }

    const {rows: sumRows} = await client.query(
      "SELECT COALESCE(SUM(allocated_balance), 0) AS total FROM campaign_beneficiaries WHERE campaign_id = $1",
      [campaignId]
    );
    const allocated = Number(sumRows[0].total);
    const budget = Number(campaign.budget);
    if (allocated + amount > budget) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "Allocation exceeds campaign budget",
        details: {
          campaign_budget: budget,
          already_allocated: allocated,
          requested: amount,
          available: budget - allocated,
        },
      });
    }

    const {rows} = await client.query(
      `INSERT INTO campaign_beneficiaries
         (campaign_id, beneficiary_id, allocated_balance, remaining_balance)
       VALUES ($1, $2, $3, $3)
       RETURNING id, campaign_id, beneficiary_id, allocated_balance, remaining_balance, enrolled_at`,
      [campaignId, benId, amount]
    );

    await client.query("COMMIT");
    return res.status(201).json({enrollment: rows[0]});
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      return res.status(409).json({error: "Beneficiary is already enrolled in this campaign"});
    }
    console.error("enrollBeneficiary error:", err);
    return res.status(500).json({error: "Internal server error"});
  } finally {
    client.release();
  }
}

export async function listEnrollments(req, res) {
  const campaignId = parseId(req.params.id);
  if (!campaignId) return res.status(400).json({error: "Invalid campaign id"});

  try {
    const campaignCheck = await pool.query("SELECT 1 FROM campaigns WHERE id = $1", [campaignId]);
    if (campaignCheck.rowCount === 0) {
      return res.status(404).json({error: "Campaign not found"});
    }

    const {rows} = await pool.query(
      `SELECT cb.id, cb.campaign_id, cb.beneficiary_id,
              cb.allocated_balance, cb.remaining_balance, cb.enrolled_at,
              b.name AS beneficiary_name, b.phone_number, b.qr_code
       FROM campaign_beneficiaries cb
       JOIN beneficiaries b ON b.id = cb.beneficiary_id
       WHERE cb.campaign_id = $1
       ORDER BY cb.id ASC`,
      [campaignId]
    );
    return res.status(200).json({enrollments: rows});
  } catch (err) {
    console.error("listEnrollments error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
}

export async function updateAllocation(req, res) {
  const campaignId = parseId(req.params.id);
  const benId = parseId(req.params.bid);
  if (!campaignId || !benId) return res.status(400).json({error: "Invalid id"});

  const {allocated_balance} = req.body || {};
  const newAllocated = parseAmount(allocated_balance);
  if (newAllocated === null) {
    return res.status(400).json({error: "allocated_balance must be a positive number"});
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {rows: campaignRows} = await client.query(
      "SELECT id, status, budget FROM campaigns WHERE id = $1 FOR UPDATE",
      [campaignId]
    );
    const campaign = campaignRows[0];
    if (!campaign) {
      await client.query("ROLLBACK");
      return res.status(404).json({error: "Campaign not found"});
    }
    if (campaign.status === "closed") {
      await client.query("ROLLBACK");
      return res.status(409).json({error: "Cannot modify allocations on a closed campaign"});
    }

    const {rows: enrollRows} = await client.query(
      `SELECT id, allocated_balance, remaining_balance
       FROM campaign_beneficiaries
       WHERE campaign_id = $1 AND beneficiary_id = $2 FOR UPDATE`,
      [campaignId, benId]
    );
    const enrollment = enrollRows[0];
    if (!enrollment) {
      await client.query("ROLLBACK");
      return res.status(404).json({error: "Enrollment not found"});
    }

    const oldAllocated = Number(enrollment.allocated_balance);
    const oldRemaining = Number(enrollment.remaining_balance);
    const spent = oldAllocated - oldRemaining;
    const newRemaining = newAllocated - spent;

    if (newRemaining < 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "New allocation is less than amount already spent by this beneficiary",
        details: {spent, requested: newAllocated},
      });
    }

    const {rows: sumRows} = await client.query(
      `SELECT COALESCE(SUM(allocated_balance), 0) AS total
       FROM campaign_beneficiaries
       WHERE campaign_id = $1 AND beneficiary_id != $2`,
      [campaignId, benId]
    );
    const others = Number(sumRows[0].total);
    const budget = Number(campaign.budget);
    if (others + newAllocated > budget) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "Allocation exceeds campaign budget",
        details: {
          campaign_budget: budget,
          allocated_to_others: others,
          requested: newAllocated,
          available: budget - others,
        },
      });
    }

    const {rows} = await client.query(
      `UPDATE campaign_beneficiaries
       SET allocated_balance = $1, remaining_balance = $2
       WHERE id = $3
       RETURNING id, campaign_id, beneficiary_id, allocated_balance, remaining_balance, enrolled_at`,
      [newAllocated, newRemaining, enrollment.id]
    );

    await client.query("COMMIT");
    return res.status(200).json({enrollment: rows[0]});
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("updateAllocation error:", err);
    return res.status(500).json({error: "Internal server error"});
  } finally {
    client.release();
  }
}
