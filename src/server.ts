import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";

import subjectsRouter from "./routes/subjectsRoutes";
import errorHandler from "./middleware/errorHandler";
import securityMiddleware from "./middleware/security";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";

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

// Configure CORS
const corsOrigins = [process.env.FRONTEND_URL];
if (process.env.NODE_ENV !== "production") {
  corsOrigins.push(
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
  );
}

// Middleware to inject default Origin header for dev tools like API-Dog
app.use((req, res, next) => {
  if (!req.headers.origin && process.env.NODE_ENV !== "production") {
    req.headers.origin = "http://localhost:3000";
  }
  next();
});

// Authentication Middleware "Better-Auth"
app.all("/api/auth/{*any}", toNodeHandler(auth));

// Additional Middlewares
app.use(express.json());
app.use(
  cors({
    // Enable CORS To Access The Server
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

// Security Middleware "ArcJet"
app.use(securityMiddleware);

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
