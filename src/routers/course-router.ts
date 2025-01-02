import { Router } from "express";
import courseController from "../controllers/course-controller";
import { validateCreateCourse } from "../middleware/validate-request";
import { requireAuth } from "../middleware/require-auth";
import { verifyRoles } from "../middleware/verify-roles";
import { UserType } from "../enums/user-types";

const router = Router();

router
  .post(
    "/",
    requireAuth,
    verifyRoles([UserType.Admin, UserType.Editor]),
    validateCreateCourse,
    courseController.createCourse
  )
  .post(
    "/restore/:id",
    requireAuth,
    verifyRoles([UserType.Admin, UserType.Editor]),
    courseController.restoreCourse
  )
  .patch(
    "/:id",
    requireAuth,
    verifyRoles([UserType.Admin, UserType.Editor]),
    validateCreateCourse,
    courseController.updateCourse
  )
  .get("/", courseController.getCourses)
  .get(
    "/super-user-get-courses",
    requireAuth,
    verifyRoles([UserType.Admin, UserType.Editor]),
    courseController.superUserGetCourses
  )
  .get("/:id", courseController.getCourse)
  .get(
    "/super-user-get-course/:id",
    requireAuth,
    verifyRoles([UserType.Admin, UserType.Editor]),
    courseController.superUserGetCourse
  )
  .delete(
    "/:id",
    requireAuth,
    verifyRoles([UserType.Admin, UserType.Editor]),
    courseController.deleteCourse
  );

export { router as courseRouter };
