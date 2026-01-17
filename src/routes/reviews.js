import express from "express";
import db from "../db.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();


router.get("/", async (req, res) => {
  try {
    const { club_id } = req.query;

    if (!club_id) {
      return res.status(400).json({ message: "club_id is required" });
    }

    const result = await db.query(
      `
      SELECT
        r.review_id,
        r.club_id,
        r.user_id,
        r.stars,
        r.comment,
        r.created_at,
        r.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'image_id', ri.image_id,
              'image_url', ri.image_url,
              'position', ri.position
            )
            ORDER BY ri.position, ri.image_id
          ) FILTER (WHERE ri.image_id IS NOT NULL),
          '[]'::json
        ) AS images
      FROM reviews r
      LEFT JOIN review_images ri ON ri.review_id = r.review_id
      WHERE r.club_id = $1
      GROUP BY r.review_id
      ORDER BY r.created_at DESC
      `,
      [club_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /reviews error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


router.post("/", userAuth, async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const { club_id, stars, comment } = req.body;

    if (!club_id || !stars || !comment) {
      return res.status(400).json({ message: "club_id, stars, comment are required" });
    }

    const clubCheck = await db.query(`SELECT club_id FROM clubs WHERE club_id = $1`, [club_id]);
    if (clubCheck.rows.length === 0) {
      return res.status(404).json({ message: "Club not found" });
    }

    const result = await db.query(
      `
      INSERT INTO reviews (club_id, user_id, stars, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING review_id, club_id, user_id, stars, comment, created_at, updated_at
      `,
      [club_id, userId, stars, comment]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /reviews error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


router.put("/:id", userAuth, async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const { id } = req.params;
    const { stars, comment } = req.body;

    if (stars === undefined && comment === undefined) {
      return res.status(400).json({ message: "stars or comment is required" });
    }

    const result = await db.query(
      `
      UPDATE reviews
      SET
        stars = COALESCE($1, stars),
        comment = COALESCE($2, comment),
        updated_at = NOW()
      WHERE review_id = $3
        AND user_id = $4
      RETURNING review_id, club_id, user_id, stars, comment, created_at, updated_at
      `,
      [stars, comment, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Review not found or not yours" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /reviews/:id error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


router.delete("/:id", userAuth, async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const { id } = req.params;

    const result = await db.query(
      `
      DELETE FROM reviews
      WHERE review_id = $1
        AND user_id = $2
      RETURNING review_id, club_id, user_id, stars, comment
      `,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Review not found or not yours" });
    }

    res.json({ deleted: result.rows[0] });
  } catch (err) {
    console.error("DELETE /reviews/:id error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;