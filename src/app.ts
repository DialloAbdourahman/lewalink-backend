import express, { Request, Response } from "express";
import "express-async-errors";
import { errorHandler } from "./middleware/error-handler";
import { authRouter } from "./routers/auth-router";
import { CODES } from "./enums/codes";
import { OrchestrationResult } from "./utils/orchestration-result";
import { swaggerSpecs } from "./swagger";
import swaggerUi from "swagger-ui-express";

const app = express();

app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

app.use("/api/auth/v1", authRouter);

app.use("*", (req: Request, res: Response) => {
  OrchestrationResult.notFound(
    res,
    CODES.ROUTE_DOES_NOT_EXIST,
    "Route does not exist"
  );
});

app.use(errorHandler);

export { app };
