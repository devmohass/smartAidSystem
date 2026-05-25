import bcrypt from "bcrypt";
import pool from "../db.js";
import {ok} from "../utils/respond.js";

const BCRYPT_ROUNDS = 10;

export async function listUsers(_req, res) {
  const {rows} = await pool.query(
    "SELECT id, name, email, role, created_at FROM users WHERE deleted_at IS NULL ORDER BY id ASC"
  );
  return ok(res, rows);
}

export async function getUser(req, res) {
  const {id} = req.params;
  const {rows} = await pool.query(
    "SELECT id, name, email, role, created_at FROM users WHERE id = $1 AND deleted_at IS NULL",
    [id]
  );
  if (!rows[0]) return res.status(404).json({error: "User not found"});
  return ok(res, rows[0]);
}

export async function createUser(req, res) {
  const {name, email, password, role} = req.body;

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
    return ok(res, user, 201);
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      return res.status(409).json({error: "Email already in use"});
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function updateUser(req, res) {
  const {id} = req.params;
  const {name, email} = req.body;

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
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${i} AND deleted_at IS NULL
       RETURNING id, name, email, role, created_at`,
      values
    );
    if (!rows[0]) return res.status(404).json({error: "User not found"});
    return ok(res, rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({error: "Email already in use"});
    }
    throw err;
  }
}

export async function deleteUser(req, res) {
  const {id} = req.params;

  if (req.user && req.user.id === id) {
    return res.status(400).json({error: "You cannot delete your own account"});
  }

  // Soft delete: retain the user (and everything they authored) for audit.
  const result = await pool.query(
    "UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
    [id]
  );
  if (result.rowCount === 0) {
    return res.status(404).json({error: "User not found"});
  }
  return res.status(204).send();
}
