import express from "express";
import { globalSearch } from "../controllers/search";

const searchRouter = express.Router();

searchRouter.get("/", globalSearch);

export default searchRouter;
