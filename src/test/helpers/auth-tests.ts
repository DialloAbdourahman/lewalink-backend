import { UserType } from "@prisma/client";
import { prisma } from "../../prisma";
import { generateTokens } from "../../utils/generate-tokens";

export const createUser = async (
  isActive: boolean = true,
  isDeleted: boolean = false
) => {
  const email = `test${Math.floor(Math.random() * 10)}@test.com`;
  const password =
    "c3d683ec02254543e9cc93ad406d4bda02c809c37ddbacaf3c3db1867ef2602416b43e22b37cbd013c074363bd7400a561f574f6b5af60c23af53b81051e573e.2eff29ca6a5ee717";
  const name = "test";
  const planTextPassword = "test1234";

  const createdUser = await prisma.user.create({
    data: {
      id: "1",
      email,
      password,
      name,
      type: "Client",
      isActive,
      isDeleted,
    },
  });

  return { createdUser, planTextPassword };
};

export const loginUser = async (
  isAdmin: boolean = false,
  isActive: boolean = true,
  isDeleted: boolean = false
) => {
  const { createdUser, planTextPassword } = await createUser(
    isActive,
    isDeleted
  );

  if (isAdmin) {
    await prisma.user.update({
      where: {
        id: createdUser.id,
      },
      data: {
        type: UserType.Admin,
      },
    });
  }

  const { accessToken, refreshToken } = generateTokens({
    id: createdUser.id,
    email: createdUser.email,
    type: createdUser.type,
  });

  await prisma.user.update({
    where: {
      id: createdUser.id,
    },
    data: {
      token: refreshToken,
    },
  });

  return { createdUser, planTextPassword, accessToken, refreshToken };
};

export const userDoesNotExistLogin = async () => {
  const { accessToken, refreshToken } = generateTokens({
    id: "1",
    email: "asdfasfdd@dsfasdjfajsdf.cmm",
    type: UserType.Client,
  });

  return { accessToken, refreshToken };
};
