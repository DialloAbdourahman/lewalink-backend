import { Request, Response } from "express";
import { prisma } from "../prisma";
import { OrchestrationResult } from "../utils/orchestration-result";
import { CODES } from "../enums/codes";
import { getNameAndPageAndItemsPerPageFromRequestQuery } from "../utils/get-name-and-page-and-items-per-page-from-request";

const createProgram = async (req: Request, res: Response) => {
  let { type, name, description, duration } = req.body;

  const program = await prisma.program.create({
    data: {
      name,
      type,
      description,
      duration,
      adminId: req.currentUser?.id as string,
    },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      duration: true,
      isDeleted: true,
      admin: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  OrchestrationResult.item(res, program, 201);
};

const updateProgram = async (req: Request, res: Response) => {
  const { id } = req.params;
  let { type, name, description, duration } = req.body;

  if (!id) {
    OrchestrationResult.badRequest(
      res,
      CODES.VALIDATION_REQUEST_ERROR,
      "Provide an ID"
    );
    return;
  }

  const program = await prisma.program.findUnique({ where: { id } });

  if (!program) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "Program not found");
    return;
  }

  const updatedProgram = await prisma.program.update({
    where: {
      id,
    },
    data: {
      name,
      type,
      description,
      duration,
    },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      duration: true,
      isDeleted: true,
      admin: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  OrchestrationResult.item(res, updatedProgram, 200);
};

const deleteProgram = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    OrchestrationResult.badRequest(
      res,
      CODES.VALIDATION_REQUEST_ERROR,
      "Provide an ID"
    );
    return;
  }

  const program = await prisma.program.findUnique({ where: { id } });

  if (!program) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "Program not found");
    return;
  }

  const deletedProgram = await prisma.program.update({
    where: {
      id,
    },
    data: {
      isDeleted: true,
    },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      duration: true,
      isDeleted: true,
      admin: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  OrchestrationResult.item(res, deletedProgram, 200);
};

const restoreProgram = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    OrchestrationResult.badRequest(
      res,
      CODES.VALIDATION_REQUEST_ERROR,
      "Provide an ID"
    );
    return;
  }

  const program = await prisma.program.findUnique({ where: { id } });

  if (!program) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "Program not found");
    return;
  }

  const restoredProgram = await prisma.program.update({
    where: {
      id,
    },
    data: {
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      duration: true,
      isDeleted: true,
      admin: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  OrchestrationResult.item(res, restoredProgram, 200);
};

const getPrograms = async (req: Request, res: Response) => {
  const { name, itemsPerPage, page, skip } =
    getNameAndPageAndItemsPerPageFromRequestQuery(req);

  const programs = await prisma.program.findMany({
    where: {
      name: {
        contains: name,
        mode: "insensitive",
      },
      isDeleted: false,
    },
    orderBy: {
      name: "asc",
    },
    skip: skip,
    take: itemsPerPage,
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      duration: true,
    },
  });
  const count = await prisma.program.count({
    where: {
      name: {
        contains: name,
        mode: "insensitive",
      },
      isDeleted: false,
    },
  });

  OrchestrationResult.list(res, programs, count, itemsPerPage, page);
};

const adminGetPrograms = async (req: Request, res: Response) => {
  const { name, itemsPerPage, page, skip } =
    getNameAndPageAndItemsPerPageFromRequestQuery(req);

  const programs = await prisma.program.findMany({
    where: {
      name: {
        contains: name,
        mode: "insensitive",
      },
    },
    orderBy: {
      name: "asc",
    },
    skip: skip,
    take: itemsPerPage,
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      duration: true,
      isDeleted: true,
      admin: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
  const count = await prisma.program.count({
    where: {
      name: {
        contains: name,
        mode: "insensitive",
      },
    },
  });

  OrchestrationResult.list(res, programs, count, itemsPerPage, page);
};

const getProgram = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    OrchestrationResult.badRequest(
      res,
      CODES.VALIDATION_REQUEST_ERROR,
      "Provide an ID"
    );
    return;
  }

  const program = await prisma.program.findUnique({
    where: { id, isDeleted: false },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      duration: true,
    },
  });

  if (!program) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "Program not found");
    return;
  }

  OrchestrationResult.item(res, program, 200);
};

const adminGetProgram = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    OrchestrationResult.badRequest(
      res,
      CODES.VALIDATION_REQUEST_ERROR,
      "Provide an ID"
    );
    return;
  }

  const program = await prisma.program.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      duration: true,
      isDeleted: true,
      admin: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!program) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "Program not found");
    return;
  }

  OrchestrationResult.item(res, program, 200);
};

export default {
  createProgram,
  updateProgram,
  deleteProgram,
  restoreProgram,
  getPrograms,
  adminGetPrograms,
  getProgram,
  adminGetProgram,
};
