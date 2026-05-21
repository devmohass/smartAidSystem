import {Router} from "express";
import {
  processTransaction,
  listTransactions,
  getTransaction,
} from "../controllers/transactions.controller.js";
import verifyToken from "../middleware/verifyToken.js";
import requireRole from "../middleware/requireRole.js";

const router = Router();

router.use(verifyToken);

// shop_manager creates per brief §8.
router.post("/", requireRole("shop_manager"), processTransaction);

// admin + donor read per brief §8.
router.get("/", requireRole("admin", "donor"), listTransactions);
router.get("/:id", requireRole("admin", "donor"), getTransaction);

export default router;
