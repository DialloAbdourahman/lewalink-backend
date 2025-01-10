import { Router } from "express";
import schoolController from "../controllers/school-controller";
import { validateCreateSchool } from "../middleware/validate-request";
import { requireAuth } from "../middleware/require-auth";
import { verifyRoles } from "../middleware/verify-roles";
import { UserType } from "../enums/user-types";
import { upload } from "../utils/multer";

const router = Router();

router.post(
  "/",
  requireAuth,
  verifyRoles([UserType.Admin, UserType.Editor]),
  upload.array("images"),
  validateCreateSchool,
  schoolController.createSchool
);

router.post(
  "/add-images/:id",
  requireAuth,
  verifyRoles([UserType.Admin, UserType.Editor]),
  upload.array("images"),
  schoolController.addImages
);

router.post(
  "/restore/:id",
  requireAuth,
  verifyRoles([UserType.Admin, UserType.Editor]),
  schoolController.restoreSchool
);

router.patch(
  "/:id",
  requireAuth,
  verifyRoles([UserType.Admin, UserType.Editor]),
  validateCreateSchool,
  schoolController.updateSchool
);

router.get("/visit/:id", schoolController.visitSchool);

router.get(
  "/super-user-see-schools",
  requireAuth,
  verifyRoles([UserType.Admin, UserType.Editor]),
  schoolController.superUserSeeSchools
);

router.get(
  "/super-user-see-school/:id",
  requireAuth,
  verifyRoles([UserType.Admin, UserType.Editor]),
  schoolController.superUserSeeSchool
);

router.get(
  "/geolocalization/:id",
  schoolController.seeSchoolWithGeolocalization
);

router.get("/search", schoolController.searchSchools);

router.get("/:id", schoolController.seeSchool);

router.get("/", schoolController.searchSchools);

router.delete(
  "/delete-image",
  requireAuth,
  verifyRoles([UserType.Admin, UserType.Editor]),
  schoolController.deleteImage
);

router.delete(
  "/:id",
  requireAuth,
  verifyRoles([UserType.Admin, UserType.Editor]),
  schoolController.deleteSchool
);

export { router as schoolRouter };
