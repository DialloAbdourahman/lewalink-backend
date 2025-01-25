import { app } from "../../../app";
import request from "supertest";
import { CODES } from "../../../enums/codes";
import {
  loginUser,
  userDoesNotExistLogin,
} from "../../../test/helpers/auth-tests";
import { UserType } from "@prisma/client";

it("Should not get the has password info if the user is not activated", async () => {
  const { accessToken } = await loginUser(UserType.Client, false);

  const response = await request(app)
    .get("/api/auth/v1/has-password")
    .set("Authorization", `Bearer ${accessToken}`)
    .send();
  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.ACCOUNT_NOT_ACTIVATED);
});

it("Should not get the has password information of a user whose account has been deleted", async () => {
  const { accessToken } = await loginUser(UserType.Editor, true, true);

  const response = await request(app)
    .get("/api/auth/v1/has-password")
    .set("Authorization", `Bearer ${accessToken}`)
    .send();
  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.ACCOUNT_DELETED);
});

it("Should not get the has password info of a user that doesn't exist", async () => {
  const { accessToken } = await userDoesNotExistLogin();

  const response = await request(app)
    .get("/api/auth/v1/has-password")
    .set("Authorization", `Bearer ${accessToken}`)
    .send();
  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.NOT_FOUND);
});

it("Should not get the has password info of an unauthenticated user", async () => {
  const response = await request(app).get("/api/auth/v1/has-password").send();

  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.NO_ACCESS_TOKEN);
});

it("Should get the has password info of an authenticated user", async () => {
  const { accessToken: accessTokenOfUserWithPassword } = await loginUser();
  const { accessToken: accessTokenOfUserWithoutPassword } = await loginUser(
    UserType.Admin,
    true,
    false,
    true
  );

  const response = await request(app)
    .get("/api/auth/v1/has-password")
    .set("Authorization", `Bearer ${accessTokenOfUserWithPassword}`)
    .send();
  expect(response.status).toEqual(200);
  expect(response.body.code).toBe(CODES.SUCCESS);
  expect(response.body.data.hasPassword).toBe(true);

  const response2 = await request(app)
    .get("/api/auth/v1/has-password")
    .set("Authorization", `Bearer ${accessTokenOfUserWithoutPassword}`)
    .send();
  expect(response2.status).toEqual(200);
  expect(response2.body.code).toBe(CODES.SUCCESS);
  expect(response2.body.data.hasPassword).toBe(false);
});
