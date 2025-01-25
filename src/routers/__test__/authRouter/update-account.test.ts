import { app } from "../../../app";
import request from "supertest";
import { CODES } from "../../../enums/codes";
import {
  loginUser,
  userDoesNotExistLogin,
} from "../../../test/helpers/auth-tests";
import { UserType } from "@prisma/client";

it("Should not update account information is missing", async () => {
  const { accessToken } = await loginUser(UserType.Client, true);

  const response = await request(app)
    .patch("/api/auth/v1/update")
    .set("Authorization", `Bearer ${accessToken}`)
    .send();
  expect(response.status).toEqual(400);
  expect(response.body.code).toBe(CODES.VALIDATION_REQUEST_ERROR);
});

it("Should not update account of user whose account has not been activated", async () => {
  const { accessToken } = await loginUser(UserType.Client, false);

  const response = await request(app)
    .patch("/api/auth/v1/update")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: "Testing",
    });
  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.ACCOUNT_NOT_ACTIVATED);
});

it("Should not update account of user whose account has been deleted", async () => {
  const { accessToken } = await loginUser(UserType.Client, true, true);

  const response = await request(app)
    .patch("/api/auth/v1/update")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: "Testing",
    });
  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.ACCOUNT_DELETED);
});

it("Should not update account of a user that doesn't exist", async () => {
  const { accessToken } = await userDoesNotExistLogin();

  const response = await request(app)
    .patch("/api/auth/v1/update")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: "Testing",
    });
  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.NOT_FOUND);
});

it("Should not update account  of an unauthenticated user", async () => {
  const response = await request(app).patch("/api/auth/v1/update").send({
    name: "Testing",
  });
  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.NO_ACCESS_TOKEN);
});

it("Should update account  of an authenticated user", async () => {
  const { createdUser, accessToken } = await loginUser();

  const response = await request(app)
    .patch("/api/auth/v1/update")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: "Testing",
    });

  expect(response.status).toEqual(200);
  expect(response.body.code).toBe(CODES.SUCCESS);
  expect(response.body.data.id).toBe(createdUser.id);
  expect(response.body.data.name).toBe("Testing");
  expect(response.body.data.email).toBe(createdUser.email);
  expect(response.body.data.type).toBe(createdUser.type);
});
