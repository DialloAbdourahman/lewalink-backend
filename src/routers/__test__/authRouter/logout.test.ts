import { app } from "../../../app";
import request from "supertest";
import { CODES } from "../../../enums/codes";
import {
  loginUser,
  userDoesNotExistLogin,
} from "../../../test/helpers/auth-tests";
import { prisma } from "../../../prisma";
import { UserType } from "../../../enums/user-types";

it("Should not logout user whose account has not been activated", async () => {
  const { accessToken, createdUser } = await loginUser(UserType.Client, false);

  const response = await request(app)
    .post("/api/auth/v1/logout")
    .set("Authorization", `Bearer ${accessToken}`)
    .send();
  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.ACCOUNT_NOT_ACTIVATED);

  const user = await prisma.user.findFirst({
    where: {
      id: createdUser.id,
    },
  });
  expect(user?.token).not.toBeNull();
});

it("Should not logout user whose account has been deleted", async () => {
  const { accessToken, createdUser } = await loginUser(
    UserType.Client,
    true,
    true
  );

  const response = await request(app)
    .post("/api/auth/v1/logout")
    .set("Authorization", `Bearer ${accessToken}`)
    .send();
  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.ACCOUNT_DELETED);

  const user = await prisma.user.findFirst({
    where: {
      id: createdUser.id,
    },
  });
  expect(user?.token).not.toBeNull();
});

it("Should not get logout a user that doesn't exist", async () => {
  const { accessToken } = await userDoesNotExistLogin();

  const response = await request(app)
    .post("/api/auth/v1/logout")
    .set("Authorization", `Bearer ${accessToken}`)
    .send();
  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.NOT_FOUND);
});

it("Should not logout an unauthenticated user", async () => {
  const response = await request(app).post("/api/auth/v1/logout").send();

  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.NO_ACCESS_TOKEN);
});

it("Should logout an authenticated user", async () => {
  const { createdUser, accessToken } = await loginUser();

  const response = await request(app)
    .post("/api/auth/v1/logout")
    .set("Authorization", `Bearer ${accessToken}`)
    .send();

  expect(response.status).toEqual(200);
  expect(response.body.code).toBe(CODES.SUCCESS);

  const user = await prisma.user.findFirst({
    where: {
      id: createdUser.id,
    },
  });

  expect(user?.token).toBeNull();
});
