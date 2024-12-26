import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { CODES } from "../enums/codes";
import { OrchestrationResult } from "../utils/orchestration-result";
import { prisma } from "../prisma";

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const accessToken = req.header("Authorization")?.replace("Bearer ", "");

  if (!accessToken) {
    OrchestrationResult.unAuthorized(
      res,
      CODES.NO_ACCESS_TOKEN,
      "No access token"
    );
    return;
  }

  try {
    const decoded: any = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_JWT_KEY as string
    );

    const { id } = decoded;

    const user = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      OrchestrationResult.unAuthorized(res, CODES.NOT_FOUND, "User not found");
      return;
    }

    if (!user?.isActive) {
      OrchestrationResult.unAuthorized(
        res,
        CODES.ACCOUNT_NOT_ACTIVATED,
        "Activate your account"
      );
      return;
    }

    if (user?.isDeleted) {
      OrchestrationResult.unAuthorized(
        res,
        CODES.ACCOUNT_DELETED,
        "Your account has been deleted, contact support."
      );
      return;
    }

    req.currentUser = user;

    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      OrchestrationResult.unAuthorized(
        res,
        CODES.ACCESS_TOKEN_EXPIRED,
        "Access token has expired."
      );
      return;
    } else {
      OrchestrationResult.unAuthorized(
        res,
        CODES.CANNOT_DECODE_TOKEN,
        "Cannot decode accessToken token"
      );
      return;
    }
  }
};
