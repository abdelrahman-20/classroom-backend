import express from "express";
import getAllUsers from "../controllers/users";

const usersRouter = express.Router();

usersRouter.get("/", getAllUsers);

export default usersRouter;
