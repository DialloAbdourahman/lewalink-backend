import { body, ValidationChain } from "express-validator";
import { validationResult } from "express-validator";
import { Request, Response, NextFunction, RequestHandler } from "express";
import { OrchestrationResult } from "../utils/orchestration-result";
import { CODES } from "../enums/codes";

const validateRequest: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    OrchestrationResult.badRequest(
      res,
      CODES.VALIDATION_REQUEST_ERROR,
      `${errors.array().map((error) => `${error.msg}`)}, `
    );
    return;
  }
  next();
};

// Type alias for Validator Middleware
type ValidatorMiddleware = ValidationChain | RequestHandler;

export const validateSignup: ValidatorMiddleware[] = [
  body("name").exists().withMessage("Name must be valid"),
  body("email").isEmail().withMessage("Email must be valid"),
  body("password")
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage("Password must be between 5 and 20 characters"),
  validateRequest,
];

export const validateSignin: ValidatorMiddleware[] = [
  body("email").isEmail().withMessage("Email must be valid"),
  body("password")
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage("Password must be between 5 and 20 characters"),
  validateRequest,
];

export const validateUpdatePassword: ValidatorMiddleware[] = [
  body("oldPassword").exists().withMessage("Old password must be valid"),
  body("newPassword")
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage("Password must be between 5 and 20 characters"),
  body("confirmNewPassword")
    .exists()
    .withMessage("Confirm new password must be provided"),
  validateRequest,
];

export const validateAddPassword: ValidatorMiddleware[] = [
  body("newPassword")
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage("Password must be between 5 and 20 characters"),
  body("confirmNewPassword")
    .exists()
    .withMessage("Confirm new password must be provided"),
  validateRequest,
];

export const validateUpdateAccount: ValidatorMiddleware[] = [
  body("name").exists().withMessage("Name must be valid"),
  validateRequest,
];

export const validateActivateAccount: ValidatorMiddleware[] = [
  body("code").exists().withMessage("Provide a code"),

  validateRequest,
];

export const validateOauth: ValidatorMiddleware[] = [
  body("code").exists().withMessage("Provide a code"),

  validateRequest,
];

export const validateGeneratePasswordCode: ValidatorMiddleware[] = [
  body("email").isEmail().withMessage("Email must be valid"),

  validateRequest,
];

export const validateResetPassword: ValidatorMiddleware[] = [
  body("code").exists().withMessage("Provide a code"),
  body("password")
    .trim()
    .isLength({ min: 4, max: 20 })
    .withMessage("Password must be between 4 and 20 characters"),
  validateRequest,
];

export const validateCreateCourse: ValidatorMiddleware[] = [
  body("code")
    .isLength({ min: 3, max: 5 })
    .withMessage("Code must be between 3 and 5 characters"),

  body("title")
    .isLength({ min: 4, max: 50 })
    .withMessage("Title must be between 4 and 50 characters"),
  body("description").exists().withMessage("Provide a description"),
  body("credits").exists().isInt().withMessage("Provide a credits"),
  validateRequest,
];

export const validateCreateProgram: ValidatorMiddleware[] = [
  body("type").exists().withMessage("Provide a type"),
  body("name")
    .isLength({ min: 4, max: 50 })
    .withMessage("Name must be between 4 and 50 characters"),
  body("description").exists().withMessage("Provide a description"),
  body("duration").exists().isFloat().withMessage("Provide a duration"),
  validateRequest,
];

export const validateCreateSchoolProgram: ValidatorMiddleware[] = [
  body("price").exists().isFloat().withMessage("Provide a price"),
  body("schoolId").exists().withMessage("Provide a school id"),
  body("programId").exists().withMessage("Provide a program id"),
  validateRequest,
];
