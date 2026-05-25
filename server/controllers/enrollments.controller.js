import pool from "../db.js";
import {ok} from "../utils/respond.js";

export async function enrollBeneficiary(req, res) {
  const {id: campaignId} = req.params;
  const {beneficiary_id: benId, allocated_balance: amount} = req.body;

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

    const benCheck = await client.query(
      "SELECT id FROM beneficiaries WHERE id = $1 AND deleted_at IS NULL",
      [benId]
    );
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
    return ok(res, rows[0], 201);
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      return res.status(409).json({error: "Beneficiary is already enrolled in this campaign"});
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function listEnrollments(req, res) {
  const {id: campaignId} = req.params;

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
  return ok(res, rows);
}

export async function updateAllocation(req, res) {
  const {id: campaignId, bid: benId} = req.params;
  const {allocated_balance: newAllocated} = req.body;

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
    return ok(res, rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
