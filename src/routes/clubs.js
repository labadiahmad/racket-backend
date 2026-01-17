import express from "express";
import db from "../db.js";
import ownerAuth from "../middleware/ownerAuth.js";

const router = express.Router();

// GET all clubs (public)
router.get("/", async (req, res) => {
  const result = await db.query("SELECT * FROM clubs ORDER BY club_id");
  res.json(result.rows);
});

// GET single club (public)
router.get("/:id", async (req, res) => {
  const result = await db.query("SELECT * FROM clubs WHERE club_id = $1", [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ message: "Club not found" });
  res.json(result.rows[0]);
});

// CREATE club (owner only)
router.post("/", ownerAuth, async (req, res) => {
  const ownerId = req.headers["x-user-id"];
  if (!ownerId) return res.status(400).json({ message: "Missing x-user-id header" });

  const { name, address, phone_number, maps_url, whatsapp, about, cover_url, logo_url, rules, lat, lon } = req.body;

  const result = await db.query(
    `INSERT INTO clubs
      (owner_id, name, address, phone_number, maps_url, whatsapp, about, cover_url, logo_url, rules, lat, lon)
     VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [ownerId, name, address, phone_number || null, maps_url || null, whatsapp || null, about || null, cover_url || null, logo_url || null, rules || null, lat || null, lon || null]
  );

  res.status(201).json({ club: result.rows[0] });
});

// UPDATE club (owner only) - only his club
router.put("/:id", ownerAuth, async (req, res) => {
  const ownerId = req.headers["x-user-id"];
  if (!ownerId) return res.status(400).json({ message: "Missing x-user-id header" });

  const { name, address, phone_number, maps_url, whatsapp, about, cover_url, logo_url, rules, lat, lon, is_active } = req.body;

  const result = await db.query(
    `UPDATE clubs SET
      name = COALESCE($1, name),
      address = COALESCE($2, address),
      phone_number = COALESCE($3, phone_number),
      maps_url = COALESCE($4, maps_url),
      whatsapp = COALESCE($5, whatsapp),
      about = COALESCE($6, about),
      cover_url = COALESCE($7, cover_url),
      logo_url = COALESCE($8, logo_url),
      rules = COALESCE($9, rules),
      lat = COALESCE($10, lat),
      lon = COALESCE($11, lon),
      is_active = COALESCE($12, is_active)
     WHERE club_id = $13 AND owner_id = $14
     RETURNING *`,
    [name, address, phone_number, maps_url, whatsapp, about, cover_url, logo_url, rules, lat, lon, is_active, req.params.id, ownerId]
  );

  if (result.rows.length === 0) return res.status(404).json({ message: "Club not found or not your club" });
  res.json({ club: result.rows[0] });
});

// DELETE club (owner only) - only his club
router.delete("/:id", ownerAuth, async (req, res) => {
  const ownerId = req.headers["x-user-id"];
  if (!ownerId) return res.status(400).json({ message: "Missing x-user-id header" });

  const result = await db.query(
    "DELETE FROM clubs WHERE club_id = $1 AND owner_id = $2 RETURNING *",
    [req.params.id, ownerId]
  );

  if (result.rows.length === 0) return res.status(404).json({ message: "Club not found or not your club" });
  res.json({ deleted: result.rows[0] });
});

export default router;