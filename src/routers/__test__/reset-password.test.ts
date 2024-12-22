import { app } from "../../app";
import request from "supertest";
import { CODES } from "../../enums/codes";
import { prisma } from "../../prisma";
import { JWTCodes } from "../../utils/jwt-codes";
import { createUser } from "../../test/helpers/auth-tests";

it("Should not reset password if data is not provided.", async () => {
  const response = await request(app)
    .patch("/api/auth/v1/reset-password")
    .send();
  expect(response.status).toEqual(400);
  expect(response.body.code).toBe(CODES.VALIDATION_REQUEST_ERROR);

  const response2 = await request(app)
    .patch("/api/auth/v1/reset-password")
    .send({ code: "asdf" });
  expect(response2.status).toEqual(400);
  expect(response2.body.code).toBe(CODES.VALIDATION_REQUEST_ERROR);

  const response3 = await request(app)
    .patch("/api/auth/v1/reset-password")
    .send({ password: "asasdfasfdasdfdf" });
  expect(response3.status).toEqual(400);
  expect(response3.body.code).toBe(CODES.VALIDATION_REQUEST_ERROR);

  const response4 = await request(app)
    .patch("/api/auth/v1/reset-password")
    .send({ code: "asdf", password: "as" });
  expect(response4.status).toEqual(400);
  expect(response4.body.code).toBe(CODES.VALIDATION_REQUEST_ERROR);
});

it("Should not reset password of user whose account has not been activated", async () => {
  const { createdUser } = await createUser(false);

  const { code } = JWTCodes.generate(
    { id: createdUser.id, email: createdUser.email },
    process.env.FORGOT_PASSWORD_JWT_KEY as string
  );

  const newPassword = "asdfasdf";

  const response = await request(app)
    .patch("/api/auth/v1/reset-password")
    .send({ code, password: newPassword });
  expect(response.status).toEqual(400);
  expect(response.body.code).toBe(CODES.ACCOUNT_NOT_ACTIVATED);
});

it("Should not login user whose account has been deleted", async () => {
  const { createdUser } = await createUser(true, true);

  const { code } = JWTCodes.generate(
    { id: createdUser.id, email: createdUser.email },
    process.env.FORGOT_PASSWORD_JWT_KEY as string
  );

  const newPassword = "asdfasdf";

  const response = await request(app)
    .patch("/api/auth/v1/reset-password")
    .send({ code, password: newPassword });
  expect(response.status).toEqual(400);
  expect(response.body.code).toBe(CODES.ACCOUNT_DELETED);
});

it("Should activate account if code is provided", async () => {
  const { createdUser, password } = await createUser();

  const { code } = JWTCodes.generate(
    { id: createdUser.id, email: createdUser.email },
    process.env.FORGOT_PASSWORD_JWT_KEY as string
  );

  const newPassword = "asdfasdf";

  const response = await request(app)
    .patch("/api/auth/v1/reset-password")
    .send({ code, password: newPassword });

  expect(response.status).toEqual(200);
  expect(response.body.code).toBe(CODES.SUCCESS);

  const resetedPasswordUser = await prisma.user.findUnique({
    where: {
      id: createdUser.id,
    },
  });
  expect(resetedPasswordUser?.password).not.toBe(password);
});
