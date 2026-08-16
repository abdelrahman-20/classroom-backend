import swaggerJsdoc from "swagger-jsdoc";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT ? Number(process.env.PORT) : 8000;

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Classroom API",
      version: "1.0.0",
      description: "Classroom backend API documentation",
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
      },
    ],
  },
  apis: ["./src/routes/*.ts"], // path to your route files
};

export const swaggerSpec = swaggerJsdoc(options);
