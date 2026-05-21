import {Router} from "express";
import {reportTransactions, reportCampaigns} from "../controllers/reports.controller.js";
import verifyToken from "../middleware/verifyToken.js";
import requireRole from "../middleware/requireRole.js";
import validate from "../middleware/validate.js";
import {reportTransactionsQuerySchema} from "../validators/reports.validators.js";

const router = Router();

router.use(verifyToken, requireRole("admin", "donor"));

router.get(
  "/transactions",
  validate("query", reportTransactionsQuerySchema),
  reportTransactions
);
router.get("/campaigns", reportCampaigns);

export default router;
