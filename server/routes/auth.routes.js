import {Router} from "express";
import {login, me} from "../controllers/auth.controller.js";
import verifyToken from "../middleware/verifyToken.js";
import validate from "../middleware/validate.js";
import {loginSchema} from "../validators/auth.validators.js";

const router = Router();

router.post("/login", validate("body", loginSchema), login);
router.get("/me", verifyToken, me);

export default router;
