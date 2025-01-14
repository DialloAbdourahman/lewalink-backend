import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";
import { OrchestrationResult } from "../utils/orchestration-result";
import { CODES } from "../enums/codes";
import { PasswordManager } from "../utils/password";
import { UserType } from "../enums/user-types";
import { JWTCodes } from "../utils/jwt-codes";
import { AwsSesHelper } from "../utils/aws-ses";
import { generateTokens } from "../utils/generate-tokens";
import { getNameAndPageAndItemsPerPageFromRequestQuery } from "../utils/get-name-and-page-and-items-per-page-from-request";
import { getUserFromGoogle } from "../utils/get-user-from-google";

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
        },
      },
      program: {
        select: { id: true, name: true },
      },
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
        },
      },
      program: {
        select: { id: true, name: true },
      },
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
        },
      },
      program: {
        select: { id: true, name: true },
      },
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
        },
      },
      program: {
        select: { id: true, name: true },
      },
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
        select: { id: true, name: true },
      },
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

  OrchestrationResult.item(res, visitedSchoolProgram);
};

const getSchoolPrograms = async (req: Request, res: Response) => {
  const { schoolId } = req.params;

  const schoolPrograms = await prisma.schoolProgram.findMany({
    where: {
      schoolId,
      program: {
        isDeleted: false,
      },
      isDeleted: false,
    },
    select: {
      program: {
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          field: true,
          duration: true,
        },
      },
      isDeleted: false,
    },
  });

  OrchestrationResult.item(res, schoolPrograms);
};

export default {
  createSchoolProgram,
  updateSchoolProgram,
  deleteSchoolProgram,
  restoreSchoolProgram,
  visitSchoolProgram,
  getSchoolPrograms,
};
