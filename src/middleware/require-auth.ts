import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { CODES } from "../enums/codes";
import { OrchestrationResult } from "../utils/orchestration-result";

interface UserPayload {
  id: string;
  email: string;
  type: string;
}

declare global {
  namespace Express {
    interface Request {
      currentUser?: UserPayload;
    }
  }
}

export const requireAuth = (
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

    const { id, email, type } = decoded;

    req.currentUser = {
      id,
      email,
      type,
    };

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
