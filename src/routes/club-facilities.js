import express from "express";
import db from "../db.js";
import ownerAuth from "../middleware/ownerAuth.js";

const router = express.Router();


router.get("/", async (req, res) => {
  try {
    const { club_id } = req.query;

    if (!club_id) {
      return res.status(400).json({ message: "club_id is required" });
    }

    const result = await db.query(
      `SELECT facility_id, club_id, icon, label
       FROM club_facilities
       WHERE club_id = $1
       ORDER BY facility_id`,
      [club_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /club-facilities error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


router.post("/", ownerAuth, async (req, res) => {
  try {
    const ownerId = req.headers["x-user-id"];
    const { club_id, icon, label } = req.body;

    if (!club_id || !label) {
      return res.status(400).json({ message: "club_id and label are required" });
    }

    const check = await db.query(
      `SELECT club_id FROM clubs WHERE club_id = $1 AND owner_id = $2`,
      [club_id, ownerId]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ message: "Not your club" });
    }

    const result = await db.query(
      `INSERT INTO club_facilities (club_id, icon, label)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [club_id, icon || null, label]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /club-facilities error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


router.put("/:id", ownerAuth, async (req, res) => {
  try {
    const ownerId = req.headers["x-user-id"];
    const { id } = req.params;
    const { icon, label } = req.body;

    const result = await db.query(
      `UPDATE club_facilities f
       SET
         icon  = COALESCE($1, icon),
         label = COALESCE($2, label)
       FROM clubs c
       WHERE f.facility_id = $3
         AND f.club_id = c.club_id
         AND c.owner_id = $4
       RETURNING f.*`,
      [icon, label, id, ownerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Facility not found or not your club" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /club-facilities/:id error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


router.delete("/:id", ownerAuth, async (req, res) => {
  try {
    const ownerId = req.headers["x-user-id"];
    const { id } = req.params;

    const result = await db.query(
      `DELETE FROM club_facilities f
       USING clubs c
       WHERE f.facility_id = $1
         AND f.club_id = c.club_id
         AND c.owner_id = $2
       RETURNING f.*`,
      [id, ownerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Facility not found or not your club" });
    }

    res.json({ deleted: result.rows[0] });
  } catch (err) {
    console.error("DELETE /club-facilities/:id error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;