import { Router } from "express";
import schoolRatingController from "../controllers/school-rating-controller";
import { validateCreateSchoolRating } from "../middleware/validate-request";
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

router.patch(
  "/:id",
  requireAuth,
  verifyRoles([UserType.Client]),
  validateCreateSchoolRating,
  schoolRatingController.updateSchoolRating
);

router.delete(
  "/:id",
  requireAuth,
  verifyRoles([UserType.Client]),
  schoolRatingController.deleteSchoolRating
);

router.get("/:schoolId", requireAuth, schoolRatingController.getSchoolRatings);

export { router as schoolRatingRouter };
