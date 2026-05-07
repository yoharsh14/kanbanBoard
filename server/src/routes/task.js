import {
  createTask,
  deleteTask,
  editTask,
  getAllTasks,
  moveTask,
} from "../controller/task.js";
import { Router } from "express";

const taskRouter = Router();

taskRouter.get("/", getAllTasks);
taskRouter.post("/create", createTask);
taskRouter.post("/delete", deleteTask);
taskRouter.post("/edit", editTask);
taskRouter.post("/move", moveTask);
export default taskRouter;
