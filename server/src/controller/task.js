import {
  createTaskService,
  deleteTaskService,
  editTaskService,
  getAllTaskService,
  moveTaskService,
} from "../service/task.service.js";
import { broadcast } from "../ws/socket.js";

export const getAllTasks = async (req, res) => {
  try {
    const tasks = await getAllTaskService(req, res);
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
};

export const createTask = async (req, res) => {
  try {
    const task = await createTaskService(req.body);
    res.json(task);
    broadcast({
      type: "TASK_CREATED",
      task,
    });
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const { id } = req.body;
    const deletedTask = await deleteTaskService(id);

    broadcast({
      type: "TASK_DELETED",
      taskId: id,
    });

    res.json(deletedTask);
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
};

export const editTask = async (req, res) => {
  try {
    const { taskId, patch, baseVersion, userId } = req.body;

    if (!taskId || !patch) {
      return res.status(400).json({ error: "taskId and patch are required" });
    }

    const result = await editTaskService({
      taskId,
      patch,
      baseVersion,
      userId,
    });

    broadcast({
      type: "TASK_UPDATED",
      updatedTask: result.updatedTask,
      conflict: result.conflict,
    });

    if (result.conflict) {
      return res.status(409).json({
        message: "Conflict detected but changes applied",
        ...result,
      });
    }

    res.json(result);
  } catch (error) {
    if (error.message === "Task not found") {
      return res.status(404).json({ error: "Task not found" });
    }
    console.error("Error editing task:", error);
    res.status(500).json({ error: "Failed to edit task" });
  }
};

export const moveTask = async (req, res) => {
  try {
    const {
      taskId,
      fromColumn,
      fromOrderKey,
      toColumn,
      beforeTaskId,
      afterTaskId,
      baseVersion,
      userId,
    } = req.body;

    if (!taskId || !toColumn) {
      return res
        .status(400)
        .json({ error: "taskId and toColumn are required" });
    }
    

    const result = await moveTaskService({
      taskId,
      fromColumn,
      fromOrderKey,
      toColumn,
      beforeTaskId,
      afterTaskId,
      baseVersion,
      userId,
    });
    broadcast({
      type: "TASK_MOVED",
      updatedTask: result.updatedTask,
      conflict: result.conflict,
      actorId: userId, 
    });

    if (result.conflict) {
      return res.status(409).json({
        message: "Move conflict resolved by server",
        ...result,
      });
    }

    res.json(result);
  } catch (error) {
    if (error.message === "Task was deleted by another user") {
      return res.status(409).json({
        error: "Task was deleted by another user",
        code: "TASK_DELETED_CONFLICT",
      });
    }
    if (error.message === "Task not found") {
      return res.status(404).json({ error: "Task not found" });
    }
    console.error("Error moving task:", error);
    res.status(500).json({ error: "Failed to move task" });
  }
};
