import { app } from "../../../app";
import request from "supertest";
import { CODES } from "../../../enums/codes";
import {
  loginUser,
  userDoesNotExistLogin,
} from "../../../test/helpers/auth-tests";
import { prisma } from "../../../prisma";

export const wait = (sec: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, sec * 1000);
  });
};

it("Should not refresh token of a user whose account has not been activated", async () => {
  const { createdUser, refreshToken } = await loginUser(false, false);

  const response = await request(app)
    .post("/api/auth/v1/token")
    .set("Authorization", `Bearer ${refreshToken}`)
    .send();

  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.ACCOUNT_NOT_ACTIVATED);

  const user = await prisma.user.findUnique({
    where: {
      id: createdUser.id,
    },
  });
  expect(user?.token).toBe(refreshToken);
});

it("Should not refresh the token of a user whose account has been deleted", async () => {
  const { refreshToken, createdUser } = await loginUser(false, true, true);

  const response = await request(app)
    .post("/api/auth/v1/token")
    .set("Authorization", `Bearer ${refreshToken}`)
    .send();
  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.ACCOUNT_DELETED);

  const user = await prisma.user.findUnique({
    where: {
      id: createdUser.id,
    },
  });
  expect(user?.token).toBe(refreshToken);
});

it("Should not refresh token if token is not provided", async () => {
  const response = await request(app).post("/api/auth/v1/token").send();

  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.NO_REFRESH_TOKEN);
});

it("Should not refresh token if fake token is provided", async () => {
  const response = await request(app)
    .post("/api/auth/v1/token")
    .set("Authorization", `Bearer ${"asdfasfd"}`)
    .send();

  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.CANNOT_DECODE_TOKEN);
});

it("Should detect a reuse", async () => {
  const { createdUser, refreshToken } = await loginUser();

  await wait(1);

  const refreshTokenResponse = await request(app)
    .post("/api/auth/v1/token")
    .set("Authorization", `Bearer ${refreshToken}`)
    .send();
  expect(refreshTokenResponse.status).toEqual(200);
  expect(refreshTokenResponse.body.code).toBe(CODES.SUCCESS);

  const reuseDetectionResponse = await request(app)
    .post("/api/auth/v1/token")
    .set("Authorization", `Bearer ${refreshToken}`)
    .send();
  expect(reuseDetectionResponse.status).toEqual(401);
  expect(reuseDetectionResponse.body.code).toBe(CODES.REUSE_DETECTION);

  const user = await prisma.user.findUnique({
    where: {
      id: createdUser.id,
    },
  });
  expect(user?.token).toBe(null);
});

it("Should refresh and rotate token", async () => {
  const { createdUser, refreshToken } = await loginUser();

  await wait(1);

  const response = await request(app)
    .post("/api/auth/v1/token")
    .set("Authorization", `Bearer ${refreshToken}`)
    .send();

  expect(response.status).toEqual(200);
  expect(response.body.code).toBe(CODES.SUCCESS);
  expect(response.body.data.id).toBe(createdUser.id);
  expect(response.body.data.name).toBe(createdUser.name);
  expect(response.body.data.email).toBe(createdUser.email);
  expect(response.body.data.type).toBe(createdUser.type);
  expect(response.body.data.accessToken).toBeDefined();
  expect(response.body.data.refreshToken).toBeDefined();

  const rotatedUserToken = await prisma.user.findUnique({
    where: {
      id: createdUser.id,
    },
    select: {
      token: true,
    },
  });
  expect(rotatedUserToken?.token).not.toBe(refreshToken);
  expect(response.body.data.refreshToken).toBe(rotatedUserToken?.token);
});
