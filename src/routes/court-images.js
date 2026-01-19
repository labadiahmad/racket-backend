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
      `SELECT image_id, court_id, image_url, position
       FROM court_images
       WHERE court_id = $1
       ORDER BY position ASC, image_id ASC`,
      [court_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /court-images error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


router.post("/", ownerAuth, async (req, res) => {
  try {
    const ownerId = req.headers["x-user-id"];
    const { court_id, image_url, position } = req.body;

    if (!court_id || !image_url) {
      return res.status(400).json({ message: "court_id and image_url are required" });
    }

    const check = await db.query(
      `SELECT c.court_id
       FROM courts c
       JOIN clubs cl ON cl.club_id = c.club_id
       WHERE c.court_id = $1 AND cl.owner_id = $2`,
      [court_id, ownerId]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ message: "Not your court" });
    }

    const result = await db.query(
      `INSERT INTO court_images (court_id, image_url, position)
       VALUES ($1, $2, $3)
       RETURNING image_id, court_id, image_url, position`,
      [court_id, image_url, Number(position) || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /court-images error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


router.put("/:id", ownerAuth, async (req, res) => {
  try {
    const ownerId = req.headers["x-user-id"];
    const { id } = req.params;
    const { position } = req.body;

    const result = await db.query(
      `UPDATE court_images ci
       SET position = COALESCE($1, ci.position)
       FROM courts c
       JOIN clubs cl ON cl.club_id = c.club_id
       WHERE ci.image_id = $2
         AND ci.court_id = c.court_id
         AND cl.owner_id = $3
       RETURNING ci.image_id, ci.court_id, ci.image_url, ci.position`,
      [position, id, ownerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Image not found or not your court" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /court-images/:id error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


router.delete("/:id", ownerAuth, async (req, res) => {
  try {
    const ownerId = req.headers["x-user-id"];
    const { id } = req.params;

    const result = await db.query(
      `DELETE FROM court_images ci
       USING courts c, clubs cl
       WHERE ci.image_id = $1
         AND ci.court_id = c.court_id
         AND c.club_id = cl.club_id
         AND cl.owner_id = $2
       RETURNING ci.image_id, ci.court_id, ci.image_url, ci.position`,
      [id, ownerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Image not found or not your court" });
    }

    res.json({ deleted: result.rows[0] });
  } catch (err) {
    console.error("DELETE /court-images/:id error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;