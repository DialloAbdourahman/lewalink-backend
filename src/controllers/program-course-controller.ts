import { Request, Response } from "express";
import { prisma } from "../prisma";
import { OrchestrationResult } from "../utils/orchestration-result";
import { CODES } from "../enums/codes";
import { getNameAndPageAndItemsPerPageFromRequestQuery } from "../utils/get-name-and-page-and-items-per-page-from-request";

const createProgramCourse = async (req: Request, res: Response) => {
  let { price, courseId, programId } = req.body;

  const existingCourse = await prisma.course.findFirst({
    where: {
      id: courseId,
      isDeleted: false,
    },
  });

  if (!existingCourse) {
    OrchestrationResult.badRequest(
      res,
      CODES.COURSE_DOES_NOT_EXIST,
      "Course does not exist"
    );
    return;
  }

  const existingProgram = await prisma.program.findFirst({
    where: {
      id: programId,
      isDeleted: false,
    },
  });

  if (!existingProgram) {
    OrchestrationResult.badRequest(
      res,
      CODES.PROGRAM_DOES_NOT_EXIST,
      "Program does not exist"
    );
    return;
  }

  const existingProgramCourse = await prisma.programCourse.findFirst({
    where: {
      courseId,
      programId,
    },
  });

  if (existingProgramCourse) {
    OrchestrationResult.badRequest(
      res,
      CODES.PROGRAM_COURSE_EXISTS_ALREADY,
      "Course has been attached to school already"
    );
    return;
  }

  const programCourse = await prisma.programCourse.create({
    data: {
      programId,
      courseId,
      creatorId: req.currentUser?.id as string,
    },
    select: {
      id: true,
      course: {
        select: {
          id: true,
          code: true,
          title: true,
          description: true,
          credits: true,
          createdAt: true,
          updatedAt: true,
          isDeleted: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      program: {
        select: {
          id: true,
          name: true,
          isDeleted: true,
        },
      },
      createdAt: true,
      updatedAt: true,
      isDeleted: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  OrchestrationResult.item(res, programCourse, 201);
};

const deleteProgramCourse = async (req: Request, res: Response) => {
  const { id } = req.params;

  const existingProgramCourse = await prisma.programCourse.findUnique({
    where: {
      id,
      isDeleted: false,
    },
  });

  if (!existingProgramCourse) {
    OrchestrationResult.notFound(
      res,
      CODES.PROGRAM_COURSE_DOES_NOT_EXIST,
      "Program course does not exist"
    );
    return;
  }

  const programCourse = await prisma.programCourse.update({
    where: {
      id: existingProgramCourse.id,
    },
    data: {
      isDeleted: true,
    },
    select: {
      id: true,
      course: {
        select: {
          id: true,
          code: true,
          title: true,
          description: true,
          credits: true,
          createdAt: true,
          updatedAt: true,
          isDeleted: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      program: {
        select: {
          id: true,
          name: true,
          isDeleted: true,
        },
      },
      createdAt: true,
      updatedAt: true,
      isDeleted: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  OrchestrationResult.item(res, programCourse);
};

const restoreProgramCourse = async (req: Request, res: Response) => {
  const { id } = req.params;

  const existingProgramCourse = await prisma.programCourse.findUnique({
    where: {
      id,
      isDeleted: true,
    },
  });

  if (!existingProgramCourse) {
    OrchestrationResult.notFound(
      res,
      CODES.PROGRAM_COURSE_DOES_NOT_EXIST,
      "Program course does not exist"
    );
    return;
  }

  const restoredProgramCourse = await prisma.programCourse.update({
    where: {
      id: existingProgramCourse.id,
    },
    data: {
      isDeleted: false,
    },
    select: {
      id: true,
      course: {
        select: {
          id: true,
          code: true,
          title: true,
          description: true,
          credits: true,
          createdAt: true,
          updatedAt: true,
          isDeleted: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      program: {
        select: {
          id: true,
          name: true,
          isDeleted: true,
        },
      },
      createdAt: true,
      updatedAt: true,
      isDeleted: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  OrchestrationResult.item(res, restoredProgramCourse);
};

const getProgramCourses = async (req: Request, res: Response) => {
  const { programId } = req.params;
  const { itemsPerPage, page, skip } =
    getNameAndPageAndItemsPerPageFromRequestQuery(req);

  const programCourses = await prisma.programCourse.findMany({
    where: {
      programId,
      program: {
        isDeleted: false,
      },
      course: {
        isDeleted: false,
      },
      isDeleted: false,
    },
    skip: skip,
    take: itemsPerPage,
    select: {
      program: {
        select: {
          id: true,
          name: true,
        },
      },
      course: {
        select: {
          id: true,
          code: true,
          title: true,
          description: true,
          credits: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      createdAt: true,
      updatedAt: true,
    },
  });

  const count = await prisma.programCourse.count({
    where: {
      programId,
      program: {
        isDeleted: false,
      },
      isDeleted: false,
    },
  });

  OrchestrationResult.list(res, programCourses, count, itemsPerPage, page);
};

const superUserGetSchoolPrograms = async (req: Request, res: Response) => {
  const { programId } = req.params;
  const { itemsPerPage, page, skip } =
    getNameAndPageAndItemsPerPageFromRequestQuery(req);

  const programCourses = await prisma.programCourse.findMany({
    where: {
      programId,
    },
    skip: skip,
    take: itemsPerPage,
    select: {
      id: true,
      course: {
        select: {
          id: true,
          code: true,
          title: true,
          description: true,
          credits: true,
          createdAt: true,
          updatedAt: true,
          isDeleted: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      program: {
        select: {
          id: true,
          name: true,
          isDeleted: true,
        },
      },
      createdAt: true,
      updatedAt: true,
      isDeleted: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  const count = await prisma.programCourse.count({
    where: {
      programId,
      program: {
        isDeleted: false,
      },
      isDeleted: false,
    },
  });

  OrchestrationResult.list(res, programCourses, count, itemsPerPage, page);
};

export default {
  createProgramCourse,
  deleteProgramCourse,
  restoreProgramCourse,
  getProgramCourses,
  superUserGetSchoolPrograms,
};
