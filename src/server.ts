import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 8000;

// Application Middlewares
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: `Success`, message: `Welcome To Our Web Application` });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
