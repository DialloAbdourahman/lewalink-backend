import { UserType } from "@prisma/client";
import { prisma } from "../../prisma";
import { generateTokens } from "../../utils/generate-tokens";

function generateRandomString(length = 10) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export const createUser = async (
  isActive: boolean = true,
  isDeleted: boolean = false,
  noPassword: boolean = false,
  testEmail: string = ""
) => {
  const email = testEmail
    ? testEmail
    : `test${generateRandomString()}@test.com`;
  const password =
    "c3d683ec02254543e9cc93ad406d4bda02c809c37ddbacaf3c3db1867ef2602416b43e22b37cbd013c074363bd7400a561f574f6b5af60c23af53b81051e573e.2eff29ca6a5ee717";
  const name = "test";
  const planTextPassword = "test1234";

  const createdUser = await prisma.user.create({
    data: {
      id: `sdfasdfsadf${generateRandomString()}asdfd`,
      email,
      password: noPassword ? null : password,
      name,
      type: "Client",
      isActive,
      isDeleted,
    },
  });

  return { createdUser, planTextPassword, password };
};

export const loginUser = async (
  userType: UserType = UserType.Client,
  isActive: boolean = true,
  isDeleted: boolean = false,
  noPassword: boolean = false,
  testEmail: string = ""
) => {
  const { createdUser, planTextPassword, password } = await createUser(
    isActive,
    isDeleted,
    noPassword,
    testEmail
  );

  const userWithType = await prisma.user.update({
    where: {
      id: createdUser.id,
    },
    data: {
      type: userType,
    },
  });

  let { accessToken, refreshToken } = generateTokens({
    id: userWithType.id,
    email: userWithType.email,
    type: userWithType.type,
  });

  await prisma.user.update({
    where: {
      id: userWithType.id,
    },
    data: {
      token: refreshToken,
    },
  });

  return {
    createdUser: userWithType,
    planTextPassword,
    accessToken,
    refreshToken,
    password,
  };
};

export const userDoesNotExistLogin = async () => {
  const { accessToken, refreshToken } = generateTokens({
    id: "1",
    email: "asdfasfdd@dsfasdjfajsdf.cmm",
    type: UserType.Client,
  });

  return { accessToken, refreshToken };
};
