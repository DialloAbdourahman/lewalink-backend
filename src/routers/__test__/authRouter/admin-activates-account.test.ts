import { app } from "../../../app";
import request from "supertest";
import { CODES } from "../../../enums/codes";
import { loginUser } from "../../../test/helpers/auth-tests";
import { prisma } from "../../../prisma";
import { UserType } from "../../../enums/user-types";

it("Should not allow a user to activate another user's account if he is unauthenticated", async () => {
  const { createdUser } = await loginUser(UserType.Client, false);

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
  const { accessToken } = await loginUser(UserType.Client, true);
  const { createdUser: userToBeActivated } = await loginUser(
    UserType.Client,
    false
  );

  const response = await request(app)
    .post(`/api/auth/v1/admin-activates-account/${userToBeActivated.id}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send();

  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.NOT_ALLOWED);

  const activatedUser = await prisma.user.findUnique({
    where: { id: userToBeActivated.id },
  });
  expect(activatedUser?.isActive).toBe(false);
});

it("Should not allow an editor user to activate an account", async () => {
  const { accessToken } = await loginUser(UserType.Editor, true);
  const { createdUser: userToBeActivated } = await loginUser(
    UserType.Client,
    false
  );

  const response = await request(app)
    .post(`/api/auth/v1/admin-activates-account/${userToBeActivated.id}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send();

  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.NOT_ALLOWED);

  const activatedUser = await prisma.user.findUnique({
    where: { id: userToBeActivated.id },
  });
  expect(activatedUser?.isActive).toBe(false);
});

it("Should not allow an admin to activate the account of a non existing user ", async () => {
  const { accessToken } = await loginUser(UserType.Admin);

  const response = await request(app)
    .post(`/api/auth/v1/admin-activates-account/asdf`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send();

  expect(response.status).toEqual(404);
  expect(response.body.code).toBe(CODES.NOT_FOUND);
});

it("Should allow admin to activate an account", async () => {
  const { createdUser } = await loginUser(UserType.Client, false);
  const { accessToken } = await loginUser(UserType.Admin);

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
