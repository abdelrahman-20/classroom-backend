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
import { requireRole } from "../middleware/auth";

const classRouter = express.Router();

classRouter.get("/", getAllClasses);

classRouter.get("/:id/enrollments", getClassEnrollments);

classRouter.post("/:id/enrollments", enrollStudent);

classRouter.delete(
  "/:id/enrollments/:studentId",
  requireRole("teacher", "admin"),
  unenrollStudent,
);

classRouter.post(
  "/:id/regenerate-invite",
  requireRole("teacher", "admin"),
  regenerateInviteCode,
);

classRouter.get("/:id", getClassDetails);

classRouter.post("/", requireRole("teacher", "admin"), createClass);

classRouter.put("/:id", requireRole("teacher", "admin"), updateClass);

classRouter.delete("/:id", requireRole("teacher", "admin"), deleteClass);

export default classRouter;
