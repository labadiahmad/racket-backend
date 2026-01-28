import express from "express";
import db from "../db.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

// get current user profile
router.get("/me", userAuth, async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];

    const result = await db.query(
      `SELECT user_id, full_name, email, phone, photo_url, role, created_at
       FROM users
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// update current user profile
router.put("/me", userAuth, async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const { full_name, email, phone, photo_url } = req.body;

    const result = await db.query(
      `UPDATE users
       SET
         full_name = COALESCE($1, full_name),
         email     = COALESCE($2, email),
         phone     = COALESCE($3, phone),
         photo_url = COALESCE($4, photo_url)
       WHERE user_id = $5
       RETURNING user_id, full_name, email, phone, photo_url`,
      [full_name, email, phone, photo_url, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Email already exists" });
    }

    res.status(500).json({ message: "Server error" });
  }
});

export default router;