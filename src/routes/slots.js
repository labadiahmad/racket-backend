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
      `
      SELECT slot_id, court_id, time_from, time_to, price, is_active
      FROM time_slots
      WHERE court_id = $1
      ORDER BY time_from
      `,
      [court_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /slots error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


router.get("/availability", async (req, res) => {
  try {
    const { court_id, date_iso } = req.query;

    if (!court_id || !date_iso) {
      return res.status(400).json({ message: "court_id and date_iso are required" });
    }

    const result = await db.query(
      `
      SELECT
        s.slot_id,
        s.court_id,
        s.time_from,
        s.time_to,
        s.price,
        s.is_active,
        CASE
          WHEN r.reservation_id IS NULL THEN true
          ELSE false
        END AS is_available
      FROM time_slots s
      LEFT JOIN reservations r
        ON r.slot_id = s.slot_id
        AND r.court_id = s.court_id
        AND r.date_iso = $2
        AND r.status = 'Active'
      WHERE s.court_id = $1
        AND s.is_active = true
      ORDER BY s.time_from;
      `,
      [court_id, date_iso]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /slots/availability error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


router.post("/", ownerAuth, async (req, res) => {
  try {
    const ownerId = req.headers["x-user-id"];
    if (!ownerId) return res.status(400).json({ message: "Missing x-user-id header" });

    const { court_id, time_from, time_to, price, is_active } = req.body;

    if (!court_id || !time_from || !time_to || price === undefined) {
      return res.status(400).json({
        message: "court_id, time_from, time_to, price are required",
      });
    }

    const check = await db.query(
      `
      SELECT c.court_id
      FROM courts c
      JOIN clubs cl ON c.club_id = cl.club_id
      WHERE c.court_id = $1 AND cl.owner_id = $2
      `,
      [court_id, ownerId]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ message: "Not your court" });
    }

    const result = await db.query(
      `
      INSERT INTO time_slots (court_id, time_from, time_to, price, is_active)
      VALUES ($1, $2, $3, $4, COALESCE($5, TRUE))
      RETURNING *
      `,
      [court_id, time_from, time_to, price, is_active]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /slots error:", err.message);

    if (err.code === "23505") {
      return res.status(409).json({ message: "Slot already exists for this court" });
    }
    if (err.code === "23514") {
      return res.status(400).json({ message: "Invalid slot time (time_to must be after time_from)" });
    }

    res.status(500).json({ message: "Server error" });
  }
});


router.put("/:id", ownerAuth, async (req, res) => {
  try {
    const ownerId = req.headers["x-user-id"];
    if (!ownerId) return res.status(400).json({ message: "Missing x-user-id header" });

    const { id } = req.params;
    const { time_from, time_to, price, is_active } = req.body;

    const result = await db.query(
      `
      UPDATE time_slots s
      SET time_from = COALESCE($1, s.time_from),
          time_to   = COALESCE($2, s.time_to),
          price     = COALESCE($3, s.price),
          is_active = COALESCE($4, s.is_active)
      FROM courts c
      JOIN clubs cl ON c.club_id = cl.club_id
      WHERE s.slot_id = $5
        AND s.court_id = c.court_id
        AND cl.owner_id = $6
      RETURNING s.*
      `,
      [time_from, time_to, price, is_active, id, ownerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Slot not found or not your slot" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /slots/:id error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


router.delete("/:id", ownerAuth, async (req, res) => {
  try {
    const ownerId = req.headers["x-user-id"];
    if (!ownerId) return res.status(400).json({ message: "Missing x-user-id header" });

    const { id } = req.params;

    const result = await db.query(
      `
      DELETE FROM time_slots s
      USING courts c, clubs cl
      WHERE s.slot_id = $1
        AND s.court_id = c.court_id
        AND c.club_id = cl.club_id
        AND cl.owner_id = $2
      RETURNING s.*
      `,
      [id, ownerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Slot not found or not your slot" });
    }

    res.json({ deleted: result.rows[0] });
  } catch (err) {
    console.error("DELETE /slots/:id error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;