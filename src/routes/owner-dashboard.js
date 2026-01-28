import express from "express";
import db from "../db.js";
import requireAuth from "../middleware/userAuth.js";

const router = express.Router();

// Owner dashboard data
router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const role = (req.headers["x-role"] || "").toLowerCase();
    const ownerId = Number(req.headers["x-user-id"]);

    // Check owner access
    if (role !== "owner") {
      return res.status(403).json({ message: "Owners only" });
    }
    if (!ownerId) {
      return res.status(401).json({ message: "Missing x-user-id" });
    }

    // Get owner club
    const clubRes = await db.query(
      `SELECT * FROM clubs WHERE owner_id = $1 LIMIT 1`,
      [ownerId]
    );
    const club = clubRes.rows[0] || null;

    // If owner has no club
    if (!club) {
      return res.json({
        club: null,
        courts: [],
        reservations: [],
      });
    }

    // Get club courts
    const courtsRes = await db.query(
      `SELECT * FROM courts WHERE club_id = $1 ORDER BY court_id DESC`,
      [club.club_id]
    );

    // Get recent reservations
    const reservationsRes = await db.query(
      `SELECT * FROM reservations
       WHERE club_id = $1
       ORDER BY reservation_id DESC
       LIMIT 20`,
      [club.club_id]
    );

    // Dashboard response
    res.json({
      club,
      courts: courtsRes.rows,
      reservations: reservationsRes.rows,
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;