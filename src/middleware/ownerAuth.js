export default function ownerAuth(req, res, next) {
  const role = req.headers["x-role"];
if (role === "owner") next();
else return res.status(403).json({ message: "Owner access only" });
}