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

const router = Router();

router.use(verifyToken);

// Reads: admin + donor (donor is read-only per brief §8).
router.get("/", requireRole("admin", "donor"), listCampaigns);
router.get("/:id", requireRole("admin", "donor"), getCampaign);
router.get("/:id/summary", requireRole("admin", "donor"), getCampaignSummary);

// Writes: admin only.
router.post("/", requireRole("admin"), createCampaign);
router.put("/:id/status", requireRole("admin"), changeCampaignStatus);

// Enrollment endpoints (admin only per brief §8).
router.post("/:id/beneficiaries", requireRole("admin"), enrollBeneficiary);
router.get("/:id/beneficiaries", requireRole("admin"), listEnrollments);
router.put("/:id/beneficiaries/:bid", requireRole("admin"), updateAllocation);

export default router;
