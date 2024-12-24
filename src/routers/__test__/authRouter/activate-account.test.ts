import { app } from "../../../app";
import request from "supertest";
import { CODES } from "../../../enums/codes";
import { prisma } from "../../../prisma";
import { JWTCodes } from "../../../utils/jwt-codes";
import { createUser } from "../../../test/helpers/auth-tests";

it("Should not activate account if code is not provided.", async () => {
  const response = await request(app).post("/api/auth/v1/activate").send();
  expect(response.status).toEqual(400);
  expect(response.body.code).toBe(CODES.VALIDATION_REQUEST_ERROR);
});

it("Should activate account if code is provided", async () => {
  const { createdUser, planTextPassword } = await createUser();

  const { code } = JWTCodes.generate(
    { id: createdUser.id, email: createdUser.email },
    process.env.ACTIVATE_ACCOUNT_JWT_KEY as string
  );

  const response = await request(app)
    .post("/api/auth/v1/activate")
    .send({ code });
  expect(response.status).toEqual(200);
  expect(response.body.code).toBe(CODES.SUCCESS);

  const activatedUser = await prisma.user.findUnique({
    where: {
      id: createdUser.id,
    },
  });
  expect(activatedUser?.isActive).toBe(true);
});
