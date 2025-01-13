import { Router } from "express";
import schoolRatingController from "../controllers/school-rating-controller";
import {
  validateCreateProgram,
  validateCreateSchoolRating,
} from "../middleware/validate-request";
import { requireAuth } from "../middleware/require-auth";
import { verifyRoles } from "../middleware/verify-roles";
import { UserType } from "../enums/user-types";

const router = Router();

router.post(
  "/",
  requireAuth,
  verifyRoles([UserType.Client]),
  validateCreateSchoolRating,
  schoolRatingController.createSchoolRating
);
//   .post(
//     "/restore/:id",
//     requireAuth,
//     verifyRoles([UserType.Admin, UserType.Editor]),
//     schoolRatingController.restoreProgram
//   )
//   .patch(
//     "/:id",
//     requireAuth,
//     verifyRoles([UserType.Admin, UserType.Editor]),
//     validateCreateProgram,
//     schoolRatingController.updateProgram
//   )
//   .get("/", schoolRatingController.getPrograms)
//   .get(
//     "/super-user-get-programs",
//     requireAuth,
//     verifyRoles([UserType.Admin, UserType.Editor]),
//     schoolRatingController.superUserGetPrograms
//   )
//   .get(
//     "/super-user-get-program/:id",
//     requireAuth,
//     verifyRoles([UserType.Admin, UserType.Editor]),
//     schoolRatingController.superUserGetProgram
//   )
//   .get("/:id", schoolRatingController.getProgram)
//   .delete(
//     "/:id",
//     requireAuth,
//     verifyRoles([UserType.Admin, UserType.Editor]),
//     schoolRatingController.deleteProgram
//   );

export { router as schoolRatingRouter };
