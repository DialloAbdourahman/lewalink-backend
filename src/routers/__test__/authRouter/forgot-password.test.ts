import { app } from "../../../app";
import request from "supertest";
import { CODES } from "../../../enums/codes";
import {
  loginUser,
  userDoesNotExistLogin,
} from "../../../test/helpers/auth-tests";

it("Should not generate code if account has not been activated", async () => {
  const { createdUser } = await loginUser(false, false);

  const response = await request(app)
    .post("/api/auth/v1/forgot-password")
    .send({
      email: createdUser.email,
    });
  expect(response.status).toEqual(400);
  expect(response.body.code).toBe(CODES.ACCOUNT_NOT_ACTIVATED);
});

it("Should not generate code if account has been deleted", async () => {
  const { createdUser } = await loginUser(false, true, true);

  const response = await request(app)
    .post("/api/auth/v1/forgot-password")
    .send({
      email: createdUser.email,
    });
  expect(response.status).toEqual(400);
  expect(response.body.code).toBe(CODES.ACCOUNT_DELETED);
});

it("Should not get the profile of a user that doesn't exist", async () => {
  const response = await request(app)
    .post("/api/auth/v1/forgot-password")
    .send({
      email: "asdfasfd@dsfas.com",
    });
  expect(response.status).toEqual(404);
  expect(response.body.code).toBe(CODES.NOT_FOUND);
});

it("Should generate a code for a forgot password request", async () => {
  const { createdUser } = await loginUser();

  const response = await request(app)
    .post("/api/auth/v1/forgot-password")
    .send({
      email: createdUser.email,
    });

  expect(response.status).toEqual(200);
  expect(response.body.code).toBe(CODES.SUCCESS);
});
