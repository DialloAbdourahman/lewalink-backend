import { app } from "../../../app";
import request from "supertest";
import { CODES } from "../../../enums/codes";
import { loginUser } from "../../../test/helpers/auth-tests";
import { prisma } from "../../../prisma";

it("Should not allow a user to activate another user's account if he is unauthenticated", async () => {
  const { createdUser } = await loginUser(false, false);

  const response = await request(app)
    .post(`/api/auth/v1/admin-activates-account/${createdUser.id}`)
    .send();

  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.NO_ACCESS_TOKEN);

  const activatedUser = await prisma.user.findUnique({
    where: { id: createdUser.id },
  });
  expect(activatedUser?.isActive).toBe(false);
});

it("Should not allow a normal user to activate an account", async () => {
  const { createdUser, accessToken } = await loginUser(false, false);

  const response = await request(app)
    .post(`/api/auth/v1/admin-activates-account/${createdUser.id}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send();

  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.NOT_ALLOWED);

  const activatedUser = await prisma.user.findUnique({
    where: { id: createdUser.id },
  });
  expect(activatedUser?.isActive).toBe(false);
});

it("Should not allow an admin to activate the account of a non existing user ", async () => {
  const { accessToken } = await loginUser(true);

  const response = await request(app)
    .post(`/api/auth/v1/admin-activates-account/asdf`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send();

  expect(response.status).toEqual(404);
  expect(response.body.code).toBe(CODES.NOT_FOUND);
});

it("Should allow admin to activate an account", async () => {
  const { createdUser } = await loginUser(false, false);
  const { accessToken } = await loginUser(true);

  const response = await request(app)
    .post(`/api/auth/v1/admin-activates-account/${createdUser.id}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send();

  expect(response.status).toEqual(200);
  expect(response.body.code).toBe(CODES.SUCCESS);

  const createdAdmin = await prisma.user.findUnique({
    where: { id: createdUser.id },
  });
  expect(createdAdmin?.isActive).toBe(true);
});
