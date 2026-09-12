import express from "express";
import { getDashboardStats } from "../controllers/dashboard";

const dashboardRouter = express.Router();

dashboardRouter.get("/stats", getDashboardStats);

export default dashboardRouter;
