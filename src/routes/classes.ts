import express from "express";
import {
  createClass,
  deleteClass,
  getAllClasses,
  getClassDetails,
  regenerateInviteCode,
  updateClass,
} from "../controllers/classes";
import {
  enrollStudent,
  getClassEnrollments,
  unenrollStudent,
} from "../controllers/enrollments";

const classRouter = express.Router();

classRouter.get("/", getAllClasses);
classRouter.get("/:id/enrollments", getClassEnrollments);
classRouter.post("/:id/enrollments", enrollStudent);
classRouter.delete("/:id/enrollments/:studentId", unenrollStudent);
classRouter.post("/:id/regenerate-invite", regenerateInviteCode);
classRouter.get("/:id", getClassDetails);
classRouter.post("/", createClass);
classRouter.put("/:id", updateClass);
classRouter.delete("/:id", deleteClass);

export default classRouter;
