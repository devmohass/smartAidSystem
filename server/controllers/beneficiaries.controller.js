import {randomUUID} from "crypto";
import pool from "../db.js";
import {ok} from "../utils/respond.js";

const SELECT_FIELDS = `id, name, phone_number, qr_code, profile_image_url,
                       family_size, location, created_by, created_at`;

export async function listBeneficiaries(_req, res) {
  const {rows} = await pool.query(
    `SELECT ${SELECT_FIELDS} FROM beneficiaries ORDER BY id ASC`
  );
  return ok(res, rows);
}

export async function searchBeneficiary(req, res) {
  const {phone, qr_code: qrCode} = req.query;

  const {rows} = phone
    ? await pool.query(
        `SELECT ${SELECT_FIELDS} FROM beneficiaries WHERE phone_number = $1`,
        [phone]
      )
    : await pool.query(
        `SELECT ${SELECT_FIELDS} FROM beneficiaries WHERE qr_code = $1`,
        [qrCode]
      );

  if (!rows[0]) return res.status(404).json({error: "Beneficiary not found"});
  return ok(res, rows[0]);
}

export async function getBeneficiary(req, res) {
  const {id} = req.params;
  const {rows} = await pool.query(
    `SELECT ${SELECT_FIELDS} FROM beneficiaries WHERE id = $1`,
    [id]
  );
  if (!rows[0]) return res.status(404).json({error: "Beneficiary not found"});
  return ok(res, rows[0]);
}

export async function createBeneficiary(req, res) {
  const {name, phone_number, profile_image_url, family_size, location} = req.body;
  const qr_code = randomUUID();

  try {
    const {rows} = await pool.query(
      `INSERT INTO beneficiaries
         (name, phone_number, qr_code, profile_image_url, family_size, location, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${SELECT_FIELDS}`,
      [
        name,
        phone_number,
        qr_code,
        profile_image_url ?? null,
        family_size ?? null,
        location ?? null,
        req.user.id,
      ]
    );
    return ok(res, rows[0], 201);
  } catch (err) {
    if (err.code === "23505") {
      const field = err.constraint?.includes("phone") ? "phone_number" : "qr_code";
      return res.status(409).json({error: `${field} already in use`});
    }
    throw err;
  }
}

export async function updateBeneficiary(req, res) {
  const {id} = req.params;
  const {name, phone_number, profile_image_url, family_size, location} = req.body;

  const fields = [];
  const values = [];
  let i = 1;
  if (name !== undefined) {
    fields.push(`name = $${i++}`);
    values.push(name);
  }
  if (phone_number !== undefined) {
    fields.push(`phone_number = $${i++}`);
    values.push(phone_number);
  }
  if (profile_image_url !== undefined) {
    fields.push(`profile_image_url = $${i++}`);
    values.push(profile_image_url);
  }
  if (family_size !== undefined) {
    fields.push(`family_size = $${i++}`);
    values.push(family_size);
  }
  if (location !== undefined) {
    fields.push(`location = $${i++}`);
    values.push(location);
  }
  values.push(id);

  try {
    const {rows} = await pool.query(
      `UPDATE beneficiaries SET ${fields.join(", ")} WHERE id = $${i}
       RETURNING ${SELECT_FIELDS}`,
      values
    );
    if (!rows[0]) return res.status(404).json({error: "Beneficiary not found"});
    return ok(res, rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({error: "phone_number already in use"});
    }
    throw err;
  }
}
