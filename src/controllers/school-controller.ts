import { Request, Response } from "express";
import { prisma } from "../prisma";
import { OrchestrationResult } from "../utils/orchestration-result";
import { CODES } from "../enums/codes";
import { getNameAndPageAndItemsPerPageFromRequestQuery } from "../utils/get-name-and-page-and-items-per-page-from-request";
import { AwsS3Helper } from "../utils/aws-s3-helper";
import { generateRandomString } from "../utils/generateRandomString";
import { SchoolType } from "../enums/school-types";
import { isEnumValue } from "../utils/is-enum-value";

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

  const schoolImages = await Promise.all(
    schoolWithImages.pictures.map(async (picture) => {
      const url = await awsHelper.getImageUrl(picture);
      return { url, key: picture };
    })
  );

  OrchestrationResult.item(
    res,
    { ...schoolWithImages, imagesUrls: schoolImages },
    201
  );
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

  const awsHelper = new AwsS3Helper();

  const schoolImages = await Promise.all(
    updatedSchool.pictures.map(async (picture) => {
      const url = await awsHelper.getImageUrl(picture);
      return { url, key: picture };
    })
  );

  OrchestrationResult.item(
    res,
    { ...updatedSchool, imagesUrls: schoolImages },
    200
  );
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

  const awsHelper = new AwsS3Helper();

  const schoolImages = await Promise.all(
    deletedSchool.pictures.map(async (picture) => {
      const url = await awsHelper.getImageUrl(picture);
      return { url, key: picture };
    })
  );

  OrchestrationResult.item(
    res,
    { ...deletedSchool, imagesUrls: schoolImages },
    200
  );
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

  const deletedSchool = await prisma.school.update({
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

  const awsHelper = new AwsS3Helper();

  const schoolImages = await Promise.all(
    deletedSchool.pictures.map(async (picture) => {
      const url = await awsHelper.getImageUrl(picture);
      return { url, key: picture };
    })
  );

  OrchestrationResult.item(
    res,
    { ...deletedSchool, imagesUrls: schoolImages },
    200
  );
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

const superUserSeeSchools = async (req: Request, res: Response) => {
  const { name, itemsPerPage, page, skip } =
    getNameAndPageAndItemsPerPageFromRequestQuery(req);

  const city = req.query.city ? String(req.query.city) : "";
  const country = req.query.country ? String(req.query.country) : "";
  const type = req.query.type ? String(req.query.type) : "";

  const orderByName =
    req.query.orderByName === "asc" || req.query.orderByName === "desc"
      ? (String(req.query.orderByName) as "asc" | "desc")
      : "asc";
  const orderByVisits =
    req.query.orderByVisits === "asc" || req.query.orderByVisits === "desc"
      ? (String(req.query.orderByVisits) as "asc" | "desc")
      : "desc";

  console.log(orderByName, orderByVisits);

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
    orderBy: [{ visits: orderByVisits }, { name: orderByName }],
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
  const count = await prisma.school.count({
    where: {
      name: {
        contains: name,
        mode: "insensitive",
      },
    },
  });

  OrchestrationResult.list(res, schools, count, itemsPerPage, page);
};

// Normal user searches for schools

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
};
