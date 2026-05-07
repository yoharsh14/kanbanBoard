import { Router } from "express"; 
import taskRouter from "./task.js";

const rootRouter = Router();

rootRouter.get("/health", (req, res) => {
  res.send("Status: OK");
});

rootRouter.use('/task', taskRouter)

export default rootRouter;