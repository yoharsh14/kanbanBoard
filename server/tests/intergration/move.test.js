import { moveTaskService, createTaskService } from "../../src/service/task.service.js";
import prisma from "../../src/db/prisma.js"; // ← match your actual path

async function createTask(overrides = {}) {
  return prisma.task.create({
    data: {
      title: "Test Task",
      description: "test",
      columnName: "TODO",
      orderKey: "a0",
      version: 1,
      isDeleted: false,
      updatedBy: "user1",
      ...overrides,
    },
  });
}

beforeEach(async () => {
  await prisma.task.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("createTaskService", () => {
  test("first task in columnName gets a0", async () => {
    const task = await createTaskService({
      title: "First",
      description: "test",
      columnName: "TODO",
    });
    expect(task.orderKey).toBe("a0");
  });

  test("second task gets key after first", async () => {
    await createTaskService({ title: "First", description: "", columnName: "TODO" });
    const second = await createTaskService({ title: "Second", description: "", columnName: "TODO" });
    expect(second.orderKey > "a0").toBe(true);
  });

  test("tasks in different columns get independent keys", async () => {
    const t1 = await createTaskService({ title: "T1", description: "", columnName: "TODO" });
    const t2 = await createTaskService({ title: "T2", description: "", columnName: "IN_PROGRESS" });
    // both can be a0 since they're in different columns
    expect(t1.orderKey).toBe("a0");
    expect(t2.orderKey).toBe("a0");
  });
});

describe("moveTaskService - basic moves", () => {
  test("moves task to another columnName", async () => {
    const task = await createTask({ columnName: "TODO", orderKey: "a0" });

    const result = await moveTaskService({
      taskId: task.id,
      fromColumn: "TODO",
      fromOrderKey: "a0",
      toColumn: "IN_PROGRESS",
      beforeTaskId: null,
      afterTaskId: null,
      baseVersion: 1,
      userId: "user1",
    });

    expect(result.updatedTask.columnName).toBe("IN_PROGRESS");
    expect(result.conflict).toBe(false);
    expect(result.updatedTask.version).toBe(2);
  });

  test("places task between two tasks", async () => {
    const first  = await createTask({ orderKey: "a0" });
    const third  = await createTask({ orderKey: "a2" });
    const moving = await createTask({ orderKey: "Zz" });

    const result = await moveTaskService({
      taskId: moving.id,
      fromColumn: "TODO",
      fromOrderKey: "Zz",
      toColumn: "TODO",
      beforeTaskId: first.id,
      afterTaskId: third.id,
      baseVersion: 1,
      userId: "user1",
    });

    expect(result.updatedTask.orderKey > "a0").toBe(true);
    expect(result.updatedTask.orderKey < "a2").toBe(true);
  });

  test("places task at start of columnName", async () => {
    const existing = await createTask({ orderKey: "a0" });
    const moving   = await createTask({ orderKey: "a2" });

    const result = await moveTaskService({
      taskId: moving.id,
      fromColumn: "TODO",
      fromOrderKey: "a2",
      toColumn: "TODO",
      beforeTaskId: null,
      afterTaskId: existing.id,
      baseVersion: 1,
      userId: "user1",
    });

    expect(result.updatedTask.orderKey < "a0").toBe(true);
  });

  test("places task at end of columnName", async () => {
    const existing = await createTask({ orderKey: "a0" });
    const moving   = await createTask({ orderKey: "Zz" });

    const result = await moveTaskService({
      taskId: moving.id,
      fromColumn: "TODO",
      fromOrderKey: "Zz",
      toColumn: "TODO",
      beforeTaskId: existing.id,
      afterTaskId: null,
      baseVersion: 1,
      userId: "user1",
    });

    expect(result.updatedTask.orderKey > "a0").toBe(true);
  });
});

describe("moveTaskService - conflict scenarios", () => {
  test("conflict when stale version and wrong position", async () => {
    const task = await createTask({ columnName: "TODO", orderKey: "a0", version: 5 });

    const result = await moveTaskService({
      taskId: task.id,
      fromColumn: "DONE",      // wrong
      fromOrderKey: "a0",
      toColumn: "IN_PROGRESS",
      beforeTaskId: null,
      afterTaskId: null,
      baseVersion: 3,           // stale
      userId: "user1",
    });

    expect(result.conflict).toBe(true);
    expect(result.stale).toBe(true);
  });

  test("stale but no conflict if columnName and orderKey match", async () => {
    const task = await createTask({ columnName: "TODO", orderKey: "a0", version: 5 });

    const result = await moveTaskService({
      taskId: task.id,
      fromColumn: "TODO",      // correct
      fromOrderKey: "a0",      // correct
      toColumn: "IN_PROGRESS",
      beforeTaskId: null,
      afterTaskId: null,
      baseVersion: 3,           // stale but position matches
      userId: "user1",
    });

    expect(result.stale).toBe(true);
    expect(result.conflict).toBe(false);
  });

  test("throws for non-existent task", async () => {
    await expect(
      moveTaskService({
        taskId: "00000000-0000-0000-0000-000000000000",
        fromColumn: "TODO",
        fromOrderKey: "a0",
        toColumn: "DONE",
        beforeTaskId: null,
        afterTaskId: null,
        baseVersion: 1,
        userId: "user1",
      })
    ).rejects.toThrow("Task not found");
  });

  test("throws for deleted task", async () => {
    const task = await createTask({ isDeleted: true });

    await expect(
      moveTaskService({
        taskId: task.id,
        fromColumn: "TODO",
        fromOrderKey: "a0",
        toColumn: "DONE",
        beforeTaskId: null,
        afterTaskId: null,
        baseVersion: 1,
        userId: "user1",
      })
    ).rejects.toThrow("Task not found");
  });
});