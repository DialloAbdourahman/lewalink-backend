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

  // const awsHelper = new AwsSesHelper();
  // await awsHelper.sendActivateAccountEmail(
  //   user.email,
  //   user.name || "user",
  //   code
  // );

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

  if (user.type === "Admin") {
    OrchestrationResult.badRequest(
      res,
      CODES.PUBLIC_USERS_ONLY,
      "This route is just for public users"
    );
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

export default { createAccount, activateAccount, signin };
