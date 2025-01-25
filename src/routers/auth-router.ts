import { Router } from "express";
import authController from "../controllers/auth-controller";
import {
  validateActivateAccount,
  validateAddPassword,
  validateGeneratePasswordCode,
  validateOauth,
  validateResetPassword,
  validateSignin,
  validateSignup,
  validateUpdateAccount,
  validateUpdatePassword,
} from "../middleware/validate-request";
import { requireAuth } from "../middleware/require-auth";
import { verifyRoles } from "../middleware/verify-roles";
import { UserType } from "@prisma/client";

const router = Router();

router
  .post("/create", validateSignup, authController.createAccount) // TESTED
  .post("/activate", validateActivateAccount, authController.activateAccount) // TESTED
  .post("/signin", validateSignin, authController.signin) // TESTED
  .post(
    "/forgot-password",
    validateGeneratePasswordCode,
    authController.forgotPassword
  ) // TESTED
  .post("/token", authController.refresh) // TESTED
  .post("/logout", requireAuth, authController.logout) // TESTED
  .post(
    "/restore-deleted-user/:id",
    requireAuth,
    verifyRoles([UserType.Admin]),
    authController.unDeleteUser
  ) // TESTED
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
  ) // TESTED
  .post(
    "/create-admin",
    requireAuth,
    verifyRoles([UserType.Admin]),
    validateSignup,
    authController.createAdmin
  ) // TESTED
  .post(
    "/create-editor",
    requireAuth,
    verifyRoles([UserType.Admin]),
    validateSignup,
    authController.createEditor
  ) // TESTED
  .post("/oauth-google", validateOauth, authController.oauthGoogle) // TESTED
  .patch(
    "/update",
    requireAuth,
    validateUpdateAccount,
    authController.updateAccount
  ) // TESTED
  .patch("/reset-password", validateResetPassword, authController.resetPassword) // TESTED
  .patch(
    "/update-password",
    requireAuth,
    validateUpdatePassword,
    authController.updatePassword
  ) // TESTED
  .patch(
    "/add-password",
    requireAuth,
    verifyRoles([UserType.Client]),
    validateAddPassword,
    authController.addPassword
  ) // TESTED
  .get("/profile", requireAuth, authController.getProfile) // TESTED
  .get("/has-password", requireAuth, authController.hasPassword) // TESTED
  .get(
    "/users",
    requireAuth,
    verifyRoles([UserType.Admin]),
    authController.seeUsers
  ) // TESTED
  .delete(
    "/delete/:id",
    requireAuth,
    verifyRoles([UserType.Admin]),
    authController.deleteUser
  ); // TESTED

export { router as authRouter };
