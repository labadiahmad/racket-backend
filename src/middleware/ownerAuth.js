export default function ownerAuth(req, res, next) {
  const role = req.headers["x-role"];
  const userId = req.headers["x-user-id"];

  if (role === "owner") {
    req.role = role;
    req.userId = parseInt(userId, 10);
    return next();
  }

  return res.status(403).json({ message: "Owner access only" });
}