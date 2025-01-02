import { app } from "../../../app";
import request from "supertest";
import { CODES } from "../../../enums/codes";
import { loginUser } from "../../../test/helpers/auth-tests";
import { prisma } from "../../../prisma";
import { UserType } from "../../../enums/user-types";

it("Should not allow a user to restore another user if he is unauthenticated", async () => {
  const { createdUser } = await loginUser(UserType.Client, true, true);

  const response = await request(app)
    .post(`/api/auth/v1/restore-deleted-user/${createdUser.id}`)
    .send();

  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.NO_ACCESS_TOKEN);

  const restoredUser = await prisma.user.findUnique({
    where: { id: createdUser.id },
  });
  expect(restoredUser?.isDeleted).toBe(true);
});

it("Should not allow a normal user to retore another user", async () => {
  const { createdUser, accessToken } = await loginUser(
    UserType.Client,
    true,
    false
  );

  const response = await request(app)
    .post(`/api/auth/v1/restore-deleted-user/${createdUser.id}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send();

  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.NOT_ALLOWED);

  const restoredUser = await prisma.user.findUnique({
    where: { id: createdUser.id },
  });
  expect(restoredUser?.isDeleted).toBe(false);
});

it("Should not allow an editor user to retore another user", async () => {
  const { createdUser, accessToken } = await loginUser(
    UserType.Editor,
    true,
    false
  );

  const response = await request(app)
    .post(`/api/auth/v1/restore-deleted-user/${createdUser.id}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send();

  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.NOT_ALLOWED);

  const restoredUser = await prisma.user.findUnique({
    where: { id: createdUser.id },
  });
  expect(restoredUser?.isDeleted).toBe(false);
});

it("Should not allow admin to retore a user that doesn't exist", async () => {
  const { accessToken } = await loginUser(UserType.Admin);

  const response = await request(app)
    .post(`/api/auth/v1/restore-deleted-user/11`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send();

  expect(response.status).toEqual(404);
  expect(response.body.code).toBe(CODES.NOT_FOUND);
});

it("Should not allow an admin to restore another admin if the admin count has reached its limit", async () => {
  // Normal non-deleted admins
  for (let i = 0; i < Number(process.env.TOTAL_ADMINS_IN_SYSTEM); i++) {
    await loginUser(UserType.Admin);
  }

  // Deleted admin
  const { createdUser: deletedAdmin } = await loginUser(
    UserType.Admin,
    true,
    true
  );

  // Admin user to perform action
  const { accessToken } = await loginUser(UserType.Admin);

  const response = await request(app)
    .post(`/api/auth/v1/restore-deleted-user/${deletedAdmin.id}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send();

  expect(response.status).toEqual(400);
  expect(response.body.code).toBe(CODES.MAX_ADMINS);

  const restoredUser = await prisma.user.findUnique({
    where: { id: deletedAdmin.id },
  });
  expect(restoredUser?.isDeleted).toBe(true);
});

it("Should allow admin to retore a user", async () => {
  const { createdUser: clientUser } = await loginUser(
    UserType.Editor,
    true,
    true
  );
  const { accessToken } = await loginUser(UserType.Admin);

  const response = await request(app)
    .post(`/api/auth/v1/restore-deleted-user/${clientUser.id}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send();

  expect(response.status).toEqual(200);
  expect(response.body.code).toBe(CODES.SUCCESS);

  const restoredUser = await prisma.user.findUnique({
    where: { id: clientUser.id },
  });
  expect(restoredUser?.isDeleted).toBe(false);
});
