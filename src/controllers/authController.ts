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

const createAccount = async (req: Request, res: Response) => {
  let { email, password, name } = req.body;

  const existingUser = await prisma.user.findFirst({
    where: {
      email,
    },
  });

  if (existingUser) {
    if (existingUser.isDeleted) {
      OrchestrationResult.badRequest(
        res,
        CODES.ACCOUNT_DELETED,
        "Account has been deleted, contact support team."
      );
      return;
    }

    if (existingUser.isActive) {
      OrchestrationResult.badRequest(
        res,
        CODES.EMAIL_IN_USE,
        "Email exist already in user"
      );
      return;
    } else {
      OrchestrationResult.badRequest(
        res,
        CODES.ACCOUNT_NOT_ACTIVATED,
        "Account exist already but has not been activated, check email."
      );
      return;
    }
  }

  password = await PasswordManager.toHash(password);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      password,
      type: UserType.Client,
    },
  });

  const { code } = JWTCodes.generate(
    { id: user.id, email: user.email },
    process.env.ACTIVATE_ACCOUNT_JWT_KEY as string
  );

  console.log(code);

  const awsHelper = new AwsSesHelper();
  await awsHelper.sendActivateAccountEmail(
    user.email,
    user.name || "user",
    code
  );

  OrchestrationResult.success(res, 201);
};

const activateAccount = async (req: Request, res: Response) => {
  const { code } = req.body;

  const { id } = JWTCodes.decode(
    code,
    process.env.ACTIVATE_ACCOUNT_JWT_KEY as string
  );

  const user = await prisma.user.findFirst({
    where: {
      id,
    },
  });

  if (!user) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "Account not found");
    return;
  }

  if (user.isActive) {
    OrchestrationResult.success(res);
    return;
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      type: true,
    },
  });

  OrchestrationResult.success(res);
};

const signin = async (req: Request, res: Response) => {
  let { email, password } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      email,
    },
  });

  if (!user) {
    OrchestrationResult.badRequest(
      res,
      CODES.UNABLE_TO_LOGIN,
      "Unable to login"
    );
    return;
  }

  if (!user?.isActive) {
    OrchestrationResult.badRequest(
      res,
      CODES.ACCOUNT_NOT_ACTIVATED,
      "Activate your account"
    );
    return;
  }

  if (user?.isDeleted) {
    OrchestrationResult.badRequest(
      res,
      CODES.ACCOUNT_DELETED,
      "Your account has been deleted, contact support."
    );
    return;
  }

  const match = await PasswordManager.compare(user.password, password);
  if (!match) {
    OrchestrationResult.badRequest(
      res,
      CODES.UNABLE_TO_LOGIN,
      "Unable to login"
    );
    return;
  }

  const { accessToken, refreshToken } = generateTokens({
    id: user.id,
    email: user.email,
    type: user.type,
  });

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      token: refreshToken,
    },
  });

  const data = {
    id: user.id,
    name: user.name,
    email: user.email,
    type: user.type,
    accessToken,
    refreshToken,
  };

  OrchestrationResult.item(res, data, 200);
};

const getProfile = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.currentUser?.id },
    select: {
      id: true,
      name: true,
      email: true,
      type: true,
      isActive: true,
      isDeleted: true,
    },
  });

  if (!user) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "User not found");
    return;
  }

  if (!user?.isActive) {
    OrchestrationResult.badRequest(
      res,
      CODES.ACCOUNT_NOT_ACTIVATED,
      "Activate your account"
    );
    return;
  }

  if (user?.isDeleted) {
    OrchestrationResult.badRequest(
      res,
      CODES.ACCOUNT_DELETED,
      "Your account has been deleted, contact support."
    );
    return;
  }

  OrchestrationResult.item(res, user, 200);
};

const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "User not found");
    return;
  }

  if (!user?.isActive) {
    OrchestrationResult.badRequest(
      res,
      CODES.ACCOUNT_NOT_ACTIVATED,
      "Activate your account"
    );
    return;
  }

  if (user?.isDeleted) {
    OrchestrationResult.badRequest(
      res,
      CODES.ACCOUNT_DELETED,
      "Your account has been deleted, contact support."
    );
    return;
  }

  const { code } = JWTCodes.generate(
    { id: user.id, email: user.email },
    process.env.FORGOT_PASSWORD_JWT_KEY as string
  );

  console.log(code);

  const awsHelper = new AwsSesHelper();
  await awsHelper.sendResetPasswordEmail(user.email, user.name || "user", code);

  OrchestrationResult.success(res);
};

const resetPassword = async (req: Request, res: Response) => {
  let { code, password } = req.body;

  const { id } = JWTCodes.decode(
    code,
    process.env.FORGOT_PASSWORD_JWT_KEY as string
  );

  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "User not found");
    return;
  }

  if (!user?.isActive) {
    OrchestrationResult.badRequest(
      res,
      CODES.ACCOUNT_NOT_ACTIVATED,
      "Activate your account"
    );
    return;
  }

  if (user?.isDeleted) {
    OrchestrationResult.badRequest(
      res,
      CODES.ACCOUNT_DELETED,
      "Your account has been deleted, contact support."
    );
    return;
  }

  password = await PasswordManager.toHash(password);

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      password,
    },
  });

  OrchestrationResult.success(res);
};

const updatePassword = async (req: Request, res: Response) => {
  let { oldPassword, newPassword, confirmNewPassword } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: req.currentUser?.id },
  });

  if (!user) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "User not found");
    return;
  }

  if (!user?.isActive) {
    OrchestrationResult.badRequest(
      res,
      CODES.ACCOUNT_NOT_ACTIVATED,
      "Activate your account"
    );
    return;
  }

  if (user?.isDeleted) {
    OrchestrationResult.badRequest(
      res,
      CODES.ACCOUNT_DELETED,
      "Your account has been deleted, contact support."
    );
    return;
  }

  const match = await PasswordManager.compare(user.password, oldPassword);
  if (!match) {
    OrchestrationResult.badRequest(
      res,
      CODES.PASSWORD_DOES_NOT_MATCH,
      "Password does not match"
    );
    return;
  }

  if (newPassword !== confirmNewPassword) {
    OrchestrationResult.badRequest(
      res,
      CODES.PASSWORDS_MUST_BE_THE_SAME,
      "Passwords must be the same"
    );
    return;
  }

  const password = await PasswordManager.toHash(newPassword);

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      password,
    },
  });

  OrchestrationResult.success(res);
};

const updateAccount = async (req: Request, res: Response) => {
  let { name } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: req.currentUser?.id },
  });

  if (!user) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "User not found");
    return;
  }

  if (!user?.isActive) {
    OrchestrationResult.badRequest(
      res,
      CODES.ACCOUNT_NOT_ACTIVATED,
      "Activate your account"
    );
    return;
  }

  if (user?.isDeleted) {
    OrchestrationResult.badRequest(
      res,
      CODES.ACCOUNT_DELETED,
      "Your account has been deleted, contact support."
    );
    return;
  }

  const updateduser = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      name,
    },
    select: {
      id: true,
      name: true,
      email: true,
      type: true,
      isActive: true,
      isDeleted: true,
    },
  });

  OrchestrationResult.item(res, updateduser);
};

const logout = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.currentUser?.id },
  });

  if (!user) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "User not found");
    return;
  }

  if (!user?.isActive) {
    OrchestrationResult.badRequest(
      res,
      CODES.ACCOUNT_NOT_ACTIVATED,
      "Activate your account"
    );
    return;
  }

  if (user?.isDeleted) {
    OrchestrationResult.badRequest(
      res,
      CODES.ACCOUNT_DELETED,
      "Your account has been deleted, contact support."
    );
    return;
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      token: null,
    },
  });

  OrchestrationResult.success(res);
};

const refresh = async (req: Request, res: Response) => {
  const refresh = req.header("Authorization")?.replace("Bearer ", "");

  if (!refresh) {
    OrchestrationResult.unAuthorized(
      res,
      CODES.NO_REFRESH_TOKEN,
      "No refresh token"
    );
    return;
  }

  const foundUser = await prisma.user.findFirst({
    where: {
      token: refresh,
    },
  });

  if (!foundUser) {
    try {
      const decoded: any = jwt.verify(
        refresh,
        process.env.REFRESH_TOKEN_JWT_KEY as string
      );
      console.log("Reuse detection mechanism");

      const hackedUser = await prisma.user.findUnique({
        where: {
          id: decoded.id,
        },
      });

      if (hackedUser) {
        await prisma.user.update({
          where: { id: decoded.id },
          data: {
            token: null,
          },
        });
      }

      OrchestrationResult.unAuthorized(
        res,
        CODES.REUSE_DETECTION,
        "Reuse detection"
      );
      return;
    } catch (error: any) {
      OrchestrationResult.unAuthorized(
        res,
        CODES.CANNOT_DECODE_TOKEN,
        "Cannot decode refresh token"
      );
      return;
    }
  }

  try {
    const decoded: any = jwt.verify(
      refresh,
      process.env.REFRESH_TOKEN_JWT_KEY as string
    );

    if (decoded?.id !== foundUser.id) {
      OrchestrationResult.unAuthorized(
        res,
        CODES.UNAUTHORIZED,
        "Not authorized"
      );
    }

    const { accessToken, refreshToken } = generateTokens(foundUser);
    await prisma.user.update({
      where: {
        id: foundUser.id,
      },
      data: {
        token: refreshToken,
      },
    });

    const data = {
      id: foundUser.id,
      name: foundUser.name,
      email: foundUser.email,
      type: foundUser.type,
      accessToken,
      refreshToken,
    };
    OrchestrationResult.item(res, data, 200);
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      OrchestrationResult.unAuthorized(
        res,
        CODES.REFRESH_TOKEN_EXPIRED,
        "Refresh token has expired, login again."
      );
      return;
    }

    OrchestrationResult.unAuthorized(
      res,
      CODES.CANNOT_DECODE_TOKEN,
      "Cannot decode refresh token"
    );
    return;
  }
};

const seeUsers = async (req: Request, res: Response) => {
  const { name, itemsPerPage, page, skip } =
    getNameAndPageAndItemsPerPageFromRequestQuery(req);
  const userType = req.query.userType
    ? (String(req.query.userType) as UserType)
    : UserType.Client;

  const users = await prisma.user.findMany({
    where: {
      name: {
        contains: name,
        mode: "insensitive",
      },
      type: userType,
    },
    orderBy: {
      name: "asc",
    },
    skip: skip,
    take: itemsPerPage,
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      isDeleted: true,
      type: true,
    },
  });
  const count = await prisma.user.count({
    where: {
      name: {
        contains: name,
        mode: "insensitive",
      },
      type: userType,
    },
  });

  OrchestrationResult.list(res, users, count, itemsPerPage, page);
};

const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "User not found");
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isDeleted: true,
      token: null,
    },
  });

  OrchestrationResult.success(res);
};

const unDeleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "User not found");
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isDeleted: false,
    },
  });

  OrchestrationResult.success(res);
};

const adminDeactivateAccount = async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "User not found");
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isActive: false,
      token: null,
    },
  });

  OrchestrationResult.success(res);
};

const adminActivateAccount = async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "User not found");
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isActive: true,
    },
  });

  OrchestrationResult.success(res);
};

const createAdmin = async (req: Request, res: Response) => {
  let { email, password, name } = req.body;

  const adminsCount = await prisma.user.count({
    where: {
      type: UserType.Admin,
      isDeleted: false,
    },
  });

  if (adminsCount >= 3) {
    OrchestrationResult.badRequest(
      res,
      CODES.MAX_ADMINS,
      "Maximum number of admins in the system is 3"
    );
    return;
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      email,
    },
  });

  if (existingUser) {
    if (existingUser.isDeleted) {
      OrchestrationResult.badRequest(
        res,
        CODES.ACCOUNT_DELETED,
        "Account has been deleted, contact support team."
      );
      return;
    }

    if (existingUser.isActive) {
      OrchestrationResult.badRequest(
        res,
        CODES.EMAIL_IN_USE,
        "Email exist already in user"
      );
      return;
    } else {
      OrchestrationResult.badRequest(
        res,
        CODES.ACCOUNT_NOT_ACTIVATED,
        "Account exist already but has not been activated, check email."
      );
      return;
    }
  }

  password = await PasswordManager.toHash(password);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      password,
      type: UserType.Admin,
    },
  });

  const { code } = JWTCodes.generate(
    { id: user.id, email: user.email },
    process.env.ACTIVATE_ACCOUNT_JWT_KEY as string
  );
  console.log(code);

  const awsHelper = new AwsSesHelper();
  await awsHelper.sendActivateAccountEmail(
    user.email,
    user.name || "user",
    code
  );

  OrchestrationResult.success(res, 201);
};

// when we reactivate a deleted admin, check the count
// sanitize the id params well

// Work on swagger
// Work on tests

export default {
  createAccount,
  activateAccount,
  signin,
  getProfile,
  forgotPassword,
  resetPassword,
  updatePassword,
  updateAccount,
  logout,
  refresh,
  seeUsers,
  deleteUser,
  unDeleteUser,
  adminActivateAccount,
  adminDeactivateAccount,
  createAdmin,
};
