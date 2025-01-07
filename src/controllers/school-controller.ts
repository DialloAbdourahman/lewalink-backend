import { Request, Response } from "express";
import { prisma } from "../prisma";
import { OrchestrationResult } from "../utils/orchestration-result";
import { CODES } from "../enums/codes";
import { getNameAndPageAndItemsPerPageFromRequestQuery } from "../utils/get-name-and-page-and-items-per-page-from-request";
import { AwsS3Helper } from "../utils/aws-s3-helper";
import { generateRandomString } from "../utils/generateRandomString";
import { SchoolType } from "../enums/school-types";
import { isEnumValue } from "../utils/is-enum-value";
import { haversineDistance } from "../utils/haversine";
import { isNumeric } from "../utils/isDigitsOnly";
import { Prisma, School } from "@prisma/client";
import { Sql } from "@prisma/client/runtime/library";

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

  if (!isEnumValue(SchoolType, type)) {
    OrchestrationResult.badRequest(
      res,
      CODES.VALIDATION_REQUEST_ERROR,
      "Please provide a correct school type"
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
    website,
  } = req.body;

  if (!isEnumValue(SchoolType, type)) {
    OrchestrationResult.badRequest(
      res,
      CODES.VALIDATION_REQUEST_ERROR,
      "Please provide a correct school type"
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
      website: true,
      visits: true,
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
      email: true,
      phoneNumber: true,
      website: true,
      visits: true,
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
      city: true,
      email: true,
      phoneNumber: true,
      website: true,
      pictures: true,
      visits: true,
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

const seeSchoolWithGeolocalization = async (req: Request, res: Response) => {
  const { id } = req.params;
  const longitude = req.query.longitude as string;
  const latitude = req.query.latitude as string;

  if (
    !longitude ||
    !latitude ||
    longitude === "undefined" ||
    latitude === "undefined" ||
    !isNumeric(latitude) ||
    !isNumeric(longitude)
  ) {
    OrchestrationResult.badRequest(
      res,
      CODES.VALIDATION_REQUEST_ERROR,
      "Please enter longitude and latitude"
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
      phoneNumber: true,
      website: true,
      pictures: true,
      visits: true,
      distance: true,
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

  const moreFilters: { [key: string]: any } = {};

  if (type && isEnumValue(SchoolType, type)) {
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
    orderBy: { visits: orderByVisits },
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
      website: true,
      visits: true,
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

const seeSchools = async (req: Request, res: Response) => {
  const { name, itemsPerPage, page, skip } =
    getNameAndPageAndItemsPerPageFromRequestQuery(req);

  const city = req.query.city ? String(req.query.city) : "";
  const country = req.query.country ? String(req.query.country) : "";
  const type = req.query.type ? String(req.query.type) : "";

  const orderByVisits =
    req.query.orderByVisits === "asc" || req.query.orderByVisits === "desc"
      ? (String(req.query.orderByVisits) as "asc" | "desc")
      : "desc";

  const moreFilters: { [key: string]: any } = {};

  if (type && isEnumValue(SchoolType, type)) {
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
    orderBy: { visits: orderByVisits },
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
      website: true,
      visits: true,
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

const seeSchoolsWithGeolocalization = async (req: Request, res: Response) => {
  const { name, itemsPerPage, page, skip } =
    getNameAndPageAndItemsPerPageFromRequestQuery(req);

  const city = req.query.city ? String(req.query.city) : "";
  const country = req.query.country ? String(req.query.country) : "";
  let type = req.query.type ? String(req.query.type) : "";

  const longitude = req.query.longitude as string;
  const latitude = req.query.latitude as string;

  const orderByVisits =
    req.query.orderByVisits === "asc" || req.query.orderByVisits === "desc"
      ? (String(req.query.orderByVisits) as "asc" | "desc")
      : "desc";

  const orderByDistance =
    req.query.orderByDistance === "asc" || req.query.orderByDistance === "desc"
      ? (String(req.query.orderByDistance) as "asc" | "desc")
      : "asc";

  const moreFilters: { [key: string]: any } = {};

  let typeOnRawSQL = "";
  if (type && isEnumValue(SchoolType, type)) {
    moreFilters.type = {
      equals: type,
    };
    typeOnRawSQL = type;
  }

  if (
    !longitude ||
    !latitude ||
    longitude === "undefined" ||
    latitude === "undefined" ||
    !isNumeric(latitude) ||
    !isNumeric(longitude)
  ) {
    OrchestrationResult.badRequest(
      res,
      CODES.VALIDATION_REQUEST_ERROR,
      "Please enter longitude and latitude"
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

  const query = `
      SELECT
        id,
        name,
        description,
        type,
        longitude,
        latitude,
        country,
        city,
        email,
        'phone-number' AS phoneNumber,
        website,
        visits,
        (6371 * acos(cos(radians(${Number(
          latitude
        )})) * cos(radians(s.latitude)) *
          cos(radians(s.longitude) - radians(${Number(longitude)})) +
          sin(radians(${Number(
            latitude
          )})) * sin(radians(s.latitude)))) AS distance
      FROM "School" AS s
      WHERE
        s.name ILIKE '%${name}%' AND
        s.country ILIKE '%${country}%' AND
        s.city ILIKE '%${city}%'
        ${typeOnRawSQL ? `AND s.type = '${typeOnRawSQL}'` : ""}      
      ORDER BY
        distance ${orderByDistance},
        visits ${orderByVisits}
      LIMIT ${itemsPerPage} OFFSET ${skip}
  `;

  console.log(query);

  const schools = await prisma.$queryRawUnsafe<School[]>(query);

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
  seeSchools,
  seeSchoolWithGeolocalization,
  seeSchoolsWithGeolocalization,
};
