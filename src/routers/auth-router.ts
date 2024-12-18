import { Router } from "express";
import authController from "../controllers/auth-controller";
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
  .post("/create", validateSignup, authController.createAccount)
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
    "/restore-deleted-user/:id",
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
    validateSignup,
    authController.createAdmin
  )
  .patch(
    "/update",
    requireAuth,
    validateUpdateAccount,
    authController.updateAccount
  )
  .patch("/reset-password", validateResetPassword, authController.resetPassword)
  .patch(
    "/update-password",
    requireAuth,
    validateUpdatePassword,
    authController.updatePassword
  )
  .get("/profile", requireAuth, authController.getProfile)
  .get(
    "/users",
    requireAuth,
    verifyRoles([UserType.Admin]),
    authController.seeUsers
  )
  .delete(
    "/delete/:id",
    requireAuth,
    verifyRoles([UserType.Admin]),
    authController.deleteUser
  );

export { router as authRouter };
