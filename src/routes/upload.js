import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.query.folder;

    let dest = "uploads";
    if (folder === "clubs") dest = "uploads/clubs";
    if (folder === "avatars") dest = "uploads/avatars";

    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Only jpg/png/webp images are allowed"));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, 
});

router.post("/", (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded. Use form-data key: file" });
    }

    const folder = req.query.folder ? `/${req.query.folder}` : "";
    const url = `/uploads${folder}/${req.file.filename}`;

    return res.status(201).json({ url });
  });
});

export default router;