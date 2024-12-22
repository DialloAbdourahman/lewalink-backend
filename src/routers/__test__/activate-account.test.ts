import { app } from "../../app";
import request from "supertest";
import { CODES } from "../../enums/codes";
import { prisma } from "../../prisma";
import { JWTCodes } from "../../utils/jwt-codes";

it("Should not activate account if code is not provided.", async () => {
  const response = await request(app).post("/api/auth/v1/activate").send();
  expect(response.status).toEqual(400);
  expect(response.body.code).toBe(CODES.VALIDATION_REQUEST_ERROR);
});

it("Should activate account if code is provided", async () => {
  const email = "test@test.com";
  const password = "test1234";
  const name = "test";

  const user = await prisma.user.create({
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

  const { code } = JWTCodes.generate(
    { id: user.id, email: user.email },
    process.env.ACTIVATE_ACCOUNT_JWT_KEY as string
  );

  const response = await request(app)
    .post("/api/auth/v1/activate")
    .send({ code });
  expect(response.status).toEqual(200);
  expect(response.body.code).toBe(CODES.SUCCESS);

  const activatedUser = await prisma.user.findUnique({
    where: {
      id: user.id,
    },
  });
  expect(activatedUser?.isActive).toBe(true);
});
