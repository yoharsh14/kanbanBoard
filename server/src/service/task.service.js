import prisma from "../db/prisma.js";
import { generateKeyBetween, generateNextKey } from "../utils/orderkey.js";

export const getAllTaskService = async () => {
  const tasks = await prisma.task.findMany({
    where: { isDeleted: false },
    orderBy: { orderKey: "asc" },
  });
  return tasks.sort((a, b) =>
    a.orderKey < b.orderKey ? -1 : a.orderKey > b.orderKey ? 1 : 0,
  ); //as the fractional-indexing keys must be sorted with plain string comparison
};

export const createTaskService = async (taskData) => {
  const newTask = await prisma.$transaction(async (tx) => {
    // both reads and writes happen atomically
    const lastTask = await tx.task.findFirst({
      where: {
        columnName: taskData.columnName,
        isDeleted: false,
      },
      orderBy: { orderKey: "desc" },
    });

    const orderKey = lastTask ? generateNextKey(lastTask.orderKey) : "a0";

    const task = await tx.task.create({
      data: {
        title: taskData.title,
        description: taskData.description,
        columnName: taskData.columnName,
        orderKey,
      },
    });

    return task;
  });

  return newTask;
};

export const deleteTaskService = async (id) => {
  const deletedTask = await prisma.task.update({
    where: { id },
    data: { isDeleted: true },
  });
  return {
    id: deletedTask.id,
    success: true,
    message: "Task deleted successfully",
  };
};

// src/services/task.service.js

export async function editTaskService({ taskId, patch, baseVersion, userId }) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.task.findUnique({
      where: { id: taskId },
    });

    if (!current || current.isDeleted) {
      throw new Error("Task not found");
    }

    const isConflict = baseVersion < current.version;
    // We allow the update to proceed even if there's a version conflict, but we return info about the conflict to the caller

    const updated = await tx.task.update({
      where: { id: taskId },
      data: {
        ...patch,
        updatedBy: userId,
        version: { increment: 1 },
      },
    });

    return {
      updatedTask: updated,
      conflict: isConflict,
      previousVersion: current.version,
    };
  });
}

export const moveTaskService = async ({
  taskId,
  fromColumn,
  fromOrderKey,
  toColumn,
  beforeTaskId,
  afterTaskId,
  baseVersion,
  userId,
}) => {
  return prisma.$transaction(async (tx) => {
    const current = await tx.task.findUnique({ where: { id: taskId } });

    if (!current) {
      throw new Error("Task not found");
    }

    if (current.isDeleted) {
      throw new Error("Task was deleted by another user");
    }

    const isStale = baseVersion < current.version;

    const isRealMoveConflict =
      isStale &&
      (current.columnName !== fromColumn || current.orderKey !== fromOrderKey);

    // Load current tasks in target columnName (authoritative state)
    const tasksInTargetColumn = await tx.task.findMany({
      where: { columnName: toColumn, isDeleted: false },
      orderBy: { orderKey: "asc" },
    });

    const before = beforeTaskId
      ? tasksInTargetColumn.find((t) => t.id === beforeTaskId)
      : null;

    const after = afterTaskId
      ? tasksInTargetColumn.find((t) => t.id === afterTaskId)
      : null;

    let newOrderKey;
    if (before && after) {
      newOrderKey = generateKeyBetween(before.orderKey, after.orderKey);
    } else if (before) {
      newOrderKey = generateKeyBetween(before.orderKey, null);
    } else if (after) {
      newOrderKey = generateKeyBetween(null, after.orderKey);
    } else {
      const last = tasksInTargetColumn[tasksInTargetColumn.length - 1];
      newOrderKey = last ? generateKeyBetween(last.orderKey, null) : "a0";
    }

    const updated = await tx.task.update({
      where: { id: taskId },
      data: {
        columnName: toColumn,
        orderKey: newOrderKey,
        updatedBy: userId,
        version: { increment: 1 },
      },
    });

    return {
      updatedTask: updated,
      conflict: isRealMoveConflict,
      stale: isStale,
      previousVersion: current.version,
    };
  });
};
