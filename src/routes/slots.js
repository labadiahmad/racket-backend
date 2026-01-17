import express from "express";
import db from "../db.js";
import ownerAuth from "../middleware/ownerAuth.js";

const router = express.Router();


router.get("/", async (req, res) => {
  try {
    const { court_id } = req.query;

    if (!court_id) {
      return res.status(400).json({ message: "court_id is required" });
    }

    const result = await db.query(
      "SELECT * FROM time_slots WHERE court_id = $1 ORDER BY time_from",
      [court_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /slots error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


router.post("/", ownerAuth, async (req, res) => {
  try {
    const { court_id, time_from, time_to, price, is_active } = req.body;

    if (!court_id || !time_from || !time_to || price === undefined) {
      return res
        .status(400)
        .json({ message: "court_id, time_from, time_to, price are required" });
    }

    const result = await db.query(
      `INSERT INTO time_slots (court_id, time_from, time_to, price, is_active)
       VALUES ($1, $2, $3, $4, COALESCE($5, TRUE))
       RETURNING *`,
      [court_id, time_from, time_to, price, is_active]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /slots error:", err.message);
    if (err.code === "23505") {
      return res.status(409).json({ message: "Slot already exists for this court" });
    }
    res.status(500).json({ message: "Server error" });
  }
});


router.put("/:id", ownerAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { time_from, time_to, price, is_active } = req.body;

    const result = await db.query(
      `UPDATE time_slots
       SET time_from = COALESCE($1, time_from),
           time_to   = COALESCE($2, time_to),
           price     = COALESCE($3, price),
           is_active = COALESCE($4, is_active)
       WHERE slot_id = $5
       RETURNING *`,
      [time_from, time_to, price, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Slot not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /slots/:id error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


router.delete("/:id", ownerAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      "DELETE FROM time_slots WHERE slot_id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Slot not found" });
    }

    res.json({ deleted: result.rows[0] });
  } catch (err) {
    console.error("DELETE /slots/:id error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;