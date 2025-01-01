// import { Router } from "express";
// import schoolProgramController from "../controllers/school-program-controller";
// import { validateCreateSchoolProgram } from "../middleware/validate-request";
// import { requireAuth } from "../middleware/require-auth";
// import { verifyRoles } from "../middleware/verify-roles";
// import { UserType } from "../enums/user-types";

// const router = Router();

// router.post(
//   "/",
//   requireAuth,
//   verifyRoles([UserType.Admin]),
//   validateCreateSchoolProgram,
//   schoolProgramController.createSchoolProgram
// );
// //   .post(
// //     "/restore/:id",
// //     requireAuth,
// //     verifyRoles([UserType.Admin]),
// //     schoolProgramController.restoreCourse
// //   )
// //   .patch(
// //     "/:id",
// //     requireAuth,
// //     verifyRoles([UserType.Admin]),
// //     validateCreateCourse,
// //     schoolProgramController.updateCourse
// //   )
// //   .get("/", schoolProgramController.getCourses)
// //   .get(
// //     "/admin-get-courses",
// //     requireAuth,
// //     verifyRoles([UserType.Admin]),
// //     schoolProgramController.adminGetCourses
// //   )
// //   .delete(
// //     "/:id",
// //     requireAuth,
// //     verifyRoles([UserType.Admin]),
// //     schoolProgramController.deleteCourse
// //   );

// export { router as schoolProgramRouter };
