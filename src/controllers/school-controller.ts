import { Request, Response } from "express";
import { prisma } from "../prisma";
import { OrchestrationResult } from "../utils/orchestration-result";
import { CODES } from "../enums/codes";
import { getNameAndPageAndItemsPerPageFromRequestQuery } from "../utils/get-name-and-page-and-items-per-page-from-request";
import { AwsS3Helper } from "../utils/aws-s3-helper";
import { generateRandomString } from "../utils/generateRandomString";
import { haversineDistance } from "../utils/haversine";
import { isNumeric } from "../utils/isDigitsOnly";
import { School, SchoolProgram, SchoolType } from "@prisma/client";
import { sanitizeInput } from "../utils/sanitize-input";

const createSchool = async (req: Request, res: Response) => {
  const images = req.files as Express.Multer.File[];

  let {
    type,
    name,
    description,
    longitude,
    latitude,
    country,
    city,
    fullAddressName,
    email,
    phoneNumber,
    website,
  } = req.body;

  if (!images?.length || !images) {
    OrchestrationResult.badRequest(
      res,
      CODES.MULTER_FILE_DOES_NOT_EXIST,
      "Provide images"
    );
    return;
  }

  if (images?.length > Number(process.env.TOTAL_IMAGES_PER_SCHOOL)) {
    OrchestrationResult.badRequest(
      res,
      CODES.MULTER_TOO_MANY_IMAGES,
      `Maximum ${process.env.TOTAL_IMAGES_PER_SCHOOL} images`
    );
    return;
  }

  const existingSchool = await prisma.school.findFirst({
    where: {
      name,
    },
  });

  if (existingSchool) {
    OrchestrationResult.badRequest(
      res,
      CODES.SCHOOL_EXIST_ALREADY,
      "School exist already"
    );
    return;
  }

  const school = await prisma.school.create({
    data: {
      name,
      type,
      description,
      longitude: Number(longitude),
      latitude: Number(latitude),
      country,
      city,
      email,
      phoneNumber,
      website,
      fullAddressName,
      creatorId: req.currentUser?.id as string,
    },
  });

  const awsHelper = new AwsS3Helper();

  let schoolWithImages;
  try {
    const keys: string[] = await Promise.all(
      images.map(async (image) => {
        const key = generateRandomString(20);
        await awsHelper.uploadImage(key, image.mimetype, image.buffer);
        return key; // Return the key to be added to the array
      })
    );

    schoolWithImages = await prisma.school.update({
      where: {
        id: school.id,
      },
      data: {
        pictures: keys,
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        longitude: true,
        latitude: true,
        country: true,
        city: true,
        email: true,
        phoneNumber: true,
        website: true,
        visits: true,
        createdAt: true,
        fullAddressName: true,
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
    });
  } catch (error) {
    await prisma.school.delete({
      where: {
        id: school.id,
      },
    });

    OrchestrationResult.serverError(
      res,
      CODES.IMAGE_UPLOAD_ERROR,
      "Error uploading image to s3"
    );
    return;
  }

  OrchestrationResult.item(res, schoolWithImages, 201);
};

const addImages = async (req: Request, res: Response) => {
  const images = req.files as Express.Multer.File[];
  const { id } = req.params;

  if (!images?.length || !images) {
    OrchestrationResult.badRequest(
      res,
      CODES.MULTER_FILE_DOES_NOT_EXIST,
      "Provide images"
    );
    return;
  }

  const school = await prisma.school.findUnique({
    where: {
      id,
    },
  });

  if (!school) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "School does not exist");
    return;
  }

  if (
    images?.length + school.pictures.length >
    Number(process.env.TOTAL_IMAGES_PER_SCHOOL)
  ) {
    OrchestrationResult.badRequest(
      res,
      CODES.MULTER_TOO_MANY_IMAGES,
      `Maximum ${process.env.TOTAL_IMAGES_PER_SCHOOL} images`
    );
    return;
  }

  const awsHelper = new AwsS3Helper();

  const keys: string[] = await Promise.all(
    images.map(async (image) => {
      const key = generateRandomString(20);
      await awsHelper.uploadImage(key, image.mimetype, image.buffer);
      return key; // Return the key to be added to the array
    })
  );

  const schoolWithImages = await prisma.school.update({
    where: {
      id: school.id,
    },
    data: {
      pictures: [...school.pictures, ...keys],
    },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      longitude: true,
      latitude: true,
      country: true,
      city: true,
      email: true,
      phoneNumber: true,
      website: true,
      pictures: true,
      visits: true,
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
  });

  const schoolImages = await Promise.all(
    schoolWithImages.pictures.map(async (picture) => {
      const url = await awsHelper.getImageUrl(picture);
      return { url, key: picture };
    })
  );

  OrchestrationResult.item(
    res,
    { ...schoolWithImages, imagesUrls: schoolImages },
    200
  );
};

const deleteImage = async (req: Request, res: Response) => {
  const schoolId = String(req.query.schoolId);
  const picture = String(req.query.picture);

  if (schoolId === "undefined" || picture === "undefined") {
    OrchestrationResult.badRequest(
      res,
      CODES.VALIDATION_REQUEST_ERROR,
      "Provide a school id and the picture"
    );
    return;
  }

  const school = await prisma.school.findUnique({
    where: {
      id: schoolId,
    },
  });

  if (!school) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "School does not exist");
    return;
  }

  if (!school.pictures.includes(picture)) {
    OrchestrationResult.notFound(
      res,
      CODES.PICTURE_DOES_NOT_EXIST,
      "Picture does not exist"
    );
    return;
  }

  if (school.pictures.length === 1) {
    OrchestrationResult.notFound(
      res,
      CODES.CANNOT_DELETE_ALL_IMAGES,
      "Cannot delete all images"
    );
    return;
  }

  const awsHelper = new AwsS3Helper();

  await awsHelper.deleteImageFromS3(picture);

  const schoolWithImages = await prisma.school.update({
    where: {
      id: school.id,
    },
    data: {
      pictures: [...school.pictures.filter((pic) => pic !== picture)],
    },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      longitude: true,
      latitude: true,
      country: true,
      city: true,
      email: true,
      phoneNumber: true,
      website: true,
      pictures: true,
      visits: true,
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
  });

  const schoolImages = await Promise.all(
    schoolWithImages.pictures.map(async (picture) => {
      const url = await awsHelper.getImageUrl(picture);
      return { url, key: picture };
    })
  );

  OrchestrationResult.item(
    res,
    { ...schoolWithImages, imagesUrls: schoolImages },
    200
  );
};

const updateSchool = async (req: Request, res: Response) => {
  const { id } = req.params;

  let {
    type,
    name,
    description,
    longitude,
    latitude,
    country,
    city,
    email,
    phoneNumber,
    fullAddressName,
    website,
  } = req.body;

  const school = await prisma.school.findUnique({
    where: {
      id,
    },
  });

  if (!school) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "School does not exist");
    return;
  }

  const updatedSchool = await prisma.school.update({
    where: {
      id: school.id,
    },
    data: {
      name,
      type,
      description,
      longitude: Number(longitude),
      latitude: Number(latitude),
      country,
      city,
      email,
      phoneNumber,
      website,
    },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      longitude: true,
      latitude: true,
      country: true,
      city: true,
      email: true,
      phoneNumber: true,
      website: true,
      visits: true,
      createdAt: true,
      fullAddressName: true,
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
  });

  OrchestrationResult.item(res, updatedSchool, 200);
};

const deleteSchool = async (req: Request, res: Response) => {
  const { id } = req.params;

  const school = await prisma.school.findUnique({
    where: {
      id,
    },
  });

  if (!school) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "School does not exist");
    return;
  }

  const deletedSchool = await prisma.school.update({
    where: {
      id: school.id,
    },
    data: {
      isDeleted: true,
    },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      longitude: true,
      latitude: true,
      country: true,
      city: true,
      email: true,
      phoneNumber: true,
      fullAddressName: true,
      website: true,
      visits: true,
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
  });

  OrchestrationResult.item(res, deletedSchool, 200);
};

const restoreSchool = async (req: Request, res: Response) => {
  const { id } = req.params;

  const school = await prisma.school.findUnique({
    where: {
      id,
    },
  });

  if (!school) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "School does not exist");
    return;
  }

  const restoredSchool = await prisma.school.update({
    where: {
      id: school.id,
    },
    data: {
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      longitude: true,
      latitude: true,
      country: true,
      city: true,
      fullAddressName: true,
      email: true,
      phoneNumber: true,
      website: true,
      visits: true,
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
  });

  OrchestrationResult.item(res, restoredSchool, 200);
};

const visitSchool = async (req: Request, res: Response) => {
  const { id } = req.params;

  const school = await prisma.school.findUnique({
    where: {
      id,
    },
  });

  if (!school) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "School does not exist");
    return;
  }

  await prisma.school.update({
    where: {
      id: school.id,
    },
    data: {
      visits: ++school.visits,
    },
  });

  OrchestrationResult.success(res);
};

const superUserSeeSchool = async (req: Request, res: Response) => {
  const { id } = req.params;

  const school = await prisma.school.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      longitude: true,
      latitude: true,
      country: true,
      city: true,
      email: true,
      phoneNumber: true,
      website: true,
      pictures: true,
      visits: true,
      fullAddressName: true,
      isDeleted: true,
      createdAt: true,
      updatedAt: true,
      rating: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!school) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "School does not exist");
    return;
  }

  const awsHelper = new AwsS3Helper();

  const schoolImages = await Promise.all(
    school.pictures.map(async (picture) => {
      const url = await awsHelper.getImageUrl(picture);
      return { url, key: picture };
    })
  );

  OrchestrationResult.item(res, { ...school, imagesUrls: schoolImages }, 200);
};

const seeSchool = async (req: Request, res: Response) => {
  const { id } = req.params;
  const longitude = req.query.longitude
    ? String(sanitizeInput(req.query.longitude as string))
    : "";
  const latitude = req.query.latitude
    ? String(sanitizeInput(req.query.latitude as string))
    : "";

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

    const prismaWithGeolocation = prisma.$extends({
      result: {
        school: {
          distance: {
            needs: { latitude: true, longitude: true },
            compute(school) {
              return haversineDistance(
                { latitude: Number(latitude), longitude: Number(longitude) },
                { latitude: school.latitude, longitude: school.longitude }
              );
            },
          },
        },
      },
    });

    const school = await prismaWithGeolocation.school.findUnique({
      where: {
        id,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        longitude: true,
        latitude: true,
        country: true,
        city: true,
        email: true,
        fullAddressName: true,
        phoneNumber: true,
        website: true,
        pictures: true,
        visits: true,
        distance: true,
        createdAt: true,
        updatedAt: true,
        rating: true,
      },
    });

    if (!school) {
      OrchestrationResult.notFound(
        res,
        CODES.NOT_FOUND,
        "School does not exist"
      );
      return;
    }

    const awsHelper = new AwsS3Helper();

    const schoolImages = await Promise.all(
      school.pictures.map(async (picture) => {
        const url = await awsHelper.getImageUrl(picture);
        return { url, key: picture };
      })
    );

    OrchestrationResult.item(res, { ...school, imagesUrls: schoolImages }, 200);
  } else {
    const school = await prisma.school.findUnique({
      where: {
        id,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        longitude: true,
        latitude: true,
        country: true,
        fullAddressName: true,
        city: true,
        email: true,
        phoneNumber: true,
        website: true,
        pictures: true,
        visits: true,
        createdAt: true,
        updatedAt: true,
        rating: true,
      },
    });

    if (!school) {
      OrchestrationResult.notFound(
        res,
        CODES.NOT_FOUND,
        "School does not exist"
      );
      return;
    }

    const awsHelper = new AwsS3Helper();

    const schoolImages = await Promise.all(
      school.pictures.map(async (picture) => {
        const url = await awsHelper.getImageUrl(picture);
        return { url, key: picture };
      })
    );

    OrchestrationResult.item(res, { ...school, imagesUrls: schoolImages }, 200);
  }
};

const superUserSeeSchools = async (req: Request, res: Response) => {
  const { name, itemsPerPage, page, skip } =
    getNameAndPageAndItemsPerPageFromRequestQuery(req);

  const city = req.query.city ? String(req.query.city) : "";
  const country = req.query.country ? String(req.query.country) : "";
  const type = req.query.type ? String(req.query.type) : "";

  const orderByVisits =
    req.query.orderByVisits === "asc" || req.query.orderByVisits === "desc"
      ? (String(req.query.orderByVisits) as "asc" | "desc")
      : "desc";
  const orderByRating =
    req.query.orderByRating === "asc" || req.query.orderByRating === "desc"
      ? (String(req.query.orderByRating) as "asc" | "desc")
      : "desc";

  const moreFilters: { [key: string]: any } = {};

  if (type) {
    moreFilters.type = {
      equals: type,
    };
  }

  const schools = await prisma.school.findMany({
    where: {
      name: {
        contains: name,
        mode: "insensitive",
      },
      country: {
        contains: country,
        mode: "insensitive",
      },
      city: {
        contains: city,
        mode: "insensitive",
      },
      ...moreFilters,
    },
    orderBy: [
      { rating: orderByRating as "asc" | "desc" }, // Sort by rating, default to descending
      { visits: orderByVisits as "asc" | "desc" },
    ],
    skip: skip,
    take: itemsPerPage,
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      longitude: true,
      latitude: true,
      country: true,
      city: true,
      email: true,
      phoneNumber: true,
      fullAddressName: true,
      website: true,
      visits: true,
      rating: true,
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
  });
  const count = await prisma.school.count({
    where: {
      name: {
        contains: name,
        mode: "insensitive",
      },
      country: {
        contains: country,
        mode: "insensitive",
      },
      city: {
        contains: city,
        mode: "insensitive",
      },
      ...moreFilters,
    },
  });

  OrchestrationResult.list(res, schools, count, itemsPerPage, page);
};

// const searchSchools = async (req: Request, res: Response) => {
//   const { name, itemsPerPage, page, skip } =
//     getNameAndPageAndItemsPerPageFromRequestQuery(req);

//   // School search query
//   const city = req.query.city
//     ? String(sanitizeInput(req.query.city as string))
//     : "";
//   const country = req.query.country
//     ? String(sanitizeInput(req.query.country as string))
//     : "";
//   const type = req.query.type
//     ? String(sanitizeInput(req.query.type as string))
//     : "";
//   const longitude = req.query.longitude
//     ? String(sanitizeInput(req.query.longitude as string))
//     : "";
//   const latitude = req.query.latitude
//     ? String(sanitizeInput(req.query.latitude as string))
//     : "";

//   // Program search query
//   const programName = req.query.programName
//     ? String(sanitizeInput(req.query.programName as string))
//     : "";
//   const programType = req.query.programType
//     ? String(sanitizeInput(req.query.programType as string))
//     : "";
//   const programField = req.query.programField
//     ? String(sanitizeInput(req.query.programField as string))
//     : "";
//   const programMinPrice = req.query.programMinPrice
//     ? String(sanitizeInput(req.query.programMinPrice as string))
//     : "";
//   const programMaxPrice = req.query.programMaxPrice
//     ? String(sanitizeInput(req.query.programMaxPrice as string))
//     : "";

//   // Order by
//   const orderByVisits =
//     req.query.orderByVisits === "asc" || req.query.orderByVisits === "desc"
//       ? (String(req.query.orderByVisits) as "asc" | "desc")
//       : "desc";
//   const orderByRating =
//     req.query.orderByRating === "asc" || req.query.orderByRating === "desc"
//       ? (String(req.query.orderByRating) as "asc" | "desc")
//       : "desc";
//   const orderByDistance =
//     req.query.orderByDistance === "asc" || req.query.orderByDistance === "desc"
//       ? (String(req.query.orderByDistance) as "asc" | "desc")
//       : "asc";

//   // Query validations
//   if (longitude || latitude) {
//     if (!isNumeric(latitude) || !isNumeric(longitude)) {
//       OrchestrationResult.badRequest(
//         res,
//         CODES.VALIDATION_REQUEST_ERROR,
//         "Provide a correct longitude and latitude"
//       );
//       return;
//     }
//     if (
//       Number(latitude) < -90 ||
//       Number(latitude) > 90 ||
//       Number(longitude) < -180 ||
//       Number(longitude) > 180
//     ) {
//       OrchestrationResult.badRequest(
//         res,
//         CODES.VALIDATION_REQUEST_ERROR,
//         "Provide a correct longitude and latitude"
//       );
//       return;
//     }
//   }

//   // Postgres search query
//   const query = `
//     SELECT
//       s.id AS schoolId,
//       s.name AS schoolName,
//       s.description AS schoolDescription,
//       s.type AS schoolType,
//       s.longitude AS schoolLongitude,
//       s.latitude AS schoolLatitude,
//       s.country AS schoolCountry,
//       s.city AS schoolCity,
//       s.email AS schoolEmail,
//       s."phoneNumber" AS schoolPhoneNumber,
//       s."createdAt" AS schoolCreatedAt,
//       s."updatedAt" AS schoolUpdatedAt,
//       s.website AS schoolWebsite,
//       s.visits AS schoolVisits,
//       s.rating AS schoolRating
//       ${
//         (programName ||
//           programField ||
//           programType ||
//           programMinPrice ||
//           programMaxPrice) &&
//         `, STRING_AGG(p.name, ', ') AS programNames`
//       }
//       ${
//         longitude &&
//         latitude &&
//         `,(6371 * acos(cos(radians(${Number(
//           latitude
//         )})) * cos(radians(s.latitude)) *
//         cos(radians(s.longitude) - radians(${Number(longitude)})) +
//         sin(radians(${Number(
//           latitude
//         )})) * sin(radians(s.latitude)))) AS schoolDistance`
//       }
//     FROM "School" AS s
//     ${
//       (programName ||
//         programField ||
//         programType ||
//         programMinPrice ||
//         programMaxPrice) &&
//       ` INNER JOIN "SchoolProgram" as sp ON s."id" = sp."schoolId"
//         INNER JOIN "Program" as p ON sp."programId" = p."id"
//       `
//     }
//     WHERE
//       s.name ILIKE '%${name}%' AND
//       s.country ILIKE '%${country}%' AND
//       s.city ILIKE '%${city}%' AND
//       ${type && `s.type = '${type}' AND`}
//       ${programName && `p.name ILIKE '%${programName}%' AND`}
//       ${programField && `p.field = '${programField}' AND`}
//       ${programType && `p.type = '${programType}' AND`}
//       ${
//         programMaxPrice &&
//         programMinPrice &&
//         `sp.price BETWEEN ${Number(programMinPrice)} AND ${Number(
//           programMaxPrice
//         )} AND`
//       }
//       ${
//         (programName ||
//           programField ||
//           programType ||
//           programMinPrice ||
//           programMaxPrice) &&
//         `
//           sp."isDeleted" = false AND
//           p."isDeleted" = false  AND
//         `
//       }
//       s."isDeleted" = false
//     ${
//       (programName ||
//         programField ||
//         programType ||
//         programMinPrice ||
//         programMaxPrice) &&
//       "GROUP BY s.id"
//     }
//     ORDER BY
//       ${longitude && latitude && `schoolDistance ${orderByDistance},`}
//       schoolRating ${orderByRating},
//       schoolVisits ${orderByVisits}
//     LIMIT ${itemsPerPage} OFFSET ${skip}
//   `;

//   // Postgres count query
//   const countQuery = `
//   SELECT
//     COUNT(s.id)
//     FROM "School" AS s
//     ${
//       (programName ||
//         programField ||
//         programType ||
//         programMinPrice ||
//         programMaxPrice) &&
//       ` INNER JOIN "SchoolProgram" as sp ON s."id" = sp."schoolId"
//         INNER JOIN "Program" as p ON sp."programId" = p."id"
//       `
//     }
//     WHERE
//       s.name ILIKE '%${name}%' AND
//       s.country ILIKE '%${country}%' AND
//       s.city ILIKE '%${city}%' AND
//       ${type && `s.type = '${type}' AND`}
//       ${programName && `p.name ILIKE '%${programName}%' AND`}
//       ${programField && `p.field = '${programField}' AND`}
//       ${programType && `p.type = '${programType}' AND`}
//       ${
//         programMaxPrice &&
//         programMinPrice &&
//         `sp.price BETWEEN ${Number(programMinPrice)} AND ${Number(
//           programMaxPrice
//         )} AND`
//       }
//       ${
//         (programName ||
//           programField ||
//           programType ||
//           programMinPrice ||
//           programMaxPrice) &&
//         `
//           sp."isDeleted" = false AND
//           p."isDeleted" = false  AND
//         `
//       }
//       s."isDeleted" = false
//       ${
//         (programName ||
//           programField ||
//           programType ||
//           programMinPrice ||
//           programMaxPrice) &&
//         "GROUP BY s.id"
//       }

//   `;

//   const schools = (await prisma.$queryRawUnsafe(query)) as any[];
//   const formattedSchools = schools.map((school) => {
//     return {
//       id: school.schoolid,
//       name: school.schoolname,
//       description: school.schooldescription,
//       type: school.schooltype,
//       longitude: school.schoollongitude,
//       latitude: school.schoollatitude,
//       country: school.schoolcountry,
//       city: school.schoolcity,
//       email: school.schoolemail,
//       phoneNumber: school.schoolphonenumber,
//       website: school.schoolwebsite,
//       visits: school.schoolvisits,
//       rating: school.schoolrating,
//       createdAt: school.schoolcreatedat,
//       updatedAt: school.schoolupdatedat,
//       distance: school.schooldistance || undefined,
//       programs: school.programnames
//         ? school.programnames.split(", ")
//         : undefined,
//     };
//   });

//   const countData = await prisma.$queryRawUnsafe<{ count: number }[]>(
//     countQuery
//   );
//   const count = Number(
//     countData.length > 0 ? countData[countData.length - 1].count : 0
//   );

//   OrchestrationResult.list(res, formattedSchools, count, itemsPerPage, page);
// };

const searchSchools = async (req: Request, res: Response) => {
  const { name, itemsPerPage, page, skip } =
    getNameAndPageAndItemsPerPageFromRequestQuery(req);

  // School search query
  const city = req.query.city
    ? String(sanitizeInput(req.query.city as string))
    : "";
  const country = req.query.country
    ? String(sanitizeInput(req.query.country as string))
    : "";
  const type = req.query.type
    ? String(sanitizeInput(req.query.type as string))
    : "";
  const longitude = req.query.longitude
    ? String(sanitizeInput(req.query.longitude as string))
    : "";
  const latitude = req.query.latitude
    ? String(sanitizeInput(req.query.latitude as string))
    : "";

  // Program search query
  const programName = req.query.programName
    ? String(sanitizeInput(req.query.programName as string))
    : "";
  const programType = req.query.programType
    ? String(sanitizeInput(req.query.programType as string))
    : "";
  const programField = req.query.programField
    ? String(sanitizeInput(req.query.programField as string))
    : "";
  const programMinPrice = req.query.programMinPrice
    ? String(sanitizeInput(req.query.programMinPrice as string))
    : "";
  const programMaxPrice = req.query.programMaxPrice
    ? String(sanitizeInput(req.query.programMaxPrice as string))
    : "";
  const programCurrency = req.query.programCurrency
    ? String(sanitizeInput(req.query.programCurrency as string))
    : "";

  // Order by
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

  // Query validations
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

  // Postgres search query
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
      s."phoneNumber" AS schoolPhoneNumber,
      s."createdAt" AS schoolCreatedAt,
      s."updatedAt" AS schoolUpdatedAt,
      s.website AS schoolWebsite,
      s.visits AS schoolVisits,
      s.rating AS schoolRating
      ${
        (programName ||
          programField ||
          programType ||
          programMinPrice ||
          programMaxPrice ||
          programCurrency) &&
        `, STRING_AGG(p.name, ', ') AS programNames , STRING_AGG(p.id, ', ') AS programIds`
      }
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
    FROM "School" AS s
    ${
      (programName ||
        programField ||
        programType ||
        programMinPrice ||
        programMaxPrice ||
        programCurrency) &&
      ` INNER JOIN "SchoolProgram" as sp ON s."id" = sp."schoolId" 
        INNER JOIN "Program" as p ON sp."programId" = p."id"
      `
    }
    WHERE
      s.name ILIKE '%${name}%' AND
      s.country ILIKE '%${country}%' AND
      s.city ILIKE '%${city}%' AND
      ${type && `s.type = '${type}' AND`}
      ${programName && `p.name ILIKE '%${programName}%' AND`}
      ${programField && `p.field = '${programField}' AND`}
      ${programType && `p.type = '${programType}' AND`}
      ${
        programMaxPrice &&
        programMinPrice &&
        programCurrency &&
        `sp.price BETWEEN ${Number(programMinPrice)} AND ${Number(
          programMaxPrice
        )} AND sp.currency = '${programCurrency}' AND`
      }
      ${
        (programName ||
          programField ||
          programType ||
          programMinPrice ||
          programMaxPrice ||
          programCurrency) &&
        ` 
          sp."isDeleted" = false AND
          p."isDeleted" = false  AND 
        `
      }
      s."isDeleted" = false 
    ${
      (programName ||
        programField ||
        programType ||
        programMinPrice ||
        programMaxPrice ||
        programCurrency) &&
      "GROUP BY s.id"
    }
    ORDER BY
      ${longitude && latitude && `schoolDistance ${orderByDistance},`}
      schoolRating ${orderByRating},
      schoolVisits ${orderByVisits}
    LIMIT ${itemsPerPage} OFFSET ${skip}
  `;

  // Postgres count query
  const countQuery = `
  SELECT
    COUNT(s.id)
    FROM "School" AS s
    ${
      (programName ||
        programField ||
        programType ||
        programMinPrice ||
        programMaxPrice ||
        programCurrency) &&
      ` INNER JOIN "SchoolProgram" as sp ON s."id" = sp."schoolId" 
        INNER JOIN "Program" as p ON sp."programId" = p."id"
      `
    }
    WHERE
      s.name ILIKE '%${name}%' AND
      s.country ILIKE '%${country}%' AND
      s.city ILIKE '%${city}%' AND
      ${type && `s.type = '${type}' AND`}
      ${programName && `p.name ILIKE '%${programName}%' AND`}
      ${programField && `p.field = '${programField}' AND`}
      ${programType && `p.type = '${programType}' AND`}
      ${
        programMaxPrice &&
        programMinPrice &&
        programCurrency &&
        `sp.price BETWEEN ${Number(programMinPrice)} AND ${Number(
          programMaxPrice
        )} AND sp.currency = '${programCurrency}' AND`
      }
      ${
        (programName ||
          programField ||
          programType ||
          programMinPrice ||
          programMaxPrice ||
          programCurrency) &&
        ` 
          sp."isDeleted" = false AND
          p."isDeleted" = false  AND 
        `
      }
      s."isDeleted" = false 
      ${
        (programName ||
          programField ||
          programType ||
          programMinPrice ||
          programMaxPrice ||
          programCurrency) &&
        "GROUP BY s.id"
      }
    
  `;

  const schools = (await prisma.$queryRawUnsafe(query)) as any[];
  console.log(schools);

  const formattedSchools = schools.map((school) => {
    const programIds = school.programids?.split(", ");
    const programNames = school.programnames?.split(", ");

    const programs =
      programIds && programNames && programIds.length === programNames.length
        ? programIds.map((id: string, index: number) => ({
            id,
            name: programNames[index],
          }))
        : undefined;

    return {
      id: school.schoolid,
      name: school.schoolname,
      description: school.schooldescription,
      type: school.schooltype,
      longitude: school.schoollongitude,
      latitude: school.schoollatitude,
      country: school.schoolcountry,
      city: school.schoolcity,
      email: school.schoolemail,
      phoneNumber: school.schoolphonenumber,
      website: school.schoolwebsite,
      visits: school.schoolvisits,
      rating: school.schoolrating,
      createdAt: school.schoolcreatedat,
      updatedAt: school.schoolupdatedat,
      distance: school.schooldistance || undefined,
      programs,
    };
  });

  const countData = await prisma.$queryRawUnsafe<{ count: number }[]>(
    countQuery
  );
  const count = Number(
    countData.length > 0 ? countData[countData.length - 1].count : 0
  );

  OrchestrationResult.list(res, formattedSchools, count, itemsPerPage, page);
};

export default {
  createSchool,
  addImages,
  deleteImage,
  updateSchool,
  deleteSchool,
  restoreSchool,
  visitSchool,
  superUserSeeSchool,
  seeSchool,
  superUserSeeSchools,
  searchSchools,
};
