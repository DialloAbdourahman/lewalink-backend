import { app } from "../../../app";
import request from "supertest";
import { CODES } from "../../../enums/codes";
import { prisma } from "../../../prisma";
import { UserType } from "../../../enums/user-types";

it("Should not create account with incomplete information", async () => {
  const email = "test@test.com";
  const password = "test1234";
  const name = "test";

  const response = await request(app)
    .post("/api/auth/v1/create")
    .send({ email, password });
  expect(response.status).toEqual(400);
  expect(response.body.code).toBe(CODES.VALIDATION_REQUEST_ERROR);

  const response2 = await request(app)
    .post("/api/auth/v1/create")
    .send({ email, name });
  expect(response2.status).toEqual(400);
  expect(response2.body.code).toBe(CODES.VALIDATION_REQUEST_ERROR);

  const response3 = await request(app)
    .post("/api/auth/v1/create")
    .send({ email, password });
  expect(response3.status).toEqual(400);
  expect(response3.body.code).toBe(CODES.VALIDATION_REQUEST_ERROR);

  const response4 = await request(app).post("/api/auth/v1/create").send({});
  expect(response4.status).toEqual(400);
  expect(response4.body.code).toBe(CODES.VALIDATION_REQUEST_ERROR);

  const usersCount = await prisma.user.count();
  expect(usersCount).toBe(0);
});

it("Should not create account if a similar email exists aleady and account has been activated", async () => {
  const email = "test@test.com";
  const password = "test1234";
  const name = "test";

  await prisma.user.create({
    data: {
      id: "1",
      email,
      password,
      name,
      type: "Client",
      isActive: true,
    },
  });

  const response = await request(app)
    .post("/api/auth/v1/create")
    .send({ email, password, name });
  expect(response.status).toEqual(400);
  expect(response.body.code).toBe(CODES.EMAIL_IN_USE);
});

it("Should not create account if a similar email exists aleady and account has been deleted", async () => {
  const email = "test@test.com";
  const password = "test1234";
  const name = "test";

  await prisma.user.create({
    data: {
      id: "1",
      email,
      password,
      name,
      type: "Client",
      isActive: true,
      isDeleted: true,
    },
  });

  const response = await request(app)
    .post("/api/auth/v1/create")
    .send({ email, password, name });
  expect(response.status).toEqual(400);
  expect(response.body.code).toBe(CODES.ACCOUNT_DELETED);
});

it("Should not create account if a similar email exists aleady and account has not been activated", async () => {
  const email = "test@test.com";
  const password = "test1234";
  const name = "test";

  await prisma.user.create({
    data: {
      id: "1",
      email,
      password,
      name,
      type: "Client",
      isActive: false,
      isDeleted: false,
    },
  });

  const response = await request(app)
    .post("/api/auth/v1/create")
    .send({ email, password, name });
  expect(response.status).toEqual(400);
  expect(response.body.code).toBe(CODES.ACCOUNT_NOT_ACTIVATED);
});

it("Should create an account if all information is provided", async () => {
  const email = "test@test.com";
  const password = "test1234";
  const name = "test";

  const response = await request(app)
    .post("/api/auth/v1/create")
    .send({ email, password, name });

  expect(response.status).toEqual(201);
  expect(response.body.code).toBe(CODES.SUCCESS);

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  expect(user).toBeDefined();
  expect(user?.email).toBe(email);
  expect(user?.name).toBe(name);
  expect(user?.password).not.toBe(password);
  expect(user?.type).toBe(UserType.Client);
  expect(user?.isActive).toBe(false);
  expect(user?.isDeleted).toBe(false);
  expect(user?.token).toBe(null);
});
