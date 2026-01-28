import express from "express";
import db from "../db.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

// Helpers to read auth headers
function getRole(req) {
  return (req.headers["x-role"] || "").toLowerCase();
}
function getUserId(req) {
  const n = Number(req.headers["x-user-id"]);
  return Number.isFinite(n) ? n : null;
}

// Simple auth check (role + user id)
function requireAuth(req, res, next) {
  if (!getRole(req) || !getUserId(req)) {
    return res.status(401).json({ message: "Missing x-role or x-user-id" });
  }
  next();
}

// Generate booking reference
function makeBookingId() {
  return "BK" + Date.now().toString(36).toUpperCase();
}

// User reservations
router.get("/my", userAuth, async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];

    const result = await db.query(
      `
      SELECT
        r.reservation_id,
        r.booking_id,
        r.date_iso,
        r.status,
        r.booked_by_name,
        r.phone,
        r.player1, r.player2, r.player3, r.player4,
        c.club_id,
        c.name AS club_name,
        c.logo_url AS club_logo,
        ct.court_id,
        ct.name AS court_name,
        ct.cover_url AS court_image,
        s.slot_id,
        s.time_from,
        s.time_to,
        s.price
      FROM reservations r
      JOIN clubs c ON r.club_id = c.club_id
      JOIN courts ct ON r.court_id = ct.court_id
      JOIN time_slots s ON r.slot_id = s.slot_id
      WHERE r.user_id = $1
      ORDER BY r.date_iso DESC, s.time_from ASC
      `,
      [userId]
    );

    res.json(result.rows);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Reservations list (owner or user)
router.get("/", requireAuth, async (req, res) => {
  try {
    const role = getRole(req);
    const userId = getUserId(req);

    // Owner: all reservations for his club
    if (role === "owner") {
      const result = await db.query(
        `
        SELECT
          r.reservation_id,
          r.booking_id,
          r.date_iso,
          r.status,
          r.booked_by_name,
          r.phone,
          r.player1, r.player2, r.player3, r.player4,
          r.club_id,
          cl.name AS club_name,
          r.court_id,
          ct.name AS court_name,
          r.slot_id,
          s.time_from,
          s.time_to,
          s.price AS slot_price,
          s.price AS total_price
        FROM reservations r
        JOIN clubs cl ON r.club_id = cl.club_id
        JOIN courts ct ON r.court_id = ct.court_id
        JOIN time_slots s ON r.slot_id = s.slot_id
        WHERE cl.owner_id = $1
        ORDER BY r.date_iso DESC, s.time_from ASC, r.reservation_id DESC
        `,
        [userId]
      );
      return res.json(result.rows);
    }

    // User: own reservations
    const result = await db.query(
      `SELECT * FROM reservations WHERE user_id = $1 ORDER BY reservation_id DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Create reservation (user or owner)
router.post("/", requireAuth, async (req, res) => {
  try {
    const role = getRole(req);
    const headerUserId = getUserId(req);

    const {
      club_id,
      court_id,
      slot_id,
      date_iso,
      booked_by_name,
      phone,
      player1,
      player2,
      player3,
      player4,
      user_id,
    } = req.body;

    if (!club_id || !court_id || !slot_id || !date_iso) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const finalUserId = role === "user" ? headerUserId : user_id ?? null;

    // Owner can only book for his club
    if (role === "owner") {
      const check = await db.query(
        `SELECT club_id FROM clubs WHERE club_id = $1 AND owner_id = $2`,
        [club_id, headerUserId]
      );
      if (check.rows.length === 0) {
        return res.status(403).json({ message: "Not your club" });
      }
    }

    // Validate court-slot relation
    const valid = await db.query(
      `
      SELECT 1
      FROM courts c
      JOIN time_slots s ON s.court_id = c.court_id
      WHERE c.court_id = $1 AND c.club_id = $2 AND s.slot_id = $3
      `,
      [court_id, club_id, slot_id]
    );
    if (valid.rows.length === 0) {
      return res.status(400).json({ message: "Invalid court or slot" });
    }

    const booking_id = makeBookingId();

    const result = await db.query(
      `
      INSERT INTO reservations
      (club_id, court_id, slot_id, user_id, booking_id, date_iso, status,
       booked_by_name, phone, player1, player2, player3, player4)
      VALUES
      ($1,$2,$3,$4,$5,$6,'Active',$7,$8,$9,$10,$11,$12)
      RETURNING *
      `,
      [
        club_id,
        court_id,
        slot_id,
        finalUserId,
        booking_id,
        date_iso,
        booked_by_name || null,
        phone || null,
        player1 || null,
        player2 || null,
        player3 || null,
        player4 || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Slot already booked" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// Get booked slots for a court/date
router.get("/booked-slots", async (req, res) => {
  try {
    const { court_id, date_iso } = req.query;
    if (!court_id || !date_iso) {
      return res.status(400).json({ message: "court_id and date_iso required" });
    }

    const result = await db.query(
      `
      SELECT slot_id
      FROM reservations
      WHERE court_id = $1 AND date_iso = $2 AND status = 'Active'
      `,
      [Number(court_id), date_iso]
    );

    res.json(result.rows.map((r) => Number(r.slot_id)));
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Single reservation details
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const role = getRole(req);
    const userId = getUserId(req);

    const result =
      role === "owner"
        ? await db.query(`SELECT * FROM reservations WHERE reservation_id = $1`, [id])
        : await db.query(
            `SELECT * FROM reservations WHERE reservation_id = $1 AND user_id = $2`,
            [id, userId]
          );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Update reservation date or slot
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const role = getRole(req);
    const userId = getUserId(req);
    const { id } = req.params;
    const { date_iso, slot_id } = req.body;

    const existing = await db.query(
      `SELECT * FROM reservations WHERE reservation_id = $1`,
      [id]
    );
    if (!existing.rows.length) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    const r = existing.rows[0];

    if (role === "user" && r.user_id !== userId) {
      return res.status(403).json({ message: "Not your reservation" });
    }

    const updated = await db.query(
      `
      UPDATE reservations
      SET date_iso = COALESCE($1, date_iso),
          slot_id  = COALESCE($2, slot_id)
      WHERE reservation_id = $3
      RETURNING *
      `,
      [date_iso || null, slot_id || null, id]
    );

    res.json(updated.rows[0]);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Delete reservation
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const userId = Number(req.headers["x-user-id"]);
    const role = String(req.headers["x-role"] || "user");

    const result = await db.query(
      `
      DELETE FROM reservations
      WHERE reservation_id = $1
      AND ($2 = 'owner' OR user_id = $3)
      RETURNING reservation_id
      `,
      [id, role, userId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Not found or not allowed" });
    }

    res.json({ message: "Deleted", reservation_id: id });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;