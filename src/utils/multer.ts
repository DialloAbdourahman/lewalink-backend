import multer from "multer";
import { OrchestrationResult } from "./orchestration-result";
import { CODES } from "../enums/codes";

const fileSize = 5 * 1024 * 1024;

class FileTypeError extends Error {
  code: string;

  constructor(message: string, code: CODES.MULTER_IMAGE_TYPE_ERROR) {
    super(message);
    this.code = code;
    Object.setPrototypeOf(this, FileTypeError.prototype);
  }
}

export const upload = multer({
  limits: { fileSize }, // Limit file size to 50MB
  fileFilter(req, file, cb) {
    // Check for video file types
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/bmp",
      "image/webp",
      "image/tiff",
      "image/svg+xml",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      const error = new FileTypeError(
        "Only image files are allowed!",
        CODES.MULTER_IMAGE_TYPE_ERROR
      );
      error.code = CODES.MULTER_IMAGE_TYPE_ERROR;
      return cb(error);
    }

    cb(null, true);
  },
});
