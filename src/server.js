import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import db from "./db.js";
import authRoutes from "./routes/auth.js";
import clubsRoutes from "./routes/clubs.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.send("✅ Racket API is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/clubs", clubsRoutes);

db.connect()
  .then(() => {
    console.log("✅ DB connected");
    app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("❌ DB connection error:", err.message);
  });