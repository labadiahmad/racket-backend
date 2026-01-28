import express from "express";
import db from "../db.js";
import ownerAuth from "../middleware/ownerAuth.js";

const router = express.Router();

// Get all clubs with rating summary
router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        c.*,
        COALESCE(ROUND(AVG(r.stars))::int, 0) AS avg_rating,
        COALESCE(COUNT(r.review_id), 0)::int AS reviews_count
      FROM clubs c
      LEFT JOIN reviews r ON r.club_id = c.club_id
      GROUP BY c.club_id
      ORDER BY c.club_id
    `);

    res.json(result.rows);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Get single club by id with rating summary
router.get("/:id", async (req, res) => {
  try {
    const clubId = Number(req.params.id);

    const result = await db.query(
      `
      SELECT
        c.*,
        COALESCE(ROUND(AVG(r.stars))::int, 0) AS avg_rating,
        COALESCE(COUNT(r.review_id), 0)::int AS reviews_count
      FROM clubs c
      LEFT JOIN reviews r ON r.club_id = c.club_id
      WHERE c.club_id = $1
      GROUP BY c.club_id
      `,
      [clubId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Club not found" });
    }

    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Create a new club (owner only)
router.post("/", ownerAuth, async (req, res) => {
  try {
    const ownerId = req.headers["x-user-id"];

    const {
      name,
      city,
      address,
      phone_number,
      maps_url,
      whatsapp,
      about,
      cover_url,
      logo_url,
      rules,
      lat,
      lon,
    } = req.body;

    if (!name || !city || !address) {
      return res.status(400).json({ message: "name, city, and address are required" });
    }

    const result = await db.query(
      `INSERT INTO clubs
        (owner_id, name, city, address, phone_number, maps_url, whatsapp, about, cover_url, logo_url, rules, lat, lon)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        ownerId,
        name,
        city,
        address,
        phone_number || null,
        maps_url || null,
        whatsapp || null,
        about || null,
        cover_url || null,
        logo_url || null,
        rules || null,
        lat || null,
        lon || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Update club info (owner only)
router.put("/:id", ownerAuth, async (req, res) => {
  try {
    const ownerId = req.headers["x-user-id"];
    const clubId = Number(req.params.id);

    const {
      name,
      city,
      address,
      phone_number,
      maps_url,
      whatsapp,
      about,
      cover_url,
      logo_url,
      rules,
      lat,
      lon,
      is_active,
    } = req.body;

    const result = await db.query(
      `UPDATE clubs SET
        name = COALESCE($1, name),
        city = COALESCE($2, city),
        address = COALESCE($3, address),
        phone_number = COALESCE($4, phone_number),
        maps_url = COALESCE($5, maps_url),
        whatsapp = COALESCE($6, whatsapp),
        about = COALESCE($7, about),
        cover_url = COALESCE($8, cover_url),
        logo_url = COALESCE($9, logo_url),
        rules = COALESCE($10, rules),
        lat = COALESCE($11, lat),
        lon = COALESCE($12, lon),
        is_active = COALESCE($13, is_active)
       WHERE club_id = $14 AND owner_id = $15
       RETURNING *`,
      [
        name ?? null,
        city ?? null,
        address ?? null,
        phone_number ?? null,
        maps_url ?? null,
        whatsapp ?? null,
        about ?? null,
        cover_url ?? null,
        logo_url ?? null,
        rules ?? null,
        lat ?? null,
        lon ?? null,
        is_active ?? null,
        clubId,
        ownerId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Club not found or not your club" });
    }

    res.json({ club: result.rows[0] });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a club (owner only)
router.delete("/:id", ownerAuth, async (req, res) => {
  try {
    const ownerId = req.headers["x-user-id"];

    const result = await db.query(
      "DELETE FROM clubs WHERE club_id = $1 AND owner_id = $2 RETURNING *",
      [req.params.id, ownerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Club not found or not your club" });
    }

    res.json({ deleted: result.rows[0] });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;