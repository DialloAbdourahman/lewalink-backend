import { app } from "../../../app";
import request from "supertest";
import { CODES } from "../../../enums/codes";
import {
  loginUser,
  userDoesNotExistLogin,
} from "../../../test/helpers/auth-tests";
import { prisma } from "../../../prisma";
import { UserType } from "../../../enums/user-types";

it("Should not update password with wrong information", async () => {
  const { accessToken } = await loginUser();

  const response = await request(app)
    .patch("/api/auth/v1/update-password")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      oldPassword: "asdfasdfasdf",
    });
  expect(response.status).toEqual(400);
  expect(response.body.code).toBe(CODES.VALIDATION_REQUEST_ERROR);

  const response2 = await request(app)
    .patch("/api/auth/v1/update-password")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      newPassword: "asdfasdfasdf",
    });
  expect(response2.status).toEqual(400);
  expect(response2.body.code).toBe(CODES.VALIDATION_REQUEST_ERROR);

  const response3 = await request(app)
    .patch("/api/auth/v1/update-password")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      confirmNewPassword: "asdfasdfasdf",
    });
  expect(response3.status).toEqual(400);
  expect(response3.body.code).toBe(CODES.VALIDATION_REQUEST_ERROR);

  const response4 = await request(app)
    .patch("/api/auth/v1/update-password")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      confirmNewPassword: "asdf",
    });
  expect(response4.status).toEqual(400);
  expect(response4.body.code).toBe(CODES.VALIDATION_REQUEST_ERROR);

  const response5 = await request(app)
    .patch("/api/auth/v1/update-password")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      newPassword: "asd",
    });
  expect(response5.status).toEqual(400);
  expect(response5.body.code).toBe(CODES.VALIDATION_REQUEST_ERROR);
});

it("Should not update password if the old password doesn't match", async () => {
  const { accessToken } = await loginUser();

  const response = await request(app)
    .patch("/api/auth/v1/update-password")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      oldPassword: "asdfasdfasdf",
      newPassword: "asdfasdfd",
      confirmNewPassword: "asdfasdfd",
    });
  expect(response.status).toEqual(400);
  expect(response.body.code).toBe(CODES.PASSWORD_DOES_NOT_MATCH);
});

it("Should not update password if the two new passwords don't match", async () => {
  const { accessToken, planTextPassword } = await loginUser();

  const response = await request(app)
    .patch("/api/auth/v1/update-password")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      oldPassword: planTextPassword,
      newPassword: "asdfasdfd",
      confirmNewPassword: "asdfasdfdss",
    });
  expect(response.status).toEqual(400);
  expect(response.body.code).toBe(CODES.PASSWORDS_MUST_BE_THE_SAME);
});

it("Should not update the password of a user whose account has not been activated", async () => {
  const { accessToken, planTextPassword } = await loginUser(
    UserType.Client,
    false
  );

  const response = await request(app)
    .patch("/api/auth/v1/update-password")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      oldPassword: planTextPassword,
      newPassword: "asdfasdfd",
      confirmNewPassword: "asdfasdfd",
    });
  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.ACCOUNT_NOT_ACTIVATED);
});

it("Should not update the password of a user whose account has been deleted", async () => {
  const { accessToken, planTextPassword } = await loginUser(
    UserType.Client,
    true,
    true
  );

  const response = await request(app)
    .patch("/api/auth/v1/update-password")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      oldPassword: planTextPassword,
      newPassword: "asdfasdfd",
      confirmNewPassword: "asdfasdfd",
    });
  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.ACCOUNT_DELETED);
});

it("Should not update the password of a user that doesn't exist", async () => {
  const { accessToken } = await userDoesNotExistLogin();

  const response = await request(app)
    .patch("/api/auth/v1/update-password")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      oldPassword: "planTextPassword",
      newPassword: "asdfasdfd",
      confirmNewPassword: "asdfasdfd",
    });
  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.NOT_FOUND);
});

it("Should not update password of an unauthenticated user", async () => {
  const response = await request(app)
    .patch("/api/auth/v1/update-password")
    .send({
      oldPassword: "planTextPassword",
      newPassword: "asdfasdfd",
      confirmNewPassword: "asdfasdfd",
    });
  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.NO_ACCESS_TOKEN);
});

it("Should not allow a passwordless user to use this route", async () => {
  const { accessToken, planTextPassword } = await loginUser(
    UserType.Client,
    true,
    false,
    true
  );

  const response = await request(app)
    .patch("/api/auth/v1/update-password")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      oldPassword: planTextPassword,
      newPassword: "asdfasdfd",
      confirmNewPassword: "asdfasdfd",
    });
  expect(response.status).toEqual(400);
  expect(response.body.code).toBe(CODES.NO_PASSWORD_TO_ACCOUNT);
});

it("Should update password if all information is provided", async () => {
  const { accessToken, planTextPassword, createdUser, password } =
    await loginUser();

  const response = await request(app)
    .patch("/api/auth/v1/update-password")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      oldPassword: planTextPassword,
      newPassword: "asdfasdfd",
      confirmNewPassword: "asdfasdfd",
    });
  expect(response.status).toEqual(200);
  expect(response.body.code).toBe(CODES.SUCCESS);

  const user = await prisma.user.findUnique({
    where: {
      id: createdUser.id,
    },
  });
  expect(user?.password).not.toBe(password);
});
