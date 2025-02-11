import express, { Request, Response } from "express";
import "express-async-errors";
import { errorHandler } from "./middleware/error-handler";
import { authRouter } from "./routers/auth-router";
import { CODES } from "./enums/codes";
import { OrchestrationResult } from "./utils/orchestration-result";
import { swaggerSpecs } from "./swagger";
import swaggerUi from "swagger-ui-express";
import cors from "cors";
import { courseRouter } from "./routers/course-router";
import { programRouter } from "./routers/program-router";
import { schoolRouter } from "./routers/school-router";
import { schoolRatingRouter } from "./routers/school-rating-router";
import { schoolProgramRouter } from "./routers/school-program-router";
import { programCourseRouter } from "./routers/program-course-router";

const app = express();

app.use(express.json());

const corsOptions = {
  origin: ["http://localhost:5173"], // Allow specific origins
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"], // Allowed HTTP methods
  allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
  credentials: true, // Allow credentials (cookies, etc.)
};

app.use(cors(corsOptions));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

app.use("/api/auth/v1", authRouter);
app.use("/api/course/v1", courseRouter);
app.use("/api/program/v1", programRouter);
app.use("/api/school/v1", schoolRouter);
app.use("/api/school-rating/v1", schoolRatingRouter);
app.use("/api/school-program/v1", schoolProgramRouter);
app.use("/api/program-course/v1", programCourseRouter);

app.use("*", (req: Request, res: Response) => {
  OrchestrationResult.notFound(
    res,
    CODES.ROUTE_DOES_NOT_EXIST,
    "Route does not exist"
  );
});

app.use(errorHandler);

export { app };
