export default function ownerAuth(req, res, next) {
  const role = req.headers["x-role"];

  if (role === "owner" || role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Owner/Admin access only" });
  }
}