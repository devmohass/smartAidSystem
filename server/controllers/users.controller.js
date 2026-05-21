import bcrypt from "bcrypt";
import pool from "../db.js";

const ALLOWED_ROLES = ["admin", "shop_manager", "donor"];
const BCRYPT_ROUNDS = 10;

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function listUsers(req, res) {
  try {
    const {rows} = await pool.query(
      "SELECT id, name, email, role, created_at FROM users ORDER BY id ASC"
    );
    return res.status(200).json({users: rows});
  } catch (err) {
    console.error("listUsers error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
}

export async function getUser(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({error: "Invalid user id"});
  }

  try {
    const {rows} = await pool.query(
      "SELECT id, name, email, role, created_at FROM users WHERE id = $1",
      [id]
    );
    if (!rows[0]) return res.status(404).json({error: "User not found"});
    return res.status(200).json({user: rows[0]});
  } catch (err) {
    console.error("getUser error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
}

export async function createUser(req, res) {
  const {name, email, password, role} = req.body || {};

  if (!name || !email || !password || !role) {
    return res.status(400).json({error: "name, email, password and role are required"});
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({error: "Invalid email format"});
  }
  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({error: `role must be one of: ${ALLOWED_ROLES.join(", ")}`});
  }
  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({error: "password must be at least 6 characters"});
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const {rows} = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name, email, password_hash, role]
    );
    const user = rows[0];

    if (role === "admin") {
      await client.query(
        "INSERT INTO ngo_accounts (user_id, balance) VALUES ($1, 0)",
        [user.id]
      );
    }

    await client.query("COMMIT");
    return res.status(201).json({user});
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      return res.status(409).json({error: "Email already in use"});
    }
    console.error("createUser error:", err);
    return res.status(500).json({error: "Internal server error"});
  } finally {
    client.release();
  }
}

export async function updateUser(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({error: "Invalid user id"});
  }

  const {name, email} = req.body || {};

  if (name === undefined && email === undefined) {
    return res.status(400).json({error: "Provide at least one field to update (name, email)"});
  }
  if (email !== undefined && !isValidEmail(email)) {
    return res.status(400).json({error: "Invalid email format"});
  }
  if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
    return res.status(400).json({error: "name must be a non-empty string"});
  }

  const fields = [];
  const values = [];
  let i = 1;
  if (name !== undefined) {
    fields.push(`name = $${i++}`);
    values.push(name);
  }
  if (email !== undefined) {
    fields.push(`email = $${i++}`);
    values.push(email);
  }
  values.push(id);

  try {
    const {rows} = await pool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${i}
       RETURNING id, name, email, role, created_at`,
      values
    );
    if (!rows[0]) return res.status(404).json({error: "User not found"});
    return res.status(200).json({user: rows[0]});
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({error: "Email already in use"});
    }
    console.error("updateUser error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
}

export async function deleteUser(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({error: "Invalid user id"});
  }

  if (req.user && req.user.id === id) {
    return res.status(400).json({error: "You cannot delete your own account"});
  }

  try {
    const result = await pool.query("DELETE FROM users WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({error: "User not found"});
    }
    return res.status(204).send();
  } catch (err) {
    if (err.code === "23503") {
      return res.status(409).json({
        error: "Cannot delete user: they have related records (transactions, campaigns, etc.)",
      });
    }
    console.error("deleteUser error:", err);
    return res.status(500).json({error: "Internal server error"});
  }
}
