import {Router} from "express";
import {
  listCampaigns,
  getCampaign,
  createCampaign,
  changeCampaignStatus,
  getCampaignSummary,
} from "../controllers/campaigns.controller.js";
import {
  enrollBeneficiary,
  listEnrollments,
  updateAllocation,
} from "../controllers/enrollments.controller.js";
import verifyToken from "../middleware/verifyToken.js";
import requireRole from "../middleware/requireRole.js";
import validate from "../middleware/validate.js";
import {
  idParamSchema,
  createCampaignSchema,
  changeStatusSchema,
} from "../validators/campaigns.validators.js";

const router = Router();

router.use(verifyToken);

// Reads: admin + donor (donor is read-only per brief §8).
router.get("/", requireRole("admin", "donor"), listCampaigns);
router.get(
  "/:id",
  requireRole("admin", "donor"),
  validate("params", idParamSchema),
  getCampaign
);
router.get(
  "/:id/summary",
  requireRole("admin", "donor"),
  validate("params", idParamSchema),
  getCampaignSummary
);

// Writes: admin only.
router.post(
  "/",
  requireRole("admin"),
  validate("body", createCampaignSchema),
  createCampaign
);
router.put(
  "/:id/status",
  requireRole("admin"),
  validate("params", idParamSchema),
  validate("body", changeStatusSchema),
  changeCampaignStatus
);

// Enrollment endpoints (admin only per brief §8). Validators added in
// the enrollments slice — left bare here so this commit stays scoped
// to campaign-resource validation only.
router.post("/:id/beneficiaries", requireRole("admin"), enrollBeneficiary);
router.get("/:id/beneficiaries", requireRole("admin"), listEnrollments);
router.put("/:id/beneficiaries/:bid", requireRole("admin"), updateAllocation);

export default router;
