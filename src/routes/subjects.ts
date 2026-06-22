import { Router } from "express";

const subjectsRouter = Router();

subjectsRouter.get("/", (req, res) => {
  try {
    res.status(200).json({
      msg: "This Route To Get All Subjects",
      data: [],
    });
  } catch (error) {
    console.log(`Get /subjects error: ${error}`);
    res.status(500).json({ message: "Failed To Get Subjects" });
  }
});

export default subjectsRouter;
