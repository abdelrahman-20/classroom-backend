import express from "express";
import { getMyEnrollments } from "../controllers/enrollments";

const enrollmentsRouter = express.Router();

enrollmentsRouter.get("/", getMyEnrollments);

export default enrollmentsRouter;