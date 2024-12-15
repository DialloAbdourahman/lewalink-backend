import express from "express";
import "express-async-errors";
import { errorHandler } from "./middleware/error-handler";
import { authRouter } from "./routers/auth-router";

const app = express();

app.use(express.json());

app.use("/auth/v1", authRouter);

app.use(errorHandler);

export { app };
