import swaggerJsdoc from "swagger-jsdoc";

export const swaggerSpecs = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Documentation",
      version: "1.0.0",
      description: "A simple Node.js API",
    },
  },
  apis: ["./src/routers/swaggers/*.yaml"], // Path to your route files
});
