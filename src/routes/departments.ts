import express from "express";
import {
  createDepartment,
  deleteDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
} from "../controllers/departments";

const departmentsRouter = express.Router();

departmentsRouter.get("/", getAllDepartments);
departmentsRouter.get("/:id", getDepartmentById);
departmentsRouter.post("/", createDepartment);
departmentsRouter.put("/:id", updateDepartment);
departmentsRouter.delete("/:id", deleteDepartment);

export default departmentsRouter;
