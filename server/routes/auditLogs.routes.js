import {Router} from "express";
import {listAuditLogs} from "../controllers/auditLogs.controller.js";
import verifyToken from "../middleware/verifyToken.js";
import requireRole from "../middleware/requireRole.js";

const router = Router();

router.use(verifyToken, requireRole("admin"));

router.get("/", listAuditLogs);

export default router;
