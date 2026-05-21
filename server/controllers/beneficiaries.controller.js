import {randomUUID} from "crypto";
import pool from "../db.js";

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validateFamilySize(value) {
  if (value === undefined || value === null) return {ok: true, value: null};
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    return {ok: false, error: "family_size must be a positive integer"};
  }
  return {ok: true, value: n};
}

const SELECT_FIELDS = `id, name, phone_number, qr_code, profile_image_url,
                       family_size, location, created_by, created_at`;

export async function listBeneficiaries(req, res) {
  try {
    const {rows} = await pool.query(
      `SELECT ${SELECT_FIELDS} FROM beneficiaries ORDER BY id ASC`
    );
    return res.status(200).json({beneficiaries: rows});
  } catch (err) {
    console.error("listBeneficiaries error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
}

export async function searchBeneficiary(req, res) {
  const phone = typeof req.query.phone === "string" ? req.query.phone.trim() : null;
  const qrCode = typeof req.query.qr_code === "string" ? req.query.qr_code.trim() : null;

  if (!phone && !qrCode) {
    return res.status(400).json({error: "Provide ?phone= or ?qr_code="});
  }
  if (phone && qrCode) {
    return res.status(400).json({error: "Provide only one of ?phone= or ?qr_code="});
  }

  try {
    const {rows} = phone
      ? await pool.query(`SELECT ${SELECT_FIELDS} FROM beneficiaries WHERE phone_number = $1`, [phone])
      : await pool.query(`SELECT ${SELECT_FIELDS} FROM beneficiaries WHERE qr_code = $1`, [qrCode]);

    if (!rows[0]) return res.status(404).json({error: "Beneficiary not found"});
    return res.status(200).json({beneficiary: rows[0]});
  } catch (err) {
    console.error("searchBeneficiary error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
}

export async function getBeneficiary(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({error: "Invalid beneficiary id"});

  try {
    const {rows} = await pool.query(
      `SELECT ${SELECT_FIELDS} FROM beneficiaries WHERE id = $1`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({error: "Beneficiary not found"});
    return res.status(200).json({beneficiary: rows[0]});
  } catch (err) {
    console.error("getBeneficiary error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
}

export async function createBeneficiary(req, res) {
  const {name, phone_number, profile_image_url, family_size, location} = req.body || {};

  if (!name || typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({error: "name is required"});
  }
  if (!phone_number || typeof phone_number !== "string" || phone_number.trim() === "") {
    return res.status(400).json({error: "phone_number is required"});
  }

  const familySizeCheck = validateFamilySize(family_size);
  if (!familySizeCheck.ok) {
    return res.status(400).json({error: familySizeCheck.error});
  }

  const qr_code = randomUUID();

  try {
    const {rows} = await pool.query(
      `INSERT INTO beneficiaries
         (name, phone_number, qr_code, profile_image_url, family_size, location, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${SELECT_FIELDS}`,
      [
        name.trim(),
        phone_number.trim(),
        qr_code,
        profile_image_url ?? null,
        familySizeCheck.value,
        location ?? null,
        req.user.id,
      ]
    );
    return res.status(201).json({beneficiary: rows[0]});
  } catch (err) {
    if (err.code === "23505") {
      // unique violation — could be phone_number or qr_code (qr_code collision is astronomically rare)
      const field = err.constraint?.includes("phone") ? "phone_number" : "qr_code";
      return res.status(409).json({error: `${field} already in use`});
    }
    console.error("createBeneficiary error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
}

export async function updateBeneficiary(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({error: "Invalid beneficiary id"});

  const {name, phone_number, profile_image_url, family_size, location} = req.body || {};

  if (
    name === undefined &&
    phone_number === undefined &&
    profile_image_url === undefined &&
    family_size === undefined &&
    location === undefined
  ) {
    return res.status(400).json({
      error: "Provide at least one field (name, phone_number, profile_image_url, family_size, location)",
    });
  }
  if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
    return res.status(400).json({error: "name must be a non-empty string"});
  }
  if (phone_number !== undefined && (typeof phone_number !== "string" || phone_number.trim() === "")) {
    return res.status(400).json({error: "phone_number must be a non-empty string"});
  }
  let familySizeValue;
  if (family_size !== undefined) {
    const check = validateFamilySize(family_size);
    if (!check.ok) return res.status(400).json({error: check.error});
    familySizeValue = check.value;
  }

  const fields = [];
  const values = [];
  let i = 1;
  if (name !== undefined) {
    fields.push(`name = $${i++}`);
    values.push(name.trim());
  }
  if (phone_number !== undefined) {
    fields.push(`phone_number = $${i++}`);
    values.push(phone_number.trim());
  }
  if (profile_image_url !== undefined) {
    fields.push(`profile_image_url = $${i++}`);
    values.push(profile_image_url);
  }
  if (family_size !== undefined) {
    fields.push(`family_size = $${i++}`);
    values.push(familySizeValue);
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
    return res.status(200).json({beneficiary: rows[0]});
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({error: "phone_number already in use"});
    }
    console.error("updateBeneficiary error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
}
