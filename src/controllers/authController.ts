import { Request, Response } from "express";
import { prisma } from "../prisma";
import { OrchestrationResult } from "../utils/orchestration-result";
import { CODES } from "../enums/codes";
import { PasswordManager } from "../utils/password";
import { UserType } from "../enums/user-types";
import { JWTCodes } from "../utils/jwt-codes";
import { AwsSesHelper } from "../utils/aws-ses";
import { generateTokens } from "../utils/generate-tokens";

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

// Refresh token.
// Add a middleware to check what type of user is allowed to access a route.

// Admin sees users by usertype, name.
// Admin deletes users.
// Admin create admin (max 3).

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
};
