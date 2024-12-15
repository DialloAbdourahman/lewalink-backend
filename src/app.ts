import express from "express";
import "express-async-errors";
import { errorHandler } from "./middleware/error-handler";
import { authRouter } from "./routers/auth-router";
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();

app.use(express.json());

const specs = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Documentation",
      version: "1.0.0",
      description: "A simple Node.js API",
    },
  },
  apis: ["./routers/*.js"], // Path to your route files
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

app.use("/auth/v1", authRouter);

app.use(errorHandler);

export { app };
