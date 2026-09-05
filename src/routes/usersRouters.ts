import express from "express";
import getAllUsers from "../controllers/usersControllers";

const usersRouter = express.Router();

usersRouter.get("/", getAllUsers);

export default usersRouter;
