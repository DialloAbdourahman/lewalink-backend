import { Request, Response } from "express";
import { prisma } from "../prisma";
import { OrchestrationResult } from "../utils/orchestration-result";
import { CODES } from "../enums/codes";
import { getNameAndPageAndItemsPerPageFromRequestQuery } from "../utils/get-name-and-page-and-items-per-page-from-request";
import { sanitizeInput } from "../utils/sanitize-input";
import { isNumeric } from "../utils/isDigitsOnly";
import { SchoolProgram } from "@prisma/client";

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
        },
      },
      program: {
        select: { id: true, name: true },
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

const searchSchoolPrograms = async (req: Request, res: Response) => {
  const { name, itemsPerPage, page, skip } =
    getNameAndPageAndItemsPerPageFromRequestQuery(req);

  const city = req.query.city
    ? String(sanitizeInput(req.query.city as string))
    : "";
  const country = req.query.country
    ? String(sanitizeInput(req.query.country as string))
    : "";
  let type = req.query.type
    ? String(sanitizeInput(req.query.type as string))
    : "";

  const longitude = req.query.longitude
    ? String(sanitizeInput(req.query.longitude as string))
    : "";
  const latitude = req.query.latitude
    ? String(sanitizeInput(req.query.latitude as string))
    : "";

  const orderByVisits =
    req.query.orderByVisits === "asc" || req.query.orderByVisits === "desc"
      ? (String(req.query.orderByVisits) as "asc" | "desc")
      : "desc";

  const orderByRating =
    req.query.orderByRating === "asc" || req.query.orderByRating === "desc"
      ? (String(req.query.orderByRating) as "asc" | "desc")
      : "desc";

  const orderByDistance =
    req.query.orderByDistance === "asc" || req.query.orderByDistance === "desc"
      ? (String(req.query.orderByDistance) as "asc" | "desc")
      : "asc";

  if (type) {
    OrchestrationResult.badRequest(
      res,
      CODES.VALIDATION_REQUEST_ERROR,
      "Provide a correct type"
    );
    return;
  }

  if (longitude || latitude) {
    if (!isNumeric(latitude) || !isNumeric(longitude)) {
      OrchestrationResult.badRequest(
        res,
        CODES.VALIDATION_REQUEST_ERROR,
        "Provide a correct longitude and latitude"
      );
      return;
    }

    if (
      Number(latitude) < -90 ||
      Number(latitude) > 90 ||
      Number(longitude) < -180 ||
      Number(longitude) > 180
    ) {
      OrchestrationResult.badRequest(
        res,
        CODES.VALIDATION_REQUEST_ERROR,
        "Provide a correct longitude and latitude"
      );
      return;
    }
  }

  const query = `
      SELECT
        s.id AS schoolId,
        s.name AS schoolName,
        s.description AS schoolDescription,
        s.type AS schoolType,
        s.longitude AS schoolLongitude,
        s.latitude AS schoolLatitude,
        s.country AS schoolCountry,
        s.city AS schoolCity,
        s.email AS schoolEmail,
        'phone-number' AS schoolPhoneNumber,
        s.website AS schoolWebsite,
        s.visits AS schoolVisits,
        s.rating AS schoolRating
        ${
          longitude &&
          latitude &&
          `,(6371 * acos(cos(radians(${Number(
            latitude
          )})) * cos(radians(s.latitude)) *
          cos(radians(s.longitude) - radians(${Number(longitude)})) +
          sin(radians(${Number(
            latitude
          )})) * sin(radians(s.latitude)))) AS schoolDistance`
        }
      FROM "SchoolProgram" AS sp
      INNER JOIN "School" as s ON s."id" = sp."schoolId" 
      WHERE
        s.name ILIKE '%${name}%' AND
        s.country ILIKE '%${country}%' AND
        s.city ILIKE '%${city}%' AND
        ${type && `s.type = '${type}' AND`}
        s."isDeleted" = false
      ORDER BY
        ${longitude && latitude && `schoolDistance ${orderByDistance},`}
        schoolRating ${orderByRating},
        schoolVisits ${orderByVisits}
      LIMIT ${itemsPerPage} OFFSET ${skip}
  `;

  // const countQuery = `
  //     SELECT
  //       COUNT(s.id)
  //       ${
  //         longitude &&
  //         latitude &&
  //         `,(6371 * acos(cos(radians(${Number(
  //           latitude
  //         )})) * cos(radians(s.latitude)) *
  //         cos(radians(s.longitude) - radians(${Number(longitude)})) +
  //         sin(radians(${Number(
  //           latitude
  //         )})) * sin(radians(s.latitude)))) AS distance`
  //       }
  //     FROM "School" AS s
  //     WHERE
  //       s.name ILIKE '%${name}%' AND
  //       s.country ILIKE '%${country}%' AND
  //       s.city ILIKE '%${city}%' AND
  //       ${type && `s.type = '${type}' AND`}
  //       s."isDeleted" = false
  //     GROUP BY
  //       s.latitude, s.longitude
  // `;

  const schoolPrograms = await prisma.$queryRawUnsafe<SchoolProgram[]>(query);
  // const countData = await prisma.$queryRawUnsafe<{ count: number }[]>(
  //   countQuery
  // );
  // const count = Number(countData[0].count);

  // OrchestrationResult.list(res, schools, count, itemsPerPage, page);
  res.send(schoolPrograms);
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
  searchSchoolPrograms,
};
