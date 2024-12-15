import { app } from "./app";
import { prisma } from "./prisma";
require("dotenv").config();

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