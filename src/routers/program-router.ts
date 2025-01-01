import { Router } from "express";
import programController from "../controllers/program-controller";
import { validateCreateProgram } from "../middleware/validate-request";
import { requireAuth } from "../middleware/require-auth";
import { verifyRoles } from "../middleware/verify-roles";
import { UserType } from "../enums/user-types";

const router = Router();

router
  .post(
    "/",
    requireAuth,
    verifyRoles([UserType.Admin]),
    validateCreateProgram,
    programController.createProgram
  )
  .post(
    "/restore/:id",
    requireAuth,
    verifyRoles([UserType.Admin]),
    programController.restoreProgram
  )
  .patch(
    "/:id",
    requireAuth,
    verifyRoles([UserType.Admin]),
    validateCreateProgram,
    programController.updateProgram
  )
  .get("/", programController.getPrograms)
  .get(
    "/admin-get-programs",
    requireAuth,
    verifyRoles([UserType.Admin]),
    programController.adminGetPrograms
  )
  .get(
    "/admin-get-program/:id",
    requireAuth,
    verifyRoles([UserType.Admin]),
    programController.adminGetProgram
  )
  .get("/:id", programController.getProgram)
  .delete(
    "/:id",
    requireAuth,
    verifyRoles([UserType.Admin]),
    programController.deleteProgram
  );

export { router as programRouter };