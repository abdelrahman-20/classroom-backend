import express from "express";
import {
  createSubject,
  deleteSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
} from "../controllers/subjects";

const subjectsRouter = express.Router();

subjectsRouter.get("/", getAllSubjects);
subjectsRouter.get("/:id", getSubjectById);
subjectsRouter.post("/", createSubject);
subjectsRouter.put("/:id", updateSubject);
subjectsRouter.delete("/:id", deleteSubject);

export default subjectsRouter;
