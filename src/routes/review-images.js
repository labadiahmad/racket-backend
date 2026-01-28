import express from "express";
import db from "../db.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

// get all images for a specific review
router.get("/", async (req, res) => {
  try {
    const { review_id } = req.query;

    if (!review_id) {
      return res.status(400).json({ message: "review_id is required" });
    }

    const result = await db.query(
      `
      SELECT image_id, review_id, image_url, position
      FROM review_images
      WHERE review_id = $1
      ORDER BY position, image_id
      `,
      [review_id]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// add image to a review (owner of the review only)
router.post("/", userAuth, async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const { review_id, image_url, position } = req.body;

    if (!review_id || !image_url) {
      return res.status(400).json({ message: "review_id and image_url are required" });
    }

    const check = await db.query(
      `SELECT review_id FROM reviews WHERE review_id = $1 AND user_id = $2`,
      [review_id, userId]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ message: "Not your review" });
    }

    const result = await db.query(
      `
      INSERT INTO review_images (review_id, image_url, position)
      VALUES ($1, $2, COALESCE($3, 0))
      RETURNING image_id, review_id, image_url, position
      `,
      [review_id, image_url, position]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// delete image from a review (owner only)
router.delete("/:id", userAuth, async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const { id } = req.params;

    const result = await db.query(
      `
      DELETE FROM review_images ri
      USING reviews r
      WHERE ri.image_id = $1
        AND ri.review_id = r.review_id
        AND r.user_id = $2
      RETURNING ri.image_id, ri.review_id, ri.image_url, ri.position
      `,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Image not found or not yours" });
    }

    res.json({ deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;