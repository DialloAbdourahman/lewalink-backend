// import { Request, Response } from "express";
// import jwt from "jsonwebtoken";
// import { prisma } from "../prisma";
// import { OrchestrationResult } from "../utils/orchestration-result";
// import { CODES } from "../enums/codes";
// import { PasswordManager } from "../utils/password";
// import { UserType } from "../enums/user-types";
// import { JWTCodes } from "../utils/jwt-codes";
// import { AwsSesHelper } from "../utils/aws-ses";
// import { generateTokens } from "../utils/generate-tokens";
// import { getNameAndPageAndItemsPerPageFromRequestQuery } from "../utils/get-name-and-page-and-items-per-page-from-request";
// import { getUserFromGoogle } from "../utils/get-user-from-google";

// const createSchoolProgram = async (req: Request, res: Response) => {
//   let { price, schoolId, programId } = req.body;

//   const schoolProgram = await prisma.schoolProgram.create({
//     data: {
//       price,
//       programId,
//       schoolId,
//       adminId: req.currentUser?.id as string,
//     },
//     select: {
//       id: true,
//       school: {
//         select: {
//           id: true,
//           name: true,
//         },
//       },
//       program: {
//         select: { id: true, name: true },
//       },
//       isDeleted: true,
//       admin: {
//         select: {
//           id: true,
//           name: true,
//           email: true,
//         },
//       },
//     },
//   });

//   OrchestrationResult.item(res, schoolProgram, 201);
// };

// // const updateCourse = async (req: Request, res: Response) => {
// //   const { id } = req.params;
// //   const { code, title, description, credits } = req.body;

// //   if (!id) {
// //     OrchestrationResult.badRequest(
// //       res,
// //       CODES.VALIDATION_REQUEST_ERROR,
// //       "Provide an ID"
// //     );
// //     return;
// //   }

// //   const schoolProgram = await prisma.schoolProgram.findUnique({ where: { id } });

// //   if (!schoolProgram) {
// //     OrchestrationResult.notFound(res, CODES.NOT_FOUND, "Course not found");
// //     return;
// //   }

// //   const updatedCourse = await prisma.schoolProgram.update({
// //     where: {
// //       id,
// //     },
// //     data: {
// //       code,
// //       title,
// //       description,
// //       credits,
// //     },
// //     select: {
// //       id: true,
// //       code: true,
// //       title: true,
// //       description: true,
// //       credits: true,
// //       isDeleted: true,
// //       admin: {
// //         select: {
// //           id: true,
// //           name: true,
// //           email: true,
// //         },
// //       },
// //     },
// //   });

// //   OrchestrationResult.item(res, updatedCourse, 200);
// // };

// // const deleteCourse = async (req: Request, res: Response) => {
// //   const { id } = req.params;

// //   if (!id) {
// //     OrchestrationResult.badRequest(
// //       res,
// //       CODES.VALIDATION_REQUEST_ERROR,
// //       "Provide an ID"
// //     );
// //     return;
// //   }

// //   const schoolProgram = await prisma.schoolProgram.findUnique({ where: { id } });

// //   if (!schoolProgram) {
// //     OrchestrationResult.notFound(res, CODES.NOT_FOUND, "Course not found");
// //     return;
// //   }

// //   const deletedCourse = await prisma.schoolProgram.update({
// //     where: {
// //       id,
// //     },
// //     data: {
// //       isDeleted: true,
// //     },
// //     select: {
// //       id: true,
// //       code: true,
// //       title: true,
// //       description: true,
// //       credits: true,
// //       isDeleted: true,
// //       admin: {
// //         select: {
// //           id: true,
// //           name: true,
// //           email: true,
// //         },
// //       },
// //     },
// //   });

// //   OrchestrationResult.item(res, deletedCourse, 200);
// // };

// // const restoreCourse = async (req: Request, res: Response) => {
// //   const { id } = req.params;

// //   if (!id) {
// //     OrchestrationResult.badRequest(
// //       res,
// //       CODES.VALIDATION_REQUEST_ERROR,
// //       "Provide an ID"
// //     );
// //     return;
// //   }

// //   const schoolProgram = await prisma.schoolProgram.findUnique({ where: { id } });

// //   if (!schoolProgram) {
// //     OrchestrationResult.notFound(res, CODES.NOT_FOUND, "Course not found");
// //     return;
// //   }

// //   const restoredCourse = await prisma.schoolProgram.update({
// //     where: {
// //       id,
// //     },
// //     data: {
// //       isDeleted: false,
// //     },
// //     select: {
// //       id: true,
// //       code: true,
// //       title: true,
// //       description: true,
// //       credits: true,
// //       isDeleted: true,
// //       admin: {
// //         select: {
// //           id: true,
// //           name: true,
// //           email: true,
// //         },
// //       },
// //     },
// //   });

// //   OrchestrationResult.item(res, restoredCourse, 200);
// // };

// // const getCourses = async (req: Request, res: Response) => {
// //   const {
// //     name: title,
// //     itemsPerPage,
// //     page,
// //     skip,
// //   } = getNameAndPageAndItemsPerPageFromRequestQuery(req);

// //   const courses = await prisma.schoolProgram.findMany({
// //     where: {
// //       title: {
// //         contains: title,
// //         mode: "insensitive",
// //       },
// //       isDeleted: false,
// //     },
// //     orderBy: {
// //       title: "asc",
// //     },
// //     skip: skip,
// //     take: itemsPerPage,
// //     select: {
// //       id: true,
// //       code: true,
// //       title: true,
// //       description: true,
// //       credits: true,
// //     },
// //   });
// //   const count = await prisma.schoolProgram.count({
// //     where: {
// //       title: {
// //         contains: title,
// //         mode: "insensitive",
// //       },
// //       isDeleted: false,
// //     },
// //   });

// //   OrchestrationResult.list(res, courses, count, itemsPerPage, page);
// // };

// // const adminGetCourses = async (req: Request, res: Response) => {
// //   const {
// //     name: title,
// //     itemsPerPage,
// //     page,
// //     skip,
// //   } = getNameAndPageAndItemsPerPageFromRequestQuery(req);

// //   const courses = await prisma.schoolProgram.findMany({
// //     where: {
// //       title: {
// //         contains: title,
// //         mode: "insensitive",
// //       },
// //     },
// //     orderBy: {
// //       title: "asc",
// //     },
// //     skip: skip,
// //     take: itemsPerPage,
// //     select: {
// //       id: true,
// //       code: true,
// //       title: true,
// //       description: true,
// //       credits: true,
// //       isDeleted: true,
// //       admin: {
// //         select: {
// //           id: true,
// //           name: true,
// //           email: true,
// //         },
// //       },
// //     },
// //   });
// //   const count = await prisma.schoolProgram.count({
// //     where: {
// //       title: {
// //         contains: title,
// //         mode: "insensitive",
// //       },
// //     },
// //   });

// //   OrchestrationResult.list(res, courses, count, itemsPerPage, page);
// // };

// export default {
//   createSchoolProgram,
//   //   updateCourse,
//   //   deleteCourse,
//   //   restoreCourse,
//   //   getCourses,
//   //   adminGetCourses,
// };
