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
    verifyRoles([UserType.Admin]),
    validateCreateCourse,
    courseController.createCourse
  )
  .post(
    "/restore/:id",
    requireAuth,
    verifyRoles([UserType.Admin]),
    courseController.restoreCourse
  )
  .patch(
    "/:id",
    requireAuth,
    verifyRoles([UserType.Admin]),
    validateCreateCourse,
    courseController.updateCourse
  )
  .get("/", courseController.getCourses)
  .get(
    "/admin-get-courses",
    requireAuth,
    verifyRoles([UserType.Admin]),
    courseController.adminGetCourses
  )
  .get("/:id", courseController.getCourse)
  .get(
    "/admin-get-course/:id",
    requireAuth,
    verifyRoles([UserType.Admin]),
    courseController.adminGetCourse
  )
  .delete(
    "/:id",
    requireAuth,
    verifyRoles([UserType.Admin]),
    courseController.deleteCourse
  );

export { router as courseRouter };
