import { Router } from "express";
import schoolProgramController from "../controllers/school-program-controller";
import {
  validateCreateSchoolProgram,
  validateUpdateSchoolProgram,
} from "../middleware/validate-request";
import { requireAuth } from "../middleware/require-auth";
import { verifyRoles } from "../middleware/verify-roles";
import { UserType } from "@prisma/client";

const router = Router();

router.post(
  "/",
  requireAuth,
  verifyRoles([UserType.Admin, UserType.Editor]),
  validateCreateSchoolProgram,
  schoolProgramController.createSchoolProgram
);

router.patch(
  "/:id",
  requireAuth,
  verifyRoles([UserType.Admin, UserType.Editor]),
  validateUpdateSchoolProgram,
  schoolProgramController.updateSchoolProgram
);

router.delete(
  "/:id",
  requireAuth,
  verifyRoles([UserType.Admin, UserType.Editor]),
  schoolProgramController.deleteSchoolProgram
);

router.post(
  "/restore/:id",
  requireAuth,
  verifyRoles([UserType.Admin, UserType.Editor]),
  schoolProgramController.restoreSchoolProgram
);

router.get("/programs/:schoolId", schoolProgramController.getSchoolPrograms);

router.get(
  "/super-user-get-programs/:schoolId",
  requireAuth,
  verifyRoles([UserType.Admin, UserType.Editor]),
  schoolProgramController.superUserGetSchoolPrograms
);

export { router as schoolProgramRouter };
