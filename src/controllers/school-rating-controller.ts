import { Request, Response } from "express";
import { prisma } from "../prisma";
import { OrchestrationResult } from "../utils/orchestration-result";
import { CODES } from "../enums/codes";
import { getNameAndPageAndItemsPerPageFromRequestQuery } from "../utils/get-name-and-page-and-items-per-page-from-request";
import { isEnumValue } from "../utils/is-enum-value";
import { ProgramField, ProgramType } from "@prisma/client";

const createSchoolRating = async (req: Request, res: Response) => {
  const { schoolId, stars, message } = req.body;

  const school = await prisma.school.findUnique({
    where: {
      id: schoolId,
    },
  });

  if (!school) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "School does not exist");
    return;
  }

  const existingRating = await prisma.schoolRating.findFirst({
    where: {
      schoolId,
      clientId: req.currentUser?.id,
      isDeleted: false,
    },
  });

  if (existingRating) {
    OrchestrationResult.badRequest(
      res,
      CODES.DUPLICATE_RATING,
      "Cannot rate a school twice"
    );
    return;
  }

  if (stars < 1 || stars > 5) {
    OrchestrationResult.badRequest(
      res,
      CODES.VALIDATION_REQUEST_ERROR,
      "Start should be between 1 and 5 inclusive"
    );
    return;
  }

  const schoolRating = await prisma.schoolRating.create({
    data: {
      schoolId,
      stars,
      message,
      clientId: req.currentUser?.id as string,
    },
    select: {
      id: true,
      stars: true,
      message: true,
      client: {
        select: {
          name: true,
        },
      },
      schoolId: true,
    },
  });

  const totalSchoolRating = await prisma.schoolRating.aggregate({
    _avg: {
      stars: true,
    },
    where: {
      schoolId: schoolRating.schoolId,
      isDeleted: false,
    },
  });

  await prisma.school.update({
    where: {
      id: schoolRating.schoolId,
    },
    data: {
      rating: totalSchoolRating._avg.stars as number,
    },
  });

  OrchestrationResult.item(res, schoolRating, 201);
};

const updateSchoolRating = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { schoolId, stars, message } = req.body;

  if (!id) {
    OrchestrationResult.badRequest(
      res,
      CODES.VALIDATION_REQUEST_ERROR,
      "Provide an ID"
    );
    return;
  }

  const existingSchoolRating = await prisma.schoolRating.findFirst({
    where: {
      id,
      schoolId,
      isDeleted: false,
    },
  });

  if (!existingSchoolRating) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "School does not exist");
    return;
  }

  if (existingSchoolRating.clientId !== req.currentUser?.id) {
    OrchestrationResult.badRequest(
      res,
      CODES.NOT_YOUR_RATING,
      "You are not allowed to update someone else's rating"
    );
    return;
  }

  if (stars < 1 || stars > 5) {
    OrchestrationResult.badRequest(
      res,
      CODES.VALIDATION_REQUEST_ERROR,
      "Start should be between 1 and 5 inclusive"
    );
    return;
  }

  const rating = await prisma.schoolRating.update({
    where: {
      id: existingSchoolRating.id,
    },
    data: {
      stars,
      message,
    },
    select: {
      id: true,
      stars: true,
      message: true,
      client: {
        select: {
          name: true,
        },
      },
      schoolId: true,
    },
  });

  if (existingSchoolRating.stars !== rating.stars) {
    const totalSchoolRating = await prisma.schoolRating.aggregate({
      _avg: {
        stars: true,
      },
      where: {
        schoolId: rating.schoolId,
        isDeleted: false,
      },
    });

    await prisma.school.update({
      where: {
        id: rating.schoolId,
      },
      data: {
        rating: totalSchoolRating._avg.stars as number,
      },
    });
  }

  OrchestrationResult.item(res, rating, 200);
};

const deleteSchoolRating = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    OrchestrationResult.badRequest(
      res,
      CODES.VALIDATION_REQUEST_ERROR,
      "Provide an ID"
    );
    return;
  }

  const existingSchoolRating = await prisma.schoolRating.findFirst({
    where: {
      id,
    },
  });

  if (!existingSchoolRating) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "School does not exist");
    return;
  }

  if (existingSchoolRating.clientId !== req.currentUser?.id) {
    OrchestrationResult.badRequest(
      res,
      CODES.NOT_YOUR_RATING,
      "You are not allowed to update someone else's rating"
    );
    return;
  }

  const rating = await prisma.schoolRating.update({
    where: {
      id: existingSchoolRating.id,
    },
    data: {
      isDeleted: true,
    },
    select: {
      id: true,
      stars: true,
      message: true,
      client: {
        select: {
          name: true,
        },
      },
      schoolId: true,
    },
  });

  const totalSchoolRating = await prisma.schoolRating.aggregate({
    _avg: {
      stars: true,
    },
    where: {
      schoolId: rating.schoolId,
      isDeleted: false,
    },
  });

  await prisma.school.update({
    where: {
      id: rating.schoolId,
    },
    data: {
      rating: totalSchoolRating._avg.stars as number,
    },
  });

  OrchestrationResult.success(res);
};

const getSchoolRatings = async (req: Request, res: Response) => {
  const { schoolId } = req.params;

  if (!schoolId) {
    OrchestrationResult.badRequest(
      res,
      CODES.VALIDATION_REQUEST_ERROR,
      "Provide a schoolID"
    );
    return;
  }

  const { itemsPerPage, page, skip } =
    getNameAndPageAndItemsPerPageFromRequestQuery(req);

  const courses = await prisma.schoolRating.findMany({
    where: {
      schoolId,
      isDeleted: false,
    },
    skip: skip,
    take: itemsPerPage,
    select: {
      id: true,
      stars: true,
      message: true,
      client: {
        select: {
          name: true,
        },
      },
      schoolId: true,
    },
  });
  const count = await prisma.schoolRating.count({
    where: {
      schoolId,
      isDeleted: false,
    },
  });

  OrchestrationResult.list(res, courses, count, itemsPerPage, page);
};

export default {
  createSchoolRating,
  updateSchoolRating,
  deleteSchoolRating,
  getSchoolRatings,
};
