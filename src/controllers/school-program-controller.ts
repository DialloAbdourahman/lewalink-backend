import { Request, Response } from "express";
import { prisma } from "../prisma";
import { OrchestrationResult } from "../utils/orchestration-result";
import { CODES } from "../enums/codes";
import { getNameAndPageAndItemsPerPageFromRequestQuery } from "../utils/get-name-and-page-and-items-per-page-from-request";

const createSchoolProgram = async (req: Request, res: Response) => {
  let { price, schoolId, programId } = req.body;

  const existingSchool = await prisma.school.findFirst({
    where: {
      id: schoolId,
      isDeleted: false,
    },
  });

  if (!existingSchool) {
    OrchestrationResult.badRequest(
      res,
      CODES.SCHOOL_DOES_NOT_EXIST,
      "School does not exist"
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

  const existingSchoolProgram = await prisma.schoolProgram.findFirst({
    where: {
      schoolId,
      programId,
    },
  });

  if (existingSchoolProgram) {
    OrchestrationResult.badRequest(
      res,
      CODES.SCHOOL_PROGRAM_EXISTS_ALREADY,
      "Program has been attached to school already"
    );
    return;
  }

  const schoolProgram = await prisma.schoolProgram.create({
    data: {
      price,
      programId,
      schoolId,
      creatorId: req.currentUser?.id as string,
    },
    select: {
      id: true,
      price: true,
      visits: true,
      school: {
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      program: {
        select: { id: true, name: true, createdAt: true, updatedAt: true },
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

  OrchestrationResult.item(res, schoolProgram, 201);
};

const updateSchoolProgram = async (req: Request, res: Response) => {
  const { id } = req.params;
  let { price } = req.body;

  const existingSchoolProgram = await prisma.schoolProgram.findUnique({
    where: {
      id,
      isDeleted: false,
    },
  });

  if (!existingSchoolProgram) {
    OrchestrationResult.badRequest(
      res,
      CODES.SCHOOL_DOES_NOT_EXIST,
      "School does not exist"
    );
    return;
  }

  const updatedSchoolProgram = await prisma.schoolProgram.update({
    where: {
      id: existingSchoolProgram.id,
    },
    data: {
      price,
    },
    select: {
      id: true,
      price: true,
      visits: true,
      school: {
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      program: {
        select: { id: true, name: true, createdAt: true, updatedAt: true },
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

  OrchestrationResult.item(res, updatedSchoolProgram);
};

const deleteSchoolProgram = async (req: Request, res: Response) => {
  const { id } = req.params;

  const existingSchoolProgram = await prisma.schoolProgram.findUnique({
    where: {
      id,
      isDeleted: false,
    },
  });

  if (!existingSchoolProgram) {
    OrchestrationResult.badRequest(
      res,
      CODES.SCHOOL_DOES_NOT_EXIST,
      "School does not exist"
    );
    return;
  }

  await prisma.schoolProgram.update({
    where: {
      id: existingSchoolProgram.id,
    },
    data: {
      isDeleted: true,
    },
    select: {
      id: true,
      price: true,
      visits: true,
      school: {
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      program: {
        select: { id: true, name: true, createdAt: true, updatedAt: true },
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

  OrchestrationResult.success(res);
};

const restoreSchoolProgram = async (req: Request, res: Response) => {
  const { id } = req.params;

  const existingSchoolProgram = await prisma.schoolProgram.findUnique({
    where: {
      id,
      isDeleted: true,
    },
  });

  if (!existingSchoolProgram) {
    OrchestrationResult.badRequest(
      res,
      CODES.SCHOOL_DOES_NOT_EXIST,
      "School does not exist"
    );
    return;
  }

  const restoredSchoolProgram = await prisma.schoolProgram.update({
    where: {
      id: existingSchoolProgram.id,
    },
    data: {
      isDeleted: false,
    },
    select: {
      id: true,
      price: true,
      visits: true,
      school: {
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      program: {
        select: { id: true, name: true, createdAt: true, updatedAt: true },
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

  OrchestrationResult.item(res, restoredSchoolProgram);
};

const visitSchoolProgram = async (req: Request, res: Response) => {
  const { id } = req.params;

  const existingSchoolProgram = await prisma.schoolProgram.findUnique({
    where: {
      id,
      isDeleted: false,
    },
  });

  if (!existingSchoolProgram) {
    OrchestrationResult.badRequest(
      res,
      CODES.SCHOOL_DOES_NOT_EXIST,
      "School does not exist"
    );
    return;
  }

  const visitedSchoolProgram = await prisma.schoolProgram.update({
    where: {
      id: existingSchoolProgram.id,
    },
    data: {
      visits: ++existingSchoolProgram.visits,
    },
    select: {
      id: true,
      price: true,
      visits: true,
      school: {
        select: {
          id: true,
          name: true,
        },
      },
      program: {
        select: { id: true, name: true, createdAt: true, updatedAt: true },
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

  OrchestrationResult.item(res, visitedSchoolProgram);
};

const getSchoolPrograms = async (req: Request, res: Response) => {
  const { schoolId } = req.params;
  const { itemsPerPage, page, skip } =
    getNameAndPageAndItemsPerPageFromRequestQuery(req);

  const schoolPrograms = await prisma.schoolProgram.findMany({
    where: {
      schoolId,
      program: {
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
          description: true,
          type: true,
          field: true,
          duration: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      createdAt: true,
      updatedAt: true,
      isDeleted: false,
    },
  });

  const count = await prisma.schoolProgram.count({
    where: {
      schoolId,
      program: {
        isDeleted: false,
      },
      isDeleted: false,
    },
  });

  OrchestrationResult.list(res, schoolPrograms, count, itemsPerPage, page);
};

const superUserSeeSchoolProgram = async (req: Request, res: Response) => {
  const { id } = req.params;

  const schoolProgram = await prisma.schoolProgram.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      price: true,
      visits: true,
      school: {
        select: {
          id: true,
          name: true,
        },
      },
      program: {
        select: { id: true, name: true, createdAt: true, updatedAt: true },
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

  if (!schoolProgram) {
    OrchestrationResult.notFound(
      res,
      CODES.NOT_FOUND,
      "School program does not exist"
    );
    return;
  }

  OrchestrationResult.item(res, schoolProgram);
};

const SeeSchoolProgram = async (req: Request, res: Response) => {
  const { id } = req.params;

  const schoolProgram = await prisma.schoolProgram.findUnique({
    where: {
      id,
      isDeleted: false,
    },
    select: {
      id: true,
      price: true,
      visits: true,
      school: {
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      createdAt: true,
      updatedAt: true,
      program: {
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          field: true,
          duration: true,
          createdAt: true,
          updatedAt: true,
          isDeleted: true,
        },
      },
    },
  });

  if (!schoolProgram) {
    OrchestrationResult.notFound(
      res,
      CODES.NOT_FOUND,
      "School program does not exist"
    );
    return;
  }

  OrchestrationResult.item(res, schoolProgram);
};

export default {
  createSchoolProgram,
  updateSchoolProgram,
  deleteSchoolProgram,
  restoreSchoolProgram,
  visitSchoolProgram,
  getSchoolPrograms,
  superUserSeeSchoolProgram,
  SeeSchoolProgram,
};
