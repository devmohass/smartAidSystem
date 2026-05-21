import jwt from "jsonwebtoken";

export default function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({error: "Missing or invalid Authorization header"});
  }

  const token = auth.slice("Bearer ".length);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {id: decoded.sub, role: decoded.role, email: decoded.email};
    return next();
  } catch (err) {
    return res.status(401).json({error: "Invalid or expired token"});
  }
}
