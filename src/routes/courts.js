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
      "SELECT * FROM courts WHERE club_id = $1 ORDER BY court_id",
      [club_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /courts error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


router.get("/:id", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM courts WHERE court_id = $1",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Court not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /courts/:id error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


router.post("/", ownerAuth, async (req, res) => {
  try {
    const ownerId = req.headers["x-user-id"];
    if (!ownerId) return res.status(400).json({ message: "Missing x-user-id header" });

    const {
      club_id, name, type, surface, about, lighting,
      max_players, features, cover_url, rules, is_active
    } = req.body;

    if (!club_id || !name) {
      return res.status(400).json({ message: "club_id and name are required" });
    }

    const clubCheck = await db.query(
      "SELECT club_id FROM clubs WHERE club_id = $1 AND owner_id = $2",
      [club_id, ownerId]
    );

    if (clubCheck.rows.length === 0) {
      return res.status(403).json({ message: "Not your club" });
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


router.put("/:id", ownerAuth, async (req, res) => {
  try {
    const ownerId = req.headers["x-user-id"];
    if (!ownerId) return res.status(400).json({ message: "Missing x-user-id header" });

    const { id } = req.params;

    const {
      name, type, surface, about, lighting,
      max_players, features, cover_url, rules, is_active
    } = req.body;

    const result = await db.query(
      `UPDATE courts c
       SET name = COALESCE($1, c.name),
           type = COALESCE($2, c.type),
           surface = COALESCE($3, c.surface),
           about = COALESCE($4, c.about),
           lighting = COALESCE($5, c.lighting),
           max_players = COALESCE($6, c.max_players),
           features = COALESCE($7, c.features),
           cover_url = COALESCE($8, c.cover_url),
           rules = COALESCE($9, c.rules),
           is_active = COALESCE($10, c.is_active)
       FROM clubs cl
       WHERE c.court_id = $11
         AND c.club_id = cl.club_id
         AND cl.owner_id = $12
       RETURNING c.*`,
      [
        name || null,
        type || null,
        surface || null,
        about || null,
        lighting || null,
        max_players || null,
        features || null,
        cover_url || null,
        rules || null,
        is_active,
        id,
        ownerId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Court not found or not your court" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /courts/:id error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


router.delete("/:id", ownerAuth, async (req, res) => {
  try {
    const ownerId = req.headers["x-user-id"];
    if (!ownerId) return res.status(400).json({ message: "Missing x-user-id header" });

    const { id } = req.params;

    const result = await db.query(
      `DELETE FROM courts c
       USING clubs cl
       WHERE c.court_id = $1
         AND c.club_id = cl.club_id
         AND cl.owner_id = $2
       RETURNING c.*`,
      [id, ownerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Court not found or not your court" });
    }

    res.json({ deleted: result.rows[0] });
  } catch (err) {
    console.error("DELETE /courts/:id error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;