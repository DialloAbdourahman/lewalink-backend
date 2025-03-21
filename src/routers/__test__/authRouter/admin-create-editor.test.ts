import { app } from "../../../app";
import request from "supertest";
import { CODES } from "../../../enums/codes";
import { loginUser } from "../../../test/helpers/auth-tests";
import { prisma } from "../../../prisma";
import { UserType } from "@prisma/client";

it("Should not allow a user to create an editor if he is unauthenticated", async () => {
  const newAdminEmail = "udfhsihdfiuashdf@dsfasfd.com";

  const response = await request(app).post(`/api/auth/v1/create-editor`).send({
    name: "test",
    email: newAdminEmail,
    password: "asdfasdfsadf",
  });

  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.NO_ACCESS_TOKEN);

  const createdAdmin = await prisma.user.findUnique({
    where: { email: newAdminEmail },
  });
  expect(createdAdmin).toBe(null);
});

it("Should not allow a normal user to create an editor", async () => {
  const { accessToken } = await loginUser(UserType.Client, true, false);
  const newAdminEmail = "udfhsihdfiuashdf@dsfasfd.com";

  const response = await request(app)
    .post(`/api/auth/v1/create-editor`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: "test",
      email: "udfhsihdfiuashdf@dsfasfd.com",
      password: "asdfasdfsadf",
    });

  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.NOT_ALLOWED);

  const createdAdmin = await prisma.user.findUnique({
    where: { email: newAdminEmail },
  });
  expect(createdAdmin).toBe(null);
});

it("Should not allow an editor user to create an editor", async () => {
  const { accessToken } = await loginUser(UserType.Editor, true, false);
  const newAdminEmail = "udfhsihdfiuashdf@dsfasfd.com";

  const response = await request(app)
    .post(`/api/auth/v1/create-editor`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: "test",
      email: "udfhsihdfiuashdf@dsfasfd.com",
      password: "asdfasdfsadf",
    });

  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.NOT_ALLOWED);

  const createdAdmin = await prisma.user.findUnique({
    where: { email: newAdminEmail },
  });
  expect(createdAdmin).toBe(null);
});

it("Should not allow an admin to create another editor if the number of editor limit has been reached", async () => {
  const newAdminEmail = "udfhsihdfiuashdf@dsfasfd.com";

  // Normal non-deleted admins
  for (let i = 0; i < Number(process.env.TOTAL_EDITORS_IN_SYSTEM); i++) {
    await loginUser(UserType.Editor);
  }

  // Admin user to perform action
  const { accessToken } = await loginUser(UserType.Admin);

  const response = await request(app)
    .post(`/api/auth/v1/create-editor`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: "test",
      email: "udfhsihdfiuashdf@dsfasfd.com",
      password: "asdfasdfsadf",
    });

  expect(response.status).toEqual(400);
  expect(response.body.code).toBe(CODES.MAX_ADMINS);

  const createdAdmin = await prisma.user.findUnique({
    where: { email: newAdminEmail },
  });
  expect(createdAdmin).toBe(null);
});

it("Should allow admin to create an editor", async () => {
  const { accessToken } = await loginUser(UserType.Admin);
  const newAdminEmail = "udfhsihdfiuashdf@dsfasfd.com";

  const response = await request(app)
    .post(`/api/auth/v1/create-editor`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: "test",
      email: "udfhsihdfiuashdf@dsfasfd.com",
      password: "asdfasdfsadf",
    });

  expect(response.status).toEqual(201);
  expect(response.body.code).toBe(CODES.SUCCESS);

  const createdAdmin = await prisma.user.findUnique({
    where: { email: newAdminEmail },
  });
  expect(createdAdmin).toBeDefined();
  expect(createdAdmin?.email).toBe(newAdminEmail);
  expect(createdAdmin?.type).toBe(UserType.Editor);
  expect(createdAdmin?.isActive).toBe(false);
  expect(createdAdmin?.isDeleted).toBe(false);
});
