import {Router} from "express";
import {login, me} from "../controllers/auth.controller.js";
import verifyToken from "../middleware/verifyToken.js";

const router = Router();

router.post("/login", login);
router.get("/me", verifyToken, me);

export default router;
