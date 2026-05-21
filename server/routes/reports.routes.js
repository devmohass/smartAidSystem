import {Router} from "express";
import {reportTransactions, reportCampaigns} from "../controllers/reports.controller.js";
import verifyToken from "../middleware/verifyToken.js";
import requireRole from "../middleware/requireRole.js";

const router = Router();

router.use(verifyToken, requireRole("admin", "donor"));

router.get("/transactions", reportTransactions);
router.get("/campaigns", reportCampaigns);

export default router;
