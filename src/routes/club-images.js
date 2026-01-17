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
      `SELECT image_id, club_id, image_url, position
       FROM club_images
       WHERE club_id = $1
       ORDER BY position ASC, image_id ASC`,
      [club_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /club-images error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


router.post("/", ownerAuth, async (req, res) => {
  try {
    const ownerId = req.headers["x-user-id"];
    if (!ownerId) return res.status(400).json({ message: "Missing x-user-id header" });

    const { club_id, image_url, position } = req.body;

    if (!club_id || !image_url) {
      return res.status(400).json({ message: "club_id and image_url are required" });
    }

    const clubCheck = await db.query(
      `SELECT club_id FROM clubs WHERE club_id = $1 AND owner_id = $2`,
      [club_id, ownerId]
    );

    if (clubCheck.rows.length === 0) {
      return res.status(403).json({ message: "Not allowed: not your club" });
    }

    const result = await db.query(
      `INSERT INTO club_images (club_id, image_url, position)
       VALUES ($1, $2, COALESCE($3, 0))
       RETURNING image_id, club_id, image_url, position`,
      [club_id, image_url, position]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /club-images error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


router.put("/:id", ownerAuth, async (req, res) => {
  try {
    const ownerId = req.headers["x-user-id"];
    if (!ownerId) return res.status(400).json({ message: "Missing x-user-id header" });

    const { id } = req.params;
    const { image_url, position } = req.body;

    const check = await db.query(
      `SELECT ci.image_id
       FROM club_images ci
       JOIN clubs c ON c.club_id = ci.club_id
       WHERE ci.image_id = $1 AND c.owner_id = $2`,
      [id, ownerId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: "Image not found or not your club" });
    }

    const result = await db.query(
      `UPDATE club_images
       SET image_url = COALESCE($1, image_url),
           position  = COALESCE($2, position)
       WHERE image_id = $3
       RETURNING image_id, club_id, image_url, position`,
      [image_url, position, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /club-images/:id error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


router.delete("/:id", ownerAuth, async (req, res) => {
  try {
    const ownerId = req.headers["x-user-id"];
    if (!ownerId) return res.status(400).json({ message: "Missing x-user-id header" });

    const { id } = req.params;

    const check = await db.query(
      `SELECT ci.image_id
       FROM club_images ci
       JOIN clubs c ON c.club_id = ci.club_id
       WHERE ci.image_id = $1 AND c.owner_id = $2`,
      [id, ownerId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: "Image not found or not your club" });
    }

    const result = await db.query(
      `DELETE FROM club_images
       WHERE image_id = $1
       RETURNING image_id, club_id, image_url, position`,
      [id]
    );

    res.json({ deleted: result.rows[0] });
  } catch (err) {
    console.error("DELETE /club-images/:id error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;