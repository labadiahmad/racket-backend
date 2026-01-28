import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import db from "./db.js";

// route imports
import authRoutes from "./routes/auth.js";
import clubsRoutes from "./routes/clubs.js";
import courtsRoutes from "./routes/courts.js";
import slotsRoutes from "./routes/slots.js";
import reservationsRoutes from "./routes/reservations.js";
import clubImagesRoutes from "./routes/club-images.js";
import uploadRoutes from "./routes/upload.js";
import usersRoutes from "./routes/users.js";
import facilitiesRoutes from "./routes/club-facilities.js";
import reviewsRoutes from "./routes/reviews.js";
import reviewImagesRoutes from "./routes/review-images.js";
import courtImagesRoutes from "./routes/court-images.js";
import ownerDashboardRoutes from "./routes/owner-dashboard.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT;

// fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// global middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// health check
app.get("/", (req, res) => res.send("Racket API is running ✅"));

// api routes
app.use("/api/auth", authRoutes);
app.use("/api/clubs", clubsRoutes);
app.use("/api/courts", courtsRoutes);
app.use("/api/slots", slotsRoutes);
app.use("/api/reservations", reservationsRoutes);
app.use("/api/club-images", clubImagesRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/club-facilities", facilitiesRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/review-images", reviewImagesRoutes);
app.use("/api/court-images", courtImagesRoutes);
app.use("/api/owner", ownerDashboardRoutes);

// fallback for unknown routes
app.use((req, res) => {
  res.status(404).json({ message: "🚫 Route not found" });
});

// start server after db check
(async () => {
  try {
    await db.query("SELECT 1 as ok");
    console.log("✅ Database connected");
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  }
})();