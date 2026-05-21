import express, { Request, Response } from "express";

const app = express();

// Parse JSON request bodies
app.use(express.json());

// Root route
app.get("/", (req: Request, res: Response) => {
	res.json({ message: "Hello from Express + TypeScript" });
});

const PORT = 8000;

app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`);
});

