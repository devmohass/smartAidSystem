import {Router} from "express";
import {
  listShops,
  getShop,
  createShop,
  updateShop,
  listShopManagers,
  assignShopManager,
  unassignShopManager,
  getShopReport,
} from "../controllers/shops.controller.js";
import verifyToken from "../middleware/verifyToken.js";
import requireRole from "../middleware/requireRole.js";

const router = Router();

router.use(verifyToken, requireRole("admin"));

router.get("/", listShops);
router.post("/", createShop);
router.get("/:id", getShop);
router.put("/:id", updateShop);

router.get("/:id/report", getShopReport);

router.get("/:id/managers", listShopManagers);
router.post("/:id/managers", assignShopManager);
router.delete("/:id/managers/:userId", unassignShopManager);

export default router;
