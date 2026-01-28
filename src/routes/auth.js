import express from "express";
import db from "../db.js";

const router = express.Router();

// Create new user account
router.post("/signup", async (req, res) => {
  try {
    // Read user data from request body
    const { full_name, email, phone, password, role } = req.body;

    // Check if email already exists
    const exists = await db.query(
      "SELECT user_id FROM users WHERE email = $1",
      [email]
    );

    // Stop if user already exists
    if (exists.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Insert new user into database
    const result = await db.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, full_name, email, phone, role, photo_url, created_at`,
      [full_name, email, phone || null, password, role || "user"]
    );

    // Send created user back to client
    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    // Handle server errors
    console.error("Signup error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Login existing user
router.post("/login", async (req, res) => {
  try {
    // Read login credentials
    const { email, password } = req.body;

    // Find matching user
    const result = await db.query(
      `SELECT user_id, full_name, email, phone, role, photo_url, created_at
       FROM users
       WHERE email = $1 AND password_hash = $2`,
      [email, password]
    );

    // Invalid email or password
    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Send logged-in user data
    res.json({ user: result.rows[0] });
  } catch (err) {
    // Handle server errors
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;