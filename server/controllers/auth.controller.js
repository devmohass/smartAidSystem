import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db.js";

const JWT_EXPIRES_IN = "24h";

export async function login(req, res) {
  const {email, password} = req.body || {};

  if (!email || !password) {
    return res.status(400).json({error: "email and password are required"});
  }

  const {rows} = await pool.query(
    "SELECT id, name, email, role, password_hash FROM users WHERE email = $1",
    [email]
  );
  const user = rows[0];

  if (!user) {
    return res.status(401).json({error: "Invalid credentials"});
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({error: "Invalid credentials"});
  }

  const token = jwt.sign(
    {sub: user.id, role: user.role, email: user.email},
    process.env.JWT_SECRET,
    {expiresIn: JWT_EXPIRES_IN}
  );

  return res.status(200).json({
    token,
    user: {id: user.id, name: user.name, email: user.email, role: user.role},
  });
}

export async function me(req, res) {
  const {rows} = await pool.query(
    "SELECT id, name, email, role, created_at FROM users WHERE id = $1",
    [req.user.id]
  );
  const user = rows[0];
  if (!user) return res.status(404).json({error: "User not found"});
  return res.status(200).json({user});
}
