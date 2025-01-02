import { Request, Response } from "express";
import { prisma } from "../prisma";
import { OrchestrationResult } from "../utils/orchestration-result";
import { CODES } from "../enums/codes";
import { getNameAndPageAndItemsPerPageFromRequestQuery } from "../utils/get-name-and-page-and-items-per-page-from-request";

const createCourse = async (req: Request, res: Response) => {
  let { code, title, description, credits } = req.body;

  const course = await prisma.course.create({
    data: {
      code,
      title,
      description,
      credits,
      creatorId: req.currentUser?.id as string,
    },
    select: {
      id: true,
      code: true,
      title: true,
      description: true,
      credits: true,
      isDeleted: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  OrchestrationResult.item(res, course, 201);
};

const updateCourse = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { code, title, description, credits } = req.body;

  if (!id) {
    OrchestrationResult.badRequest(
      res,
      CODES.VALIDATION_REQUEST_ERROR,
      "Provide an ID"
    );
    return;
  }

  const course = await prisma.course.findUnique({ where: { id } });

  if (!course) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "Course not found");
    return;
  }

  const updatedCourse = await prisma.course.update({
    where: {
      id,
    },
    data: {
      code,
      title,
      description,
      credits,
    },
    select: {
      id: true,
      code: true,
      title: true,
      description: true,
      credits: true,
      isDeleted: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  OrchestrationResult.item(res, updatedCourse, 200);
};

const deleteCourse = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    OrchestrationResult.badRequest(
      res,
      CODES.VALIDATION_REQUEST_ERROR,
      "Provide an ID"
    );
    return;
  }

  const course = await prisma.course.findUnique({ where: { id } });

  if (!course) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "Course not found");
    return;
  }

  const deletedCourse = await prisma.course.update({
    where: {
      id,
    },
    data: {
      isDeleted: true,
    },
    select: {
      id: true,
      code: true,
      title: true,
      description: true,
      credits: true,
      isDeleted: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  OrchestrationResult.item(res, deletedCourse, 200);
};

const restoreCourse = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    OrchestrationResult.badRequest(
      res,
      CODES.VALIDATION_REQUEST_ERROR,
      "Provide an ID"
    );
    return;
  }

  const course = await prisma.course.findUnique({ where: { id } });

  if (!course) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "Course not found");
    return;
  }

  const restoredCourse = await prisma.course.update({
    where: {
      id,
    },
    data: {
      isDeleted: false,
    },
    select: {
      id: true,
      code: true,
      title: true,
      description: true,
      credits: true,
      isDeleted: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  OrchestrationResult.item(res, restoredCourse, 200);
};

const getCourses = async (req: Request, res: Response) => {
  const {
    name: title,
    itemsPerPage,
    page,
    skip,
  } = getNameAndPageAndItemsPerPageFromRequestQuery(req);

  const courses = await prisma.course.findMany({
    where: {
      title: {
        contains: title,
        mode: "insensitive",
      },
      isDeleted: false,
    },
    orderBy: {
      title: "asc",
    },
    skip: skip,
    take: itemsPerPage,
    select: {
      id: true,
      code: true,
      title: true,
      description: true,
      credits: true,
    },
  });
  const count = await prisma.course.count({
    where: {
      title: {
        contains: title,
        mode: "insensitive",
      },
      isDeleted: false,
    },
  });

  OrchestrationResult.list(res, courses, count, itemsPerPage, page);
};

const superUserGetCourses = async (req: Request, res: Response) => {
  const {
    name: title,
    itemsPerPage,
    page,
    skip,
  } = getNameAndPageAndItemsPerPageFromRequestQuery(req);

  const courses = await prisma.course.findMany({
    where: {
      title: {
        contains: title,
        mode: "insensitive",
      },
    },
    orderBy: {
      title: "asc",
    },
    skip: skip,
    take: itemsPerPage,
    select: {
      id: true,
      code: true,
      title: true,
      description: true,
      credits: true,
      isDeleted: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
  const count = await prisma.course.count({
    where: {
      title: {
        contains: title,
        mode: "insensitive",
      },
    },
  });

  OrchestrationResult.list(res, courses, count, itemsPerPage, page);
};

const getCourse = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    OrchestrationResult.badRequest(
      res,
      CODES.VALIDATION_REQUEST_ERROR,
      "Provide an ID"
    );
    return;
  }

  const course = await prisma.course.findUnique({
    where: { id, isDeleted: false },
    select: {
      id: true,
      code: true,
      title: true,
      description: true,
      credits: true,
    },
  });

  if (!course) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "Course not found");
    return;
  }

  OrchestrationResult.item(res, course, 200);
};

const superUserGetCourse = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    OrchestrationResult.badRequest(
      res,
      CODES.VALIDATION_REQUEST_ERROR,
      "Provide an ID"
    );
    return;
  }

  const course = await prisma.course.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      title: true,
      description: true,
      credits: true,
      isDeleted: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!course) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "Course not found");
    return;
  }

  OrchestrationResult.item(res, course, 200);
};

export default {
  createCourse,
  updateCourse,
  deleteCourse,
  restoreCourse,
  getCourses,
  superUserGetCourses,
  getCourse,
  superUserGetCourse,
};
