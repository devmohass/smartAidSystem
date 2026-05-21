import {Router} from "express";
import {listAuditLogs} from "../controllers/auditLogs.controller.js";
import verifyToken from "../middleware/verifyToken.js";
import requireRole from "../middleware/requireRole.js";
import validate from "../middleware/validate.js";
import {auditLogsQuerySchema} from "../validators/auditLogs.validators.js";

const router = Router();

router.use(verifyToken, requireRole("admin"));

router.get("/", validate("query", auditLogsQuerySchema), listAuditLogs);

export default router;
