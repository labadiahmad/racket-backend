export default function userAuth(req, res, next) {
  const role = req.headers["x-role"];
  const userId = req.headers["x-user-id"];

  if (!role || !userId) {
    return res.status(401).json({ message: "Missing auth headers" });
  }

  if (role === "user" || role === "owner" || role === "admin") {
    req.role = role;
    req.userId = parseInt(userId, 10);
    return next();
  }

  return res.status(403).json({ message: "Not allowed" });
}