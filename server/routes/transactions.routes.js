import {Router} from "express";
import {
  processTransaction,
  listTransactions,
  getTransaction,
} from "../controllers/transactions.controller.js";
import verifyToken from "../middleware/verifyToken.js";
import requireRole from "../middleware/requireRole.js";
import validate from "../middleware/validate.js";
import {
  idParamSchema,
  processTransactionSchema,
  listQuerySchema,
} from "../validators/transactions.validators.js";

const router = Router();

router.use(verifyToken);

// shop_manager creates per brief §8.
router.post(
  "/",
  requireRole("shop_manager"),
  validate("body", processTransactionSchema),
  processTransaction
);

// admin + donor read per brief §8.
router.get("/", requireRole("admin", "donor"), validate("query", listQuerySchema), listTransactions);
router.get(
  "/:id",
  requireRole("admin", "donor"),
  validate("params", idParamSchema),
  getTransaction
);

export default router;
