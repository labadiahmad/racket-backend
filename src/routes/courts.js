import express from "express";
import db from "../db.js";
import ownerAuth from "../middleware/ownerAuth.js";

const router = express.Router();

/**
 * GET /api/courts?club_id=1
 * Public: return courts for a club
 */
router.get("/", async (req, res) => {
  try {
    const { club_id } = req.query;

    if (!club_id) {
      return res.status(400).json({ message: "club_id is required" });
    }

    const result = await db.query(
      "SELECT * FROM courts WHERE club_id = $1 ORDER BY court_id",
      [club_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /courts error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/courts
 * Owner only
 */
router.post("/", ownerAuth, async (req, res) => {
  try {
    const {
      club_id,
      name,
      type,
      surface,
      about,
      lighting,
      max_players,
      features,
      cover_url,
      rules,
      is_active,
    } = req.body;

    if (!club_id || !name) {
      return res.status(400).json({ message: "club_id and name are required" });
    }

    const result = await db.query(
      `INSERT INTO courts
        (club_id, name, type, surface, about, lighting, max_players, features, cover_url, rules, is_active)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, COALESCE($11, TRUE))
       RETURNING *`,
      [
        club_id,
        name,
        type || null,
        surface || null,
        about || null,
        lighting || null,
        max_players || 4,
        features || null,
        cover_url || null,
        rules || null,
        is_active,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /courts error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PUT /api/courts/:id
 * Owner only
 */
router.put("/:id", ownerAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      surface,
      about,
      lighting,
      max_players,
      features,
      cover_url,
      rules,
      is_active,
    } = req.body;

    const result = await db.query(
      `UPDATE courts
       SET name = COALESCE($1, name),
           type = COALESCE($2, type),
           surface = COALESCE($3, surface),
           about = COALESCE($4, about),
           lighting = COALESCE($5, lighting),
           max_players = COALESCE($6, max_players),
           features = COALESCE($7, features),
           cover_url = COALESCE($8, cover_url),
           rules = COALESCE($9, rules),
           is_active = COALESCE($10, is_active)
       WHERE court_id = $11
       RETURNING *`,
      [
        name,
        type,
        surface,
        about,
        lighting,
        max_players,
        features,
        cover_url,
        rules,
        is_active,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Court not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /courts/:id error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * DELETE /api/courts/:id
 * Owner only
 */
router.delete("/:id", ownerAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      "DELETE FROM courts WHERE court_id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Court not found" });
    }

    res.json({ deleted: result.rows[0] });
  } catch (err) {
    console.error("DELETE /courts/:id error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;