import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";
import { OrchestrationResult } from "../utils/orchestration-result";
import { CODES } from "../enums/codes";
import { PasswordManager } from "../utils/password";
import { JWTCodes } from "../utils/jwt-codes";
import { AwsSesHelper } from "../utils/aws-ses";
import { generateTokens } from "../utils/generate-tokens";
import { getNameAndPageAndItemsPerPageFromRequestQuery } from "../utils/get-name-and-page-and-items-per-page-from-request";
import { getUserFromGoogle } from "../utils/get-user-from-google";
import { UserType } from "@prisma/client";

export type UserReturned = {
  id: string;
  name: string;
  email: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
  accessToken?: string;
  refreshToken?: string;
};

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

  if (!user.password) {
    OrchestrationResult.badRequest(
      res,
      CODES.NO_PASSWORD_TO_ACCOUNT,
      "Your account doesn't have a password. Use Google to login or click on forgot password to associate a password to your account."
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

  const data: UserReturned = {
    id: user.id,
    name: user.name || "",
    email: user.email,
    type: user.type,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    accessToken,
    refreshToken,
  };

  OrchestrationResult.item(res, data, 200);
};

const getProfile = async (req: Request, res: Response) => {
  const data: UserReturned = {
    id: req.currentUser!.id,
    name: req.currentUser!.name || "",
    email: req.currentUser!.email,
    type: req.currentUser!.type,
    createdAt: req.currentUser!.createdAt,
    updatedAt: req.currentUser!.updatedAt,
  };

  OrchestrationResult.item(res, data, 200);
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

  if (!req.currentUser!.password) {
    OrchestrationResult.badRequest(
      res,
      CODES.NO_PASSWORD_TO_ACCOUNT,
      "Your account doesn't have a password, use add-password route."
    );
    return;
  }

  const match = await PasswordManager.compare(
    req.currentUser!.password,
    oldPassword
  );
  if (!match) {
    OrchestrationResult.badRequest(
      res,
      CODES.PASSWORD_DOES_NOT_MATCH,
      "The password provided should match the old password"
    );
    return;
  }

  if (newPassword !== confirmNewPassword) {
    OrchestrationResult.badRequest(
      res,
      CODES.PASSWORDS_MUST_BE_THE_SAME,
      "NewPassword and ConfirmNewPassword should be the same"
    );
    return;
  }

  const password = await PasswordManager.toHash(newPassword);

  await prisma.user.update({
    where: {
      id: req.currentUser!.id,
    },
    data: {
      password,
    },
  });

  OrchestrationResult.success(res);
};

const updateAccount = async (req: Request, res: Response) => {
  let { name } = req.body;

  const updateduser = await prisma.user.update({
    where: {
      id: req.currentUser!.id,
    },
    data: {
      name,
    },
    select: {
      id: true,
      name: true,
      email: true,
      type: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const data: UserReturned = {
    id: updateduser.id,
    name: updateduser.name || "",
    email: updateduser.email,
    createdAt: updateduser.createdAt,
    updatedAt: updateduser.updatedAt,
    type: updateduser.type,
  };

  OrchestrationResult.item(res, data);
};

const logout = async (req: Request, res: Response) => {
  await prisma.user.update({
    where: {
      id: req.currentUser!.id,
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

    if (!foundUser?.isActive) {
      OrchestrationResult.unAuthorized(
        res,
        CODES.ACCOUNT_NOT_ACTIVATED,
        "Activate your account"
      );
      return;
    }

    if (foundUser?.isDeleted) {
      OrchestrationResult.unAuthorized(
        res,
        CODES.ACCOUNT_DELETED,
        "Your account has been deleted, contact support."
      );
      return;
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

    const data: UserReturned = {
      id: foundUser.id,
      name: foundUser.name || "",
      email: foundUser.email,
      type: foundUser.type,
      createdAt: foundUser.createdAt,
      updatedAt: foundUser.updatedAt,

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
    skip: skip,
    take: itemsPerPage,
    select: {
      id: true,
      name: true,
      email: true,
      type: true,
      createdAt: true,
      updatedAt: true,
      isActive: true,
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

  if (!id) {
    OrchestrationResult.badRequest(
      res,
      CODES.VALIDATION_REQUEST_ERROR,
      "Provide an ID"
    );
    return;
  }

  if (id === req.currentUser?.id) {
    OrchestrationResult.badRequest(
      res,
      CODES.CANNOT_DELETE_YOURSELF,
      "Cannot delete yourself"
    );
    return;
  }

  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "User not found");
    return;
  }

  const deletedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      isDeleted: true,
      token: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      type: true,
      createdAt: true,
      updatedAt: true,
      isActive: true,
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

  OrchestrationResult.item(res, deletedUser);
};

const restoreUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    OrchestrationResult.badRequest(
      res,
      CODES.VALIDATION_REQUEST_ERROR,
      "Provide an ID"
    );
    return;
  }

  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "User not found");
    return;
  }

  if (user.type === UserType.Admin) {
    const adminsCount = await prisma.user.count({
      where: {
        type: UserType.Admin,
        isDeleted: false,
      },
    });

    if (adminsCount + 1 >= Number(process.env.TOTAL_ADMINS_IN_SYSTEM)) {
      OrchestrationResult.badRequest(
        res,
        CODES.MAX_ADMINS,
        "Maximum number of admins in the system is 3"
      );
      return;
    }
  }

  const restoredUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      email: true,
      type: true,
      createdAt: true,
      updatedAt: true,
      isActive: true,
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

  OrchestrationResult.item(res, restoredUser);
};

const adminDeactivateAccount = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    OrchestrationResult.badRequest(
      res,
      CODES.VALIDATION_REQUEST_ERROR,
      "Provide an ID"
    );
    return;
  }

  if (id === req.currentUser?.id) {
    OrchestrationResult.badRequest(
      res,
      CODES.CANNOT_DEACTIVATE_YOURSELF,
      "Cannot deactivate yourself"
    );
    return;
  }

  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "User not found");
    return;
  }

  const activatedAccount = await prisma.user.update({
    where: { id: user.id },
    data: {
      isActive: false,
      token: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      type: true,
      createdAt: true,
      updatedAt: true,
      isActive: true,
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

  OrchestrationResult.item(res, activatedAccount);
};

const adminActivateAccount = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    OrchestrationResult.badRequest(
      res,
      CODES.VALIDATION_REQUEST_ERROR,
      "Provide an ID"
    );
    return;
  }

  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    OrchestrationResult.notFound(res, CODES.NOT_FOUND, "User not found");
    return;
  }

  const activatedAccount = await prisma.user.update({
    where: { id: user.id },
    data: {
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      type: true,
      createdAt: true,
      updatedAt: true,
      isActive: true,
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

  OrchestrationResult.item(res, activatedAccount);
};

const createAdmin = async (req: Request, res: Response) => {
  let { email, password, name } = req.body;

  const adminsCount = await prisma.user.count({
    where: {
      type: UserType.Admin,
      isDeleted: false,
    },
  });

  if (adminsCount >= Number(process.env.TOTAL_ADMINS_IN_SYSTEM)) {
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
      creatorId: req.currentUser?.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      type: true,
      createdAt: true,
      updatedAt: true,
      isActive: true,
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

  const { code } = JWTCodes.generate(
    { id: user.id, email: user.email },
    process.env.ACTIVATE_ACCOUNT_JWT_KEY as string
  );

  const awsHelper = new AwsSesHelper();
  await awsHelper.sendActivateAccountEmail(
    user.email,
    user.name || "user",
    code
  );

  OrchestrationResult.item(res, user, 201);
};

const createEditor = async (req: Request, res: Response) => {
  let { email, password, name } = req.body;

  const editorsCount = await prisma.user.count({
    where: {
      type: UserType.Editor,
      isDeleted: false,
    },
  });

  if (editorsCount >= Number(process.env.TOTAL_EDITORS_IN_SYSTEM)) {
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
      type: UserType.Editor,
      creatorId: req.currentUser?.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      type: true,
      createdAt: true,
      updatedAt: true,
      isActive: true,
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

  const { code } = JWTCodes.generate(
    { id: user.id, email: user.email },
    process.env.ACTIVATE_ACCOUNT_JWT_KEY as string
  );

  const awsHelper = new AwsSesHelper();
  await awsHelper.sendActivateAccountEmail(
    user.email,
    user.name || "user",
    code
  );

  OrchestrationResult.item(res, user, 201);
};

const oauthGoogle = async (req: Request, res: Response) => {
  let { code } = req.body;
  let googleUser;

  try {
    googleUser = await getUserFromGoogle(code);

    if (!googleUser || !googleUser.email || !googleUser.name) {
      OrchestrationResult.serverError(
        res,
        CODES.GOOGLE_AUTH_ERROR,
        "Failed to authenticate with Google"
      );
      return;
    }
  } catch (error) {
    console.error(error);
    OrchestrationResult.serverError(
      res,
      CODES.GOOGLE_AUTH_ERROR,
      "Failed to authenticate with Google"
    );
    return;
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: googleUser.email,
    },
  });

  let user;

  if (existingUser) {
    if (existingUser.type !== "Client") {
      OrchestrationResult.badRequest(
        res,
        CODES.CLIENT_ONLY,
        "Admins are not allowed to use this route"
      );
      return;
    }

    if (!existingUser?.isActive) {
      OrchestrationResult.badRequest(
        res,
        CODES.ACCOUNT_NOT_ACTIVATED,
        "Activate your account"
      );
      return;
    }

    if (existingUser?.isDeleted) {
      OrchestrationResult.badRequest(
        res,
        CODES.ACCOUNT_DELETED,
        "Your account has been deleted, contact support."
      );
      return;
    }

    user = existingUser;
  } else {
    user = await prisma.user.create({
      data: {
        email: googleUser.email,
        name: googleUser.name,
        type: UserType.Client,
        isActive: true,
      },
    });
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

  const data: UserReturned = {
    id: user.id,
    name: user.name || "",
    email: user.email,
    type: user.type,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    accessToken,
    refreshToken,
  };

  OrchestrationResult.item(res, data, 200);
};

const hasPassword = async (req: Request, res: Response) => {
  const data = {
    hasPassword: !!req.currentUser!.password,
  };

  OrchestrationResult.item(res, data, 200);
};

const addPassword = async (req: Request, res: Response) => {
  let { newPassword, confirmNewPassword } = req.body;

  if (req.currentUser!.password) {
    OrchestrationResult.badRequest(
      res,
      CODES.PASSWORD_EXIST_ALREADY,
      "Password exists already."
    );
    return;
  }

  if (newPassword !== confirmNewPassword) {
    OrchestrationResult.badRequest(
      res,
      CODES.PASSWORDS_MUST_BE_THE_SAME,
      "NewPassword and ConfirmNewPassword should be the same"
    );
    return;
  }

  const password = await PasswordManager.toHash(newPassword);

  await prisma.user.update({
    where: {
      id: req.currentUser!.id,
    },
    data: {
      password,
    },
  });

  OrchestrationResult.success(res);
};

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
  restoreUser,
  adminActivateAccount,
  adminDeactivateAccount,
  createAdmin,
  createEditor,
  oauthGoogle,
  hasPassword,
  addPassword,
};

// const tempCreateAdmin = async (req: Request, res: Response) => {
//   let { email, password, name } = req.body;

//   password = await PasswordManager.toHash(password);

//   const admin = await prisma.user.create({
//     data: { email, name, password, type: UserType.Admin, isActive: true },
//   });

//   const secret = authenticator.generateSecret();

//   const uri = authenticator.keyuri(admin.id, "Tradez", secret);
//   const image = await qrCode.toDataURL(uri);

//   await prisma.user.update({
//     where: { id: admin.id },
//     data: {
//       twoFATempSecret: secret,
//     },
//   });

//   res.json(image);
// };

// const setTwoFA = async (req: Request, res: Response) => {
//   let { code, id } = req.body;

//   const user = await prisma.user.findUnique({ where: { id } });
//   const tempSecret = user?.twoFATempSecret;

//   const verified = authenticator.check(code, tempSecret as string);

//   if (!verified) {
//     console.log("not verified");
//     return;
//   }

//   await prisma.user.update({
//     where: { id },
//     data: {
//       twoFAEnabled: true,
//       twoFASecret: tempSecret,
//     },
//   });

//   res.json("You got the tokens!!");
// };

// const verifyTwoFA = async (req: Request, res: Response) => {
//   let { code, id } = req.body;

//   const user = await prisma.user.findUnique({ where: { id } });
//   const secret = user?.twoFASecret;

//   const verified = authenticator.check(code, secret as string);

//   if (!verified) {
//     console.log("not verified");
//     return;
//   }

//   // You can send the tokens here.
//   res.json("You got the tokens!!");
// };

// I will first use an admin to create another admin and set his temp secret with this : const secret = authenticator.generateSecret();

// It will send an email to the admin to ask him to activate his account.

// When the admin tries to login with his activated account:

/*

  if(admin logs in){

    if(twoFA is disabled) {
      Send the admin a qr code, his user info (basic) and the enabled property. 
      const uri = authenticator.keyuri(admin.id, "Tradez", secret);
      const image = await qrCode.toDataURL(uri);

      On the front end scan it, get the code and enter the code and submit it to the setTwoFa route
      
      Finally, generate the tokens and send him
    }else {
      His user info (basic) and the enabled property. 
      On the front end enter the code and submit it to the verifyTwoFa route

      Finally, generate the tokens and send to the user
    }
  
  }else{
    Generate tokens and send to the user. 
  }

*/
