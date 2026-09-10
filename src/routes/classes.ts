import express, { Request, Response } from "express";
import {
  createClass,
  getAllClasses,
  getClassDetails,
} from "../controllers/classes";

const classRouter = express.Router();

classRouter.get("/", getAllClasses);

classRouter.get("/:id", getClassDetails);

classRouter.post("/", createClass);

export default classRouter;
