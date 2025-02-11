import { Router } from "express";
import programCourseController from "../controllers/program-course-controller";
import { validateCreateProgramCourse } from "../middleware/validate-request";
import { requireAuth } from "../middleware/require-auth";
import { verifyRoles } from "../middleware/verify-roles";
import { UserType } from "@prisma/client";

const router = Router();

router.post(
  "/",
  requireAuth,
  verifyRoles([UserType.Admin, UserType.Editor]),
  validateCreateProgramCourse,
  programCourseController.createProgramCourse
);

router.delete(
  "/:id",
  requireAuth,
  verifyRoles([UserType.Admin, UserType.Editor]),
  programCourseController.deleteProgramCourse
);

router.post(
  "/restore/:id",
  requireAuth,
  verifyRoles([UserType.Admin, UserType.Editor]),
  programCourseController.restoreProgramCourse
);

router.get("/courses/:programId", programCourseController.getProgramCourses);

router.get(
  "/super-user-get-courses/:programId",
  requireAuth,
  verifyRoles([UserType.Admin, UserType.Editor]),
  programCourseController.superUserGetsProgramCourses
);

export { router as programCourseRouter };
