import { Router } from "express";
import authController from "../controllers/authController";
import {
  validateActivateAccount,
  validateSignin,
  validateSignup,
} from "../middleware/validate-request";

const router = Router();

router
  .post("/", validateSignup, authController.createAccount)
  .post("/activate", validateActivateAccount, authController.activateAccount)
  .post("/signin", validateSignin, authController.signin);

export { router as authRouter };
