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
  isDeleted: boolean = false
) => {
  const email = `test${generateRandomString()}@test.com`;
  const password =
    "c3d683ec02254543e9cc93ad406d4bda02c809c37ddbacaf3c3db1867ef2602416b43e22b37cbd013c074363bd7400a561f574f6b5af60c23af53b81051e573e.2eff29ca6a5ee717";
  const name = "test";
  const planTextPassword = "test1234";

  const createdUser = await prisma.user.create({
    data: {
      id: `sdfasdfsadf${generateRandomString()}asdfd`,
      email,
      password,
      name,
      type: "Client",
      isActive,
      isDeleted,
    },
  });

  return { createdUser, planTextPassword, password };
};

export const loginUser = async (
  isAdmin: boolean = false,
  isActive: boolean = true,
  isDeleted: boolean = false
) => {
  const { createdUser, planTextPassword, password } = await createUser(
    isActive,
    isDeleted
  );

  let { accessToken, refreshToken } = generateTokens({
    id: createdUser.id,
    email: createdUser.email,
    type: createdUser.type,
  });

  if (isAdmin) {
    const adminUser = await prisma.user.update({
      where: {
        id: createdUser.id,
      },
      data: {
        type: UserType.Admin,
      },
    });

    const tokens = generateTokens({
      id: adminUser.id,
      email: adminUser.email,
      type: adminUser.type,
    });

    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
  }

  await prisma.user.update({
    where: {
      id: createdUser.id,
    },
    data: {
      token: refreshToken,
    },
  });

  return { createdUser, planTextPassword, accessToken, refreshToken, password };
};

export const userDoesNotExistLogin = async () => {
  const { accessToken, refreshToken } = generateTokens({
    id: "1",
    email: "asdfasfdd@dsfasdjfajsdf.cmm",
    type: UserType.Client,
  });

  return { accessToken, refreshToken };
};
