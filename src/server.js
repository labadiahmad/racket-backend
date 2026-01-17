import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import clubsRoutes from "./routes/clubs.js";
import courtsRoutes from "./routes/courts.js";
import slotsRoutes from "./routes/slots.js";
import reservationsRoutes from "./routes/reservations.js";
import clubImagesRoutes from "./routes/club-images.js";
import uploadRoutes from "./routes/upload.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/", (req, res) => res.send("Racket API is running ✅"));


app.use("/api/auth", authRoutes);
app.use("/api/clubs", clubsRoutes);
app.use("/api/courts", courtsRoutes);
app.use("/api/slots", slotsRoutes);
app.use("/api/reservations", reservationsRoutes);
app.use("/api/club-images", clubImagesRoutes);
app.use("/api/upload", uploadRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "🚫 Route not found" });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});