import express from "express";
import db from "../db.js";

const router = express.Router();


router.post("/signup", async (req, res) => {
  try {
    const { full_name, email, phone, password, role } = req.body;

    const exists = await db.query("SELECT user_id FROM users WHERE email = $1", [email]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const result = await db.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, full_name, email, phone, role, photo_url, created_at`,
      [full_name, email, phone || null, password, role || "user"]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await db.query(
      `SELECT user_id, full_name, email, phone, role, photo_url, created_at
       FROM users
       WHERE email = $1 AND password_hash = $2`,
      [email, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;