import {Router} from "express";
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/users.controller.js";
import verifyToken from "../middleware/verifyToken.js";
import requireRole from "../middleware/requireRole.js";
import validate from "../middleware/validate.js";
import {
  idParamSchema,
  createUserSchema,
  updateUserSchema,
} from "../validators/users.validators.js";

const router = Router();

router.use(verifyToken, requireRole("admin"));

router.get("/", listUsers);
router.get("/:id", validate("params", idParamSchema), getUser);
router.post("/", validate("body", createUserSchema), createUser);
router.put(
  "/:id",
  validate("params", idParamSchema),
  validate("body", updateUserSchema),
  updateUser
);
router.delete("/:id", validate("params", idParamSchema), deleteUser);

export default router;
