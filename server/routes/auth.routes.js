import {Router} from "express";
import rateLimit from "express-rate-limit";
import {login, me} from "../controllers/auth.controller.js";
import verifyToken from "../middleware/verifyToken.js";
import validate from "../middleware/validate.js";
import {loginSchema} from "../validators/auth.validators.js";

const router = Router();

// Throttle credential stuffing / brute force: 10 attempts per IP per 15 min.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {error: "Too many login attempts. Please try again in a few minutes."},
});

router.post("/login", loginLimiter, validate("body", loginSchema), login);
router.get("/me", verifyToken, me);

export default router;
