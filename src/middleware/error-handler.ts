import { Response, Request, NextFunction } from "express";
import { CODES } from "../enums/codes";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // MULTER POTENTIAL ERROR
  const multerPotentialError: any = err;
  if (multerPotentialError?.code === "LIMIT_FILE_SIZE") {
    res.status(400).send({
      code: CODES.MULTER_SIZE_ERROR,
      message: "File too large",
    });
    return;
  }

  // UNEXPECTED ERROR
  console.error("Unexpected error occured", err);
  res.status(500).send({
    code: CODES.UNEXPECTED_ERROR,
    message: "Something went wrong",
  });
};
