import { User } from "@prisma/client";
import { app } from "./app";
import { prisma } from "./prisma";
require("dotenv").config();

declare global {
  namespace Express {
    interface Request {
      currentUser?: User;
    }
  }
}

declare global {
  interface BigInt {
    toJSON(): Number;
  }
}

BigInt.prototype.toJSON = function () {
  return Number(this);
};

const PORT = 3000;

const start = async () => {
  if (!process.env.DATABASE_URL) {
    console.log("Enter database url");
    process.exit();
  }

  if (!process.env.ACCESS_TOKEN_JWT_KEY) {
    console.log("ACCESS_TOKEN_JWT_KEY must be defined.");
    process.exit();
  }

  if (!process.env.REFRESH_TOKEN_JWT_KEY) {
    console.log("REFRESH_TOKEN_JWT_KEY must be defined.");
    process.exit();
  }

  if (!process.env.ACCESS_TOKEN_EXPIRATION) {
    console.log("ACCESS_TOKEN_EXPIRATION must be defined.");
    process.exit();
  }

  if (!process.env.REFRESH_TOKEN_EXPIRATION) {
    console.log("REFRESH_TOKEN_EXPIRATION must be defined.");
    process.exit();
  }

  if (!process.env.ACTIVATE_ACCOUNT_JWT_KEY) {
    console.log("ACTIVATE_ACCOUNT_JWT_KEY must be defined.");
    process.exit();
  }

  if (!process.env.FORGOT_PASSWORD_JWT_KEY) {
    console.log("FORGOT_PASSWORD_JWT_KEY must be defined.");
    process.exit();
  }

  if (!process.env.AWS_SES_SMTP_USERNAME) {
    console.log("AWS_SES_SMTP_USERNAME must be defined.");
    process.exit();
  }

  if (!process.env.AWS_SES_SMTP_PASSWORD) {
    console.log("AWS_SES_SMTP_PASSWORD must be defined.");
    process.exit();
  }

  if (!process.env.AWS_SES_SMTP_SENDER_EMAIL) {
    console.log("AWS_SES_SMTP_SENDER_EMAIL must be defined.");
    process.exit();
  }

  if (!process.env.TOTAL_ADMINS_IN_SYSTEM) {
    console.log("TOTAL_ADMINS_IN_SYSTEM must be defined.");
    process.exit();
  }

  if (!process.env.TOTAL_EDITORS_IN_SYSTEM) {
    console.log("TOTAL_ADMINS_IN_SYSTEM must be defined.");
    process.exit();
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    console.log("GOOGLE_CLIENT_ID must be defined.");
    process.exit();
  }

  if (!process.env.GOOGLE_CLIENT_SECRET) {
    console.log("GOOGLE_CLIENT_SECRET must be defined.");
    process.exit();
  }

  if (!process.env.GOOGLE_REDIRECT_LINK) {
    console.log("GOOGLE_REDIRECT_LINK must be defined.");
    process.exit();
  }

  if (!process.env.AWS_BUCKET_NAME) {
    console.log("AWS_BUCKET_NAME must be defined.");
    process.exit();
  }

  if (!process.env.AWS_BUCKET_REGION) {
    console.log("AWS_BUCKET_REGION must be defined.");
    process.exit();
  }

  if (!process.env.AWS_ACCESS_KEY) {
    console.log("AWS_ACCESS_KEY must be defined.");
    process.exit();
  }

  if (!process.env.AWS_SECRET_KEY) {
    console.log("AWS_SECRET_KEY must be defined.");
    process.exit();
  }

  try {
    await prisma.$connect();
    console.log("Connected to PostgreSQL successfully");

    process.on("SIGINT", async () => {
      await prisma.$disconnect();
      console.log("Disconnected to postgresql");
      process.exit(0);
    });
  } catch (error) {
    console.error("Database connection error", error);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Lewalink backend running on port ${PORT}`);
  });
};

start();

// Normal user searches for schools with longitude and latitudes.
// Work on a school router, don't forget to manage images and finally test it using postman.

// Create a swagger for all these new routes if the frontend guys are ready or just keep going do it next time.

// Uncomment schoolProgram router and controller, complete it and test it using postman.
// Complete the schoolProgramCourse (router and controller) and test using postman.

// Create a swagger for all these new routes.

// Complete SchoolRating (router and controller) and test using postman.
// Complete the SchoolProgramRating (router and controller) and test using postman.

// Create a swagger for all these new routes.

// Write tests for all the new routes.

// Consider primary admin and stuff.
