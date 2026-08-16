import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";

import subjectsRouter from "./routes/subjectsRoutes";
import errorHandler from "./middleware/errorHandler";

dotenv.config();

if (!process.env.FRONTEND_URL)
  throw new Error("FRONTEND_URL is not defined in the environment variables.");
else if (!process.env.PORT) {
  console.warn(
    "PORT is not defined in the environment variables. Defaulting to 8000.",
  );
}

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 8000;

// Application Middlewares
app.use(express.json());
app.use(
  cors({
    // Enable CORS To Access The Server
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/subjects", subjectsRouter);

app.get("/", (req, res) => {
  res.json({ status: `Success`, message: `Welcome To Our Web Application` });
});

// Register global error handler
app.use(errorHandler);

const server = app.listen(PORT, (err?: Error) => {
  if (err) {
    console.error("Server startup error:", err);
    process.exit(1);
  }

  console.log(`Server listening on port ${PORT}`);
});

server.on("error", (err: Error) => {
  console.error("Server error:", err);
  process.exit(1);
});
