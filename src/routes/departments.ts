import express from "express";
import { getAllDepartments } from "../controllers/departments";

const departmentsRouter = express.Router();

departmentsRouter.get("/", getAllDepartments);

export default departmentsRouter;
