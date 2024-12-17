import { Router } from "express";
import authController from "../controllers/authController";
import {
  validateActivateAccount,
  validateGeneratePasswordCode,
  validateResetPassword,
  validateSignin,
  validateSignup,
  validateUpdateAccount,
  validateUpdatePassword,
} from "../middleware/validate-request";
import { requireAuth } from "../middleware/require-auth";
import { verifyRoles } from "../middleware/verify-roles";
import { UserType } from "../enums/user-types";

const router = Router();

router
  .post("/", validateSignup, authController.createAccount)
  .post("/activate", validateActivateAccount, authController.activateAccount)
  .post("/signin", validateSignin, authController.signin)
  .post(
    "/forgot-password",
    validateGeneratePasswordCode,
    authController.forgotPassword
  )
  .post("/token", authController.refresh)
  .post("/logout", requireAuth, authController.logout)
  .post(
    "/undelete/:id",
    requireAuth,
    verifyRoles([UserType.Admin]),
    authController.unDeleteUser
  )
  .post(
    "/admin-deactivates-account/:id",
    requireAuth,
    verifyRoles([UserType.Admin]),
    authController.adminDeactivateAccount
  )
  .post(
    "/admin-activates-account/:id",
    requireAuth,
    verifyRoles([UserType.Admin]),
    authController.adminActivateAccount
  )
  .post(
    "/create-admin",
    requireAuth,
    verifyRoles([UserType.Admin]),
    authController.createAdmin
  )
  .patch("/", requireAuth, validateUpdateAccount, authController.updateAccount)
  .patch("/reset-password", validateResetPassword, authController.resetPassword)
  .patch(
    "/update-password",
    requireAuth,
    validateUpdatePassword,
    authController.updatePassword
  )
  .get("/", requireAuth, authController.getProfile)
  .get(
    "/users",
    requireAuth,
    verifyRoles([UserType.Admin]),
    authController.seeUsers
  )
  .delete(
    "/:id",
    requireAuth,
    verifyRoles([UserType.Admin]),
    authController.deleteUser
  );

export { router as authRouter };
