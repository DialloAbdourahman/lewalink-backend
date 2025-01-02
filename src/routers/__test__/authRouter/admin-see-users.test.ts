import { app } from "../../../app";
import request from "supertest";
import { CODES } from "../../../enums/codes";
import { loginUser } from "../../../test/helpers/auth-tests";
import { UserType } from "../../../enums/user-types";

it("Should not get the list of users if unauthenticated", async () => {
  const response = await request(app).get("/api/auth/v1/users").send();

  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.NO_ACCESS_TOKEN);
});

it("Should not get the list of users if the user is a client", async () => {
  const { accessToken } = await loginUser();

  const response = await request(app)
    .get("/api/auth/v1/users")
    .set("Authorization", `Bearer ${accessToken}`)
    .send();

  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.NOT_ALLOWED);
});

it("Should not get the list of users if the user is an editor", async () => {
  const { accessToken } = await loginUser(UserType.Editor);

  const response = await request(app)
    .get("/api/auth/v1/users")
    .set("Authorization", `Bearer ${accessToken}`)
    .send();

  expect(response.status).toEqual(401);
  expect(response.body.code).toBe(CODES.NOT_ALLOWED);
});

it("Should get list of users if the user is an admin", async () => {
  const { createdUser: clientUser } = await loginUser();
  const { accessToken } = await loginUser(UserType.Admin);

  const response = await request(app)
    .get("/api/auth/v1/users")
    .set("Authorization", `Bearer ${accessToken}`)
    .send();

  expect(response.status).toEqual(200);
  expect(response.body.code).toBe(CODES.SUCCESS);
  expect(response.body.totalPages).toBe(1);
  expect(response.body.itemsPerPage).toBe(10);
  expect(response.body.page).toBe(1);
  expect(response.body.data[0].id).toBe(clientUser.id);
  expect(response.body.data[0].name).toBe(clientUser.name);
  expect(response.body.data[0].email).toBe(clientUser.email);
  expect(response.body.data[0].type).toBe(clientUser.type);
});
