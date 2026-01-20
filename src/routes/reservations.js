import express from "express";
import db from "../db.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

function getRole(req) {
  return (req.headers["x-role"] || "").toLowerCase();
}

function getUserId(req) {
  const v = req.headers["x-user-id"];
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function requireAuth(req, res, next) {
  const role = getRole(req);
  const userId = getUserId(req);
  if (!role || !userId) return res.status(401).json({ message: "Missing x-role or x-user-id" });
  next();
}

function makeBookingId() {
  return "BK" + Date.now().toString(36).toUpperCase();
}

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
  } catch (err) {
    console.error("GET /reservations/my error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


router.get("/", requireAuth, async (req, res) => {
  try {
    const role = getRole(req);
    const userId = getUserId(req);

   

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

      (s.price) AS total_price
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

    const result = await db.query(
      `SELECT * FROM reservations
       WHERE user_id = $1
       ORDER BY reservation_id DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /reservations error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


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
      return res.status(400).json({
        message: "club_id, court_id, slot_id, date_iso are required",
      });
    }

    let finalUserId = null;
    if (role === "user") finalUserId = headerUserId;
    else finalUserId = user_id ?? null;

    if (role === "owner") {
      const checkOwner = await db.query(
        `SELECT club_id FROM clubs WHERE club_id = $1 AND owner_id = $2`,
        [club_id, headerUserId]
      );
      if (checkOwner.rows.length === 0) {
        return res.status(403).json({ message: "Not your club" });
      }
    }

    const check = await db.query(
      `SELECT c.court_id, s.slot_id
       FROM courts c
       JOIN time_slots s ON s.court_id = c.court_id
       WHERE c.court_id = $1 AND c.club_id = $2 AND s.slot_id = $3`,
      [court_id, club_id, slot_id]
    );

    if (check.rows.length === 0) {
      return res.status(400).json({ message: "Invalid club/court/slot relation" });
    }

    const booking_id = makeBookingId();

    const result = await db.query(
      `INSERT INTO reservations
        (club_id, court_id, slot_id, user_id, booking_id, date_iso, status,
         booked_by_name, phone, player1, player2, player3, player4)
       VALUES
        ($1,$2,$3,$4,$5,$6,'Active',
         $7,$8,$9,$10,$11,$12)
       RETURNING *`,
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
    console.error("POST /reservations error:", err.message);

    if (err.code === "23505") {
      return res.status(409).json({ message: "This slot is already booked for that date" });
    }

    if (err.code === "23503") {
      return res.status(400).json({ message: "Invalid foreign key (club/court/slot/user)" });
    }

    res.status(500).json({ message: "Server error" });
  }
});

router.get("/booked-slots", async (req, res) => {
  try {
    const { court_id, date_iso } = req.query;

    if (!court_id || !date_iso) {
      return res.status(400).json({ message: "court_id and date_iso are required" });
    }

    const result = await db.query(
      `
      SELECT slot_id
      FROM reservations
      WHERE court_id = $1
        AND date_iso = $2
        AND status = 'Active'
      `,
      [Number(court_id), date_iso]
    );

    // return: [1,2,3]
    res.json(result.rows.map((r) => Number(r.slot_id)));
  } catch (err) {
    console.error("GET /reservations/booked-slots error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const reservationId = req.params.id;
    const role = (req.headers["x-role"] || "").toLowerCase();
    const userId = req.headers["x-user-id"];

    let query;
    let values;

    if (role === "owner") {
      query = "SELECT * FROM reservations WHERE reservation_id = $1";
      values = [reservationId];
    } else {
      query = `
        SELECT * FROM reservations
        WHERE reservation_id = $1 AND user_id = $2
      `;
      values = [reservationId, userId];
    }

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /reservations/:id error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const role = getRole(req);
    const userId = getUserId(req);
    const { id } = req.params;

    const { date_iso, slot_id } = req.body;

    if (!date_iso && !slot_id) {
      return res.status(400).json({ message: "Send date_iso and/or slot_id to update" });
    }

    const existing = await db.query(`SELECT * FROM reservations WHERE reservation_id = $1`, [id]);
    if (existing.rows.length === 0) return res.status(404).json({ message: "Reservation not found" });

    const r = existing.rows[0];

    if (role === "user" && r.user_id !== userId) {
      return res.status(403).json({ message: "Not your reservation" });
    }

    if (role === "owner") {
      const checkOwner = await db.query(
        `SELECT club_id FROM clubs WHERE club_id = $1 AND owner_id = $2`,
        [r.club_id, userId]
      );
      if (checkOwner.rows.length === 0) return res.status(403).json({ message: "Not your club reservation" });
    }

    if (slot_id) {
      const slotCheck = await db.query(
        `SELECT slot_id FROM time_slots WHERE slot_id = $1 AND court_id = $2`,
        [slot_id, r.court_id]
      );
      if (slotCheck.rows.length === 0) {
        return res.status(400).json({ message: "slot_id does not belong to this court" });
      }
    }

    const updated = await db.query(
      `UPDATE reservations
       SET date_iso = COALESCE($1, date_iso),
           slot_id  = COALESCE($2, slot_id)
       WHERE reservation_id = $3
       RETURNING *`,
      [date_iso || null, slot_id || null, id]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    console.error("PUT /reservations/:id error:", err.message);

    if (err.code === "23505") {
      return res.status(409).json({ message: "This slot is already booked for that date" });
    }

    res.status(500).json({ message: "Server error" });
  }
});


router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid reservation id" });

    const userId = Number(req.headers["x-user-id"]);
    const role = String(req.headers["x-role"] || "user");

    const q = `
      DELETE FROM reservations
      WHERE reservation_id = $1
      AND (
        $2 = 'owner'
        OR user_id = $3
      )
      RETURNING reservation_id
    `;

    const result = await db.query(q, [id, role, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Reservation not found or not allowed" });
    }

    return res.json({ message: "Deleted", reservation_id: id });
  } catch (err) {
    console.error("DELETE reservation error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;