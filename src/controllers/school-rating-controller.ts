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
      stars,
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

// const updateProgram = async (req: Request, res: Response) => {
//   const { id } = req.params;
//   let { type, name, description, duration, field } = req.body;

//   if (!id) {
//     OrchestrationResult.badRequest(
//       res,
//       CODES.VALIDATION_REQUEST_ERROR,
//       "Provide an ID"
//     );
//     return;
//   }

//   if (!isEnumValue(ProgramType, type) || !isEnumValue(ProgramField, field)) {
//     OrchestrationResult.badRequest(
//       res,
//       CODES.VALIDATION_REQUEST_ERROR,
//       "Enter a correct field and type"
//     );
//     return;
//   }

//   const program = await prisma.program.findUnique({ where: { id } });

//   if (!program) {
//     OrchestrationResult.notFound(res, CODES.NOT_FOUND, "Program not found");
//     return;
//   }

//   const updatedProgram = await prisma.program.update({
//     where: {
//       id,
//     },
//     data: {
//       name,
//       type,
//       description,
//       duration,
//     },
//     select: {
//       id: true,
//       name: true,
//       description: true,
//       type: true,
//       field: true,
//       duration: true,
//       isDeleted: true,
//       creator: {
//         select: {
//           id: true,
//           name: true,
//           email: true,
//         },
//       },
//     },
//   });

//   OrchestrationResult.item(res, updatedProgram, 200);
// };

// const deleteProgram = async (req: Request, res: Response) => {
//   const { id } = req.params;

//   if (!id) {
//     OrchestrationResult.badRequest(
//       res,
//       CODES.VALIDATION_REQUEST_ERROR,
//       "Provide an ID"
//     );
//     return;
//   }

//   const program = await prisma.program.findUnique({ where: { id } });

//   if (!program) {
//     OrchestrationResult.notFound(res, CODES.NOT_FOUND, "Program not found");
//     return;
//   }

//   const deletedProgram = await prisma.program.update({
//     where: {
//       id,
//     },
//     data: {
//       isDeleted: true,
//     },
//     select: {
//       id: true,
//       name: true,
//       description: true,
//       type: true,
//       field: true,
//       duration: true,
//       isDeleted: true,
//       creator: {
//         select: {
//           id: true,
//           name: true,
//           email: true,
//         },
//       },
//     },
//   });

//   OrchestrationResult.item(res, deletedProgram, 200);
// };

// const restoreProgram = async (req: Request, res: Response) => {
//   const { id } = req.params;

//   if (!id) {
//     OrchestrationResult.badRequest(
//       res,
//       CODES.VALIDATION_REQUEST_ERROR,
//       "Provide an ID"
//     );
//     return;
//   }

//   const program = await prisma.program.findUnique({ where: { id } });

//   if (!program) {
//     OrchestrationResult.notFound(res, CODES.NOT_FOUND, "Program not found");
//     return;
//   }

//   const restoredProgram = await prisma.program.update({
//     where: {
//       id,
//     },
//     data: {
//       isDeleted: false,
//     },
//     select: {
//       id: true,
//       name: true,
//       description: true,
//       type: true,
//       field: true,
//       duration: true,
//       isDeleted: true,
//       creator: {
//         select: {
//           id: true,
//           name: true,
//           email: true,
//         },
//       },
//     },
//   });

//   OrchestrationResult.item(res, restoredProgram, 200);
// };

// const getPrograms = async (req: Request, res: Response) => {
//   const { name, itemsPerPage, page, skip } =
//     getNameAndPageAndItemsPerPageFromRequestQuery(req);
//   const type = req.query.type ? String(req.query.type) : "";
//   const field = req.query.field ? String(req.query.field) : "";

//   const moreFilters: { [key: string]: any } = {};

//   if (type && isEnumValue(ProgramType, type)) {
//     moreFilters.type = {
//       equals: type,
//     };
//   }

//   if (field && isEnumValue(ProgramField, field)) {
//     moreFilters.field = {
//       equals: field,
//     };
//   }

//   console.log("more filters", moreFilters);

//   const programs = await prisma.program.findMany({
//     where: {
//       name: {
//         contains: name,
//         mode: "insensitive",
//       },
//       isDeleted: false,
//       ...moreFilters,
//     },
//     skip: skip,
//     take: itemsPerPage,
//     select: {
//       id: true,
//       name: true,
//       description: true,
//       type: true,
//       field: true,
//       duration: true,
//     },
//   });
//   const count = await prisma.program.count({
//     where: {
//       name: {
//         contains: name,
//         mode: "insensitive",
//       },
//       isDeleted: false,
//       ...moreFilters,
//     },
//   });

//   OrchestrationResult.list(res, programs, count, itemsPerPage, page);
// };

// const superUserGetPrograms = async (req: Request, res: Response) => {
//   const { name, itemsPerPage, page, skip } =
//     getNameAndPageAndItemsPerPageFromRequestQuery(req);

//   const type = req.query.type ? String(req.query.type) : "";
//   const field = req.query.field ? String(req.query.field) : "";

//   const moreFilters: { [key: string]: any } = {};

//   if (type && isEnumValue(ProgramType, type)) {
//     moreFilters.type = {
//       equals: type,
//     };
//   }

//   if (field && isEnumValue(ProgramField, field)) {
//     moreFilters.field = {
//       equals: field,
//     };
//   }

//   const programs = await prisma.program.findMany({
//     where: {
//       name: {
//         contains: name,
//         mode: "insensitive",
//       },
//       ...moreFilters,
//     },
//     skip: skip,
//     take: itemsPerPage,
//     select: {
//       id: true,
//       name: true,
//       description: true,
//       type: true,
//       field: true,
//       duration: true,
//       isDeleted: true,
//       creator: {
//         select: {
//           id: true,
//           name: true,
//           email: true,
//         },
//       },
//     },
//   });
//   const count = await prisma.program.count({
//     where: {
//       name: {
//         contains: name,
//         mode: "insensitive",
//       },
//       ...moreFilters,
//     },
//   });

//   OrchestrationResult.list(res, programs, count, itemsPerPage, page);
// };

// const getProgram = async (req: Request, res: Response) => {
//   const { id } = req.params;

//   if (!id) {
//     OrchestrationResult.badRequest(
//       res,
//       CODES.VALIDATION_REQUEST_ERROR,
//       "Provide an ID"
//     );
//     return;
//   }

//   const program = await prisma.program.findUnique({
//     where: { id, isDeleted: false },
//     select: {
//       id: true,
//       name: true,
//       description: true,
//       type: true,
//       field: true,
//       duration: true,
//     },
//   });

//   if (!program) {
//     OrchestrationResult.notFound(res, CODES.NOT_FOUND, "Program not found");
//     return;
//   }

//   OrchestrationResult.item(res, program, 200);
// };

// const superUserGetProgram = async (req: Request, res: Response) => {
//   const { id } = req.params;

//   if (!id) {
//     OrchestrationResult.badRequest(
//       res,
//       CODES.VALIDATION_REQUEST_ERROR,
//       "Provide an ID"
//     );
//     return;
//   }

//   const program = await prisma.program.findUnique({
//     where: { id },
//     select: {
//       id: true,
//       name: true,
//       description: true,
//       type: true,
//       field: true,
//       duration: true,
//       isDeleted: true,
//       creator: {
//         select: {
//           id: true,
//           name: true,
//           email: true,
//         },
//       },
//     },
//   });

//   if (!program) {
//     OrchestrationResult.notFound(res, CODES.NOT_FOUND, "Program not found");
//     return;
//   }

//   OrchestrationResult.item(res, program, 200);
// };

export default {
  createSchoolRating,
  //   updateProgram,
  //   deleteProgram,
  //   restoreProgram,
  //   getPrograms,
  //   superUserGetProgram,
  //   getProgram,
  //   superUserGetPrograms,
};
