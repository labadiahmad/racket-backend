import express from "express";
import db from "../db.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

// get all reviews for a club with their images
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
    res.status(500).json({ message: "Server error" });
  }
});

// create a new review with optional images
router.post("/", userAuth, async (req, res) => {
  try {
    const userIdRaw = req.headers["x-user-id"];
    const userId = userIdRaw ? Number(userIdRaw) : null;

    const { club_id, stars, comment, images } = req.body;

    if (!club_id || !stars || !comment) {
      return res.status(400).json({ message: "club_id, stars, comment are required" });
    }

    if (!userId || Number.isNaN(userId)) {
      return res.status(401).json({ message: "Invalid user. Please login again." });
    }

    const userCheck = await db.query(`SELECT user_id FROM users WHERE user_id = $1`, [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(401).json({ message: "User not found. Please login again." });
    }

    const clubCheck = await db.query(`SELECT club_id FROM clubs WHERE club_id = $1`, [club_id]);
    if (clubCheck.rows.length === 0) {
      return res.status(404).json({ message: "Club not found" });
    }

    const reviewRes = await db.query(
      `
      INSERT INTO reviews (club_id, user_id, stars, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING review_id, club_id, user_id, stars, comment, created_at, updated_at
      `,
      [Number(club_id), userId, Number(stars), comment]
    );

    const review = reviewRes.rows[0];

    const imgList = Array.isArray(images) ? images : [];
    for (let i = 0; i < imgList.length; i++) {
      const url = imgList[i];
      if (!url) continue;

      await db.query(
        `INSERT INTO review_images (review_id, image_url, position)
         VALUES ($1, $2, $3)`,
        [review.review_id, url, i]
      );
    }

    const full = await db.query(
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
      WHERE r.review_id = $1
      GROUP BY r.review_id
      `,
      [review.review_id]
    );

    res.status(201).json(full.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// update stars or comment of a review (owner only)
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
    res.status(500).json({ message: "Server error" });
  }
});

// delete a review (owner only)
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
    res.status(500).json({ message: "Server error" });
  }
});

export default router;