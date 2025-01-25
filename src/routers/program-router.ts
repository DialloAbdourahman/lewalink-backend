import { Router } from "express";
import programController from "../controllers/program-controller";
import { validateCreateProgram } from "../middleware/validate-request";
import { requireAuth } from "../middleware/require-auth";
import { verifyRoles } from "../middleware/verify-roles";
import { UserType } from "@prisma/client";

const router = Router();

router
  .post(
    "/",
    requireAuth,
    verifyRoles([UserType.Admin, UserType.Editor]),
    validateCreateProgram,
    programController.createProgram
  )
  .post(
    "/restore/:id",
    requireAuth,
    verifyRoles([UserType.Admin, UserType.Editor]),
    programController.restoreProgram
  )
  .patch(
    "/:id",
    requireAuth,
    verifyRoles([UserType.Admin, UserType.Editor]),
    validateCreateProgram,
    programController.updateProgram
  )
  .get("/", programController.getPrograms)
  .get(
    "/super-user-get-programs",
    requireAuth,
    verifyRoles([UserType.Admin, UserType.Editor]),
    programController.superUserGetPrograms
  )
  .get(
    "/super-user-get-program/:id",
    requireAuth,
    verifyRoles([UserType.Admin, UserType.Editor]),
    programController.superUserGetProgram
  )
  .get("/:id", programController.getProgram)
  .delete(
    "/:id",
    requireAuth,
    verifyRoles([UserType.Admin, UserType.Editor]),
    programController.deleteProgram
  );

export { router as programRouter };
