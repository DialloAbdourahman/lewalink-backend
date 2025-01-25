import { app } from "../../../app";
import request from "supertest";
import { CODES } from "../../../enums/codes";
import { loginUser } from "../../../test/helpers/auth-tests";
import { prisma } from "../../../prisma";
import { UserType } from "@prisma/client";

it("Should not allow a user to deactivate another user's account if he is unauthenticated", async () => {
  const { createdUser } = await loginUser(UserType.Client, true);

  const response = await request(app)
    .post(`/api/auth/v1/admin-deactivates-account/${createdUser.id}`)
    .send();

  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.NO_ACCESS_TOKEN);

  const deactivatedUser = await prisma.user.findUnique({
    where: { id: createdUser.id },
  });
  expect(deactivatedUser?.isActive).toBe(true);
});

it("Should not allow a normal user to deactivate an account", async () => {
  const { createdUser, accessToken } = await loginUser(UserType.Client, true);

  const response = await request(app)
    .post(`/api/auth/v1/admin-deactivates-account/${createdUser.id}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send();

  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.NOT_ALLOWED);

  const deactivatedUser = await prisma.user.findUnique({
    where: { id: createdUser.id },
  });
  expect(deactivatedUser?.isActive).toBe(true);
});

it("Should not allow an editor user to deactivate an account", async () => {
  const { createdUser, accessToken } = await loginUser(UserType.Editor, true);

  const response = await request(app)
    .post(`/api/auth/v1/admin-deactivates-account/${createdUser.id}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send();

  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.NOT_ALLOWED);

  const deactivatedUser = await prisma.user.findUnique({
    where: { id: createdUser.id },
  });
  expect(deactivatedUser?.isActive).toBe(true);
});

it("Should not allow an admin to deactivate the account of a non existing user ", async () => {
  const { accessToken } = await loginUser(UserType.Admin);

  const response = await request(app)
    .post(`/api/auth/v1/admin-deactivates-account/asdf`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send();

  expect(response.status).toEqual(404);
  expect(response.body.code).toBe(CODES.NOT_FOUND);
});

it("Should allow admin to deactivate an account", async () => {
  const { createdUser } = await loginUser(UserType.Client, true);
  const { accessToken } = await loginUser(UserType.Admin);

  const response = await request(app)
    .post(`/api/auth/v1/admin-deactivates-account/${createdUser.id}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send();

  expect(response.status).toEqual(200);
  expect(response.body.code).toBe(CODES.SUCCESS);

  const createdAdmin = await prisma.user.findUnique({
    where: { id: createdUser.id },
  });
  expect(createdAdmin?.isActive).toBe(false);
});
