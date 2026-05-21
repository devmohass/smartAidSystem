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

const router = Router();

router.use(verifyToken, requireRole("admin"));

router.get("/", listUsers);
router.get("/:id", getUser);
router.post("/", createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
