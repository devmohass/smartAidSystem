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
import validate from "../middleware/validate.js";
import {
  idParamSchema,
  idAndUserIdParamSchema,
  createShopSchema,
  updateShopSchema,
  assignShopManagerSchema,
} from "../validators/shops.validators.js";

const router = Router();

router.use(verifyToken, requireRole("admin"));

router.get("/", listShops);
router.post("/", validate("body", createShopSchema), createShop);
router.get("/:id", validate("params", idParamSchema), getShop);
router.put(
  "/:id",
  validate("params", idParamSchema),
  validate("body", updateShopSchema),
  updateShop
);

router.get("/:id/report", validate("params", idParamSchema), getShopReport);

router.get("/:id/managers", validate("params", idParamSchema), listShopManagers);
router.post(
  "/:id/managers",
  validate("params", idParamSchema),
  validate("body", assignShopManagerSchema),
  assignShopManager
);
router.delete(
  "/:id/managers/:userId",
  validate("params", idAndUserIdParamSchema),
  unassignShopManager
);

export default router;
