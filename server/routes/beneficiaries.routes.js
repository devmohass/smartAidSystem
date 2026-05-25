import {Router} from "express";
import {
  listBeneficiaries,
  searchBeneficiary,
  getBeneficiary,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
} from "../controllers/beneficiaries.controller.js";
import verifyToken from "../middleware/verifyToken.js";
import requireRole from "../middleware/requireRole.js";
import validate from "../middleware/validate.js";
import {
  idParamSchema,
  searchQuerySchema,
  listQuerySchema,
  createBeneficiarySchema,
  updateBeneficiarySchema,
} from "../validators/beneficiaries.validators.js";

const router = Router();

router.use(verifyToken);

// Search is usable by admin AND shop_manager (mobile lookup at the till).
// Must come before /:id so "search" isn't treated as an id.
router.get(
  "/search",
  requireRole("admin", "shop_manager"),
  validate("query", searchQuerySchema),
  searchBeneficiary
);

// Everything else is admin-only.
router.get("/", requireRole("admin"), validate("query", listQuerySchema), listBeneficiaries);
router.post(
  "/",
  requireRole("admin"),
  validate("body", createBeneficiarySchema),
  createBeneficiary
);
router.get(
  "/:id",
  requireRole("admin"),
  validate("params", idParamSchema),
  getBeneficiary
);
router.put(
  "/:id",
  requireRole("admin"),
  validate("params", idParamSchema),
  validate("body", updateBeneficiarySchema),
  updateBeneficiary
);
router.delete(
  "/:id",
  requireRole("admin"),
  validate("params", idParamSchema),
  deleteBeneficiary
);

export default router;
