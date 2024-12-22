import { app } from "../../app";
import request from "supertest";
import { CODES } from "../../enums/codes";
import {
  loginUser,
  userDoesNotExistLogin,
} from "../../test/helpers/auth-tests";

it("Should not login user whose account has not been activated", async () => {
  const { accessToken } = await loginUser(false, false);

  const response = await request(app)
    .get("/api/auth/v1/profile")
    .set("Authorization", `Bearer ${accessToken}`)
    .send();
  expect(response.status).toEqual(400);
  expect(response.body.code).toBe(CODES.ACCOUNT_NOT_ACTIVATED);
});

it("Should not login user whose account has been deleted", async () => {
  const { accessToken } = await loginUser(false, true, true);

  const response = await request(app)
    .get("/api/auth/v1/profile")
    .set("Authorization", `Bearer ${accessToken}`)
    .send();
  expect(response.status).toEqual(400);
  expect(response.body.code).toBe(CODES.ACCOUNT_DELETED);
});

it("Should not get the profile of a user that doesn't exist", async () => {
  const { accessToken } = await userDoesNotExistLogin();

  const response = await request(app)
    .get("/api/auth/v1/profile")
    .set("Authorization", `Bearer ${accessToken}`)
    .send();
  expect(response.status).toEqual(404);
  expect(response.body.code).toBe(CODES.NOT_FOUND);
});

it("Should not get the profile of an unauthenticated user", async () => {
  const response = await request(app).get("/api/auth/v1/profile").send();

  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.NO_ACCESS_TOKEN);
});

it("Should get the profile of an authenticated user", async () => {
  const { createdUser, accessToken } = await loginUser();

  const response = await request(app)
    .get("/api/auth/v1/profile")
    .set("Authorization", `Bearer ${accessToken}`)
    .send();

  expect(response.status).toEqual(200);
  expect(response.body.code).toBe(CODES.SUCCESS);
  expect(response.body.data.id).toBe(createdUser.id);
  expect(response.body.data.name).toBe(createdUser.name);
  expect(response.body.data.email).toBe(createdUser.email);
  expect(response.body.data.type).toBe(createdUser.type);
});
