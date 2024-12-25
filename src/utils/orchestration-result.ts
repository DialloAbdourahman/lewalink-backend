import { Response } from "express";
import { CODES } from "../enums/codes";

export class OrchestrationResult {
  static list(
    res: Response,
    data: any[],
    totalItems: number,
    itemsPerPage: number,
    page: number
  ) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    res.status(200).json({
      code: CODES.SUCCESS,
      totalPages,
      itemsPerPage,
      page,
      data,
    });
    return;
  }

  static item(res: Response, data: any, status?: number) {
    const stat = status || 200;
    res.status(stat).json({
      code: CODES.SUCCESS,
      data,
    });
    return;
  }

  static success(res: Response, status?: number) {
    const stat = status || 200;
    res.status(stat).json({
      code: CODES.SUCCESS,
    });
    return;
  }

  static badRequest(res: Response, code: CODES, message: string) {
    res.status(400).json({
      code,
      message,
    });
    return;
  }

  static unAuthorized(res: Response, code: CODES, message: string) {
    res.status(401).json({
      code,
      message,
    });
    return;
  }

  static notFound(res: Response, code: CODES, message: string) {
    res.status(404).json({
      code,
      message,
    });
    return;
  }

  static invalidData(res: Response, message: string) {
    res.status(400).json({
      code: CODES.VALIDATION_REQUEST_ERROR,
      message,
    });
    return;
  }

  static serverError(res: Response, code: CODES, message: string) {
    res.status(500).json({
      code,
      message,
    });
    return;
  }
}
