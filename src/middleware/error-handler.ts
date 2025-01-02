import { Response, Request, NextFunction } from "express";
import { CODES } from "../enums/codes";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // MULTER TYPE ERROR
  const multerPotentialTypeError: any = err;
  if (multerPotentialTypeError?.code === CODES.MULTER_IMAGE_TYPE_ERROR) {
    res.status(400).send({
      code: CODES.MULTER_IMAGE_TYPE_ERROR,
      message:
        "The uploaded file type is not allowed. Please upload an image with one of the following types: image/jpeg, image/png, image/gif, image/bmp, image/webp, image/tiff, image/svg+xml.",
    });
    return;
  }

  // MULTER SIZE ERROR
  const multerPotentialSizeError: any = err;
  if (multerPotentialSizeError?.code === "LIMIT_FILE_SIZE") {
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
