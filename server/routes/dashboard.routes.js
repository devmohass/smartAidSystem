import {Router} from "express";
import {getDashboard} from "../controllers/dashboard.controller.js";
import verifyToken from "../middleware/verifyToken.js";
import requireRole from "../middleware/requireRole.js";

const router = Router();

router.use(verifyToken, requireRole("admin", "donor"));

router.get("/", getDashboard);

export default router;
