import express from "express";
import db from "../db.js";
import ownerAuth from "../middleware/ownerAuth.js";

const router = express.Router();

/**
 * PUBLIC
 * GET /api/clubs
 */
router.get("/", async (req, res) => {
  const result = await db.query(
    "SELECT club_id, owner_id, name, address, lat, lon, phone_number, maps_url, whatsapp, about, cover_url, logo_url, rules, is_active, created_at FROM clubs ORDER BY club_id"
  );
  res.json(result.rows);
});

/**
 * PUBLIC
 * GET /api/clubs/:id
 */
router.get("/:id", async (req, res) => {
  const club = await db.query(
    "SELECT * FROM clubs WHERE club_id = $1",
    [req.params.id]
  );
  if (club.rows.length === 0) return res.status(404).json({ message: "Club not found" });
  res.json(club.rows[0]);
});

/**
 * OWNER
 * POST /api/clubs
 * headers: x-role=owner, x-user-id=<owner_id>
 */
router.post("/", ownerAuth, async (req, res) => {
  const owner_id = req.headers["x-user-id"]; // simple like doctor
  if (!owner_id) return res.status(400).json({ message: "Missing x-user-id header" });

  const {
    name, address, lat, lon,
    phone_number, maps_url, whatsapp,
    about, cover_url, logo_url, rules, is_active
  } = req.body;

  const result = await db.query(
    `INSERT INTO clubs
     (owner_id, name, address, lat, lon, phone_number, maps_url, whatsapp, about, cover_url, logo_url, rules, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [owner_id, name, address, lat, lon, phone_number, maps_url, whatsapp, about, cover_url, logo_url, rules, is_active ?? true]
  );

  res.status(201).json(result.rows[0]);
});

/**
 * OWNER
 * PUT /api/clubs/:id
 * headers: x-role=owner, x-user-id=<owner_id>
 */
router.put("/:id", ownerAuth, async (req, res) => {
  const owner_id = req.headers["x-user-id"];
  if (!owner_id) return res.status(400).json({ message: "Missing x-user-id header" });

  const existing = await db.query("SELECT * FROM clubs WHERE club_id = $1", [req.params.id]);
  if (existing.rows.length === 0) return res.status(404).json({ message: "Club not found" });

  // only owner can update (admin can bypass if you want)
  if (String(existing.rows[0].owner_id) !== String(owner_id) && req.headers["x-role"] !== "admin") {
    return res.status(403).json({ message: "Not your club" });
  }

  const {
    name, address, lat, lon,
    phone_number, maps_url, whatsapp,
    about, cover_url, logo_url, rules, is_active
  } = req.body;

  const result = await db.query(
    `UPDATE clubs SET
      name=$1, address=$2, lat=$3, lon=$4,
      phone_number=$5, maps_url=$6, whatsapp=$7,
      about=$8, cover_url=$9, logo_url=$10,
      rules=$11, is_active=$12
     WHERE club_id=$13
     RETURNING *`,
    [name, address, lat, lon, phone_number, maps_url, whatsapp, about, cover_url, logo_url, rules, is_active, req.params.id]
  );

  res.json(result.rows[0]);
});

/**
 * OWNER
 * DELETE /api/clubs/:id
 * headers: x-role=owner, x-user-id=<owner_id>
 */
router.delete("/:id", ownerAuth, async (req, res) => {
  const owner_id = req.headers["x-user-id"];
  if (!owner_id) return res.status(400).json({ message: "Missing x-user-id header" });

  const existing = await db.query("SELECT * FROM clubs WHERE club_id = $1", [req.params.id]);
  if (existing.rows.length === 0) return res.status(404).json({ message: "Club not found" });

  if (String(existing.rows[0].owner_id) !== String(owner_id) && req.headers["x-role"] !== "admin") {
    return res.status(403).json({ message: "Not your club" });
  }

  const deleted = await db.query("DELETE FROM clubs WHERE club_id = $1 RETURNING *", [req.params.id]);
  res.json({ deleted: deleted.rows[0] });
});

export default router;