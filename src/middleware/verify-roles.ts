import { Request, Response, NextFunction } from "express";
import { UserType } from "../enums/user-types";
import { OrchestrationResult } from "../utils/orchestration-result";
import { CODES } from "../enums/codes";

export const verifyRoles = (roles: UserType[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (roles.includes(req.currentUser?.type as UserType)) {
      next();
    } else {
      OrchestrationResult.unAuthorized(
        res,
        CODES.NOT_ALLOWED,
        "You are not allowed to perform this action."
      );
      return;
    }
  };
};
