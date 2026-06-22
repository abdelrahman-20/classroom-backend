import express, { Request, Response } from "express";
import subjectsRouter from "./routes/subjects";

const PORT = 8000;
const app = express();

// Application Middlewares:

// Parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  const timeStamp = new Date().toISOString();
  console.log(`[${timeStamp}] ${req.method} ${req.url}`);
  next();
});

// Subjects Router
app.use("/api/v1/subjects", subjectsRouter);

// Root route
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello from Express.JS + TypeScript" });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
