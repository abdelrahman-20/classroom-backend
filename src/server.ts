import "dotenv/config";

import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import subjectsRouter from "./routes/subjects";
import usersRouter from "./routes/users";
import errorHandler from "./middleware/errorHandler";
import { attachSession, requireAuth } from "./middleware/auth";
import securityMiddleware from "./middleware/security";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import AgentAPI from "apminsight";
import classRouter from "./routes/classes";
import dashboardRouter from "./routes/dashboard";
import departmentsRouter from "./routes/departments";
import searchRouter from "./routes/search";
import enrollmentsRouter from "./routes/enrollments";

AgentAPI.config();

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

// Authentication Middleware "Better-Auth"
app.all("/api/auth/{*any}", toNodeHandler(auth));

// Security Middleware "ArcJet"
app.use(securityMiddleware);

// Attach session to all requests (optional auth)
app.use(attachSession);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Protected API routes
app.use("/api/subjects", requireAuth, subjectsRouter);
app.use("/api/departments", requireAuth, departmentsRouter);
app.use("/api/classes", requireAuth, classRouter);
app.use("/api/users", requireAuth, usersRouter);
app.use("/api/dashboard", requireAuth, dashboardRouter);
app.use("/api/search", requireAuth, searchRouter);
app.use("/api/enrollments", requireAuth, enrollmentsRouter);

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
