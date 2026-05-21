import {Router} from "express";
import {
  listBeneficiaries,
  searchBeneficiary,
  getBeneficiary,
  createBeneficiary,
  updateBeneficiary,
} from "../controllers/beneficiaries.controller.js";
import verifyToken from "../middleware/verifyToken.js";
import requireRole from "../middleware/requireRole.js";

const router = Router();

// All routes require auth; specific role rules applied per-route.
router.use(verifyToken);

// Search is usable by admin AND shop_manager (mobile lookup at the till).
// Must come before /:id so "search" isn't treated as an id.
router.get("/search", requireRole("admin", "shop_manager"), searchBeneficiary);

// Everything else is admin-only.
router.get("/", requireRole("admin"), listBeneficiaries);
router.post("/", requireRole("admin"), createBeneficiary);
router.get("/:id", requireRole("admin"), getBeneficiary);
router.put("/:id", requireRole("admin"), updateBeneficiary);

export default router;
