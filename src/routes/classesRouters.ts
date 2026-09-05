import express from "express";
import { createClass, getAllClasses } from "../controllers/classesControllers";

const classRouter = express.Router();

classRouter.get("/", getAllClasses);

classRouter.post("/", createClass);

export default classRouter;
