import { app } from "../../../app";
import request from "supertest";
import { CODES } from "../../../enums/codes";
import { createUser, loginUser } from "../../../test/helpers/auth-tests";
import { prisma } from "../../../prisma";
import { UserType } from "@prisma/client";

const mockedEmail = "test@test.com";

it("Should not google auth a user if all information is not entered", async () => {
  const response = await request(app).post("/api/auth/v1/oauth-google").send();
  expect(response.status).toEqual(400);
  expect(response.body.code).toBe(CODES.VALIDATION_REQUEST_ERROR);
});

it("Should not allow an admin to use this route", async () => {
  await loginUser(true, true, false, false, mockedEmail);

  const response = await request(app).post("/api/auth/v1/oauth-google").send({
    code: "asdf",
  });
  expect(response.status).toEqual(400);
  expect(response.body.code).toBe(CODES.CLIENT_ONLY);
});

it("Should not google auth user whose account has not been activated", async () => {
  await loginUser(false, false, false, false, mockedEmail);

  const response = await request(app).post("/api/auth/v1/oauth-google").send({
    code: "asdf",
  });
  expect(response.status).toEqual(400);
  expect(response.body.code).toBe(CODES.ACCOUNT_NOT_ACTIVATED);
});

it("Should not google auth user whose account has not been deleted", async () => {
  await loginUser(false, true, true, false, mockedEmail);

  const response = await request(app).post("/api/auth/v1/oauth-google").send({
    code: "asdf",
  });
  expect(response.status).toEqual(400);
  expect(response.body.code).toBe(CODES.ACCOUNT_DELETED);
});

it("Should google auth a user that exist already", async () => {
  const { createdUser } = await createUser(true, false, true, mockedEmail);

  const response = await request(app).post("/api/auth/v1/oauth-google").send({
    code: "asdf",
  });
  expect(response.status).toEqual(200);
  expect(response.body.code).toBe(CODES.SUCCESS);
  expect(response.body.data.id).toBe(createdUser.id);
  expect(response.body.data.name).toBe(createdUser.name);
  expect(response.body.data.email).toBe(createdUser.email);
  expect(response.body.data.type).toBe(createdUser.type);
  expect(response.body.data.accessToken).toBeDefined();
  expect(response.body.data.refreshToken).toBeDefined();
});

it("Should google auth a user that doesn't exist", async () => {
  const response = await request(app).post("/api/auth/v1/oauth-google").send({
    code: "asdf",
  });
  expect(response.status).toEqual(200);
  expect(response.body.code).toBe(CODES.SUCCESS);
  expect(response.body.data.email).toBe(mockedEmail);
  expect(response.body.data.accessToken).toBeDefined();
  expect(response.body.data.refreshToken).toBeDefined();

  const createdUser = await prisma.user.findUnique({
    where: {
      email: mockedEmail,
    },
  });
  expect(createdUser).toBeDefined();
  expect(createdUser?.isActive).toBe(true);
  expect(createdUser?.token).toBeDefined();
  expect(createdUser?.type).toBe(UserType.Client);
  expect(createdUser?.token).not.toBe(null);
});
