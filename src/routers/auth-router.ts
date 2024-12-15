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
  .post("/logout", requireAuth, authController.logout)
  .patch("/", requireAuth, validateUpdateAccount, authController.updateAccount)
  .patch("/reset-password", validateResetPassword, authController.resetPassword)
  .patch(
    "/update-password",
    requireAuth,
    validateUpdatePassword,
    authController.updatePassword
  )
  .get("/", requireAuth, authController.getProfile);

export { router as authRouter };
