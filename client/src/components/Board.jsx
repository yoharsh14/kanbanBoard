import { useCallback, useRef, useState } from "react";

import {
  DndContext,
  DragOverlay,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  KeyboardSensor,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import TaskCard from "./TaskCard.jsx";
import Column from "./Column.jsx";
import { usePresence } from "../hooks/usePresence.js";
import { useCursor } from "../hooks/useCursor.js";
import axios from "axios";
import { useTasks } from "../hooks/useTasks.js";
import toast from "react-hot-toast";

const COLUMNS = [
  { id: "TODO", title: "To Do" },
  { id: "IN_PROGRESS", title: "In Progress" },
  { id: "DONE", title: "Done" },
];

const Board = () => {
  const userId = localStorage.getItem("userId");
  const {
    tasks,
    setTasks,
    fetchTasks,
    createTask,
    editTask,
    deleteTask,
    moveTask,
    socket,
  } = useTasks(userId);
  const { users, me } = usePresence(socket);
  const { cursors } = useCursor(socket);
  const [activeTask, setActiveTask] = useState(null);
  const [dragMeta, setDragMeta] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const lastOverId = useRef(null);

  const collisionDetection = useCallback((args) => {
    const { active } = args;

    const pointerCollisions = pointerWithin(args);

    // strip active item itself — this handles the shadow/placeholder problem
    const validCollisions = pointerCollisions.filter((c) => c.id !== active.id);

    const taskCollisions = validCollisions.filter(
      (c) => !COLUMNS.some((col) => col.id === c.id),
    );
    const columnCollisions = validCollisions.filter((c) =>
      COLUMNS.some((col) => col.id === c.id),
    );

    if (taskCollisions.length > 0) {
      lastOverId.current = taskCollisions[0].id;
      return taskCollisions;
    }

    if (columnCollisions.length > 0) {
      lastOverId.current = columnCollisions[0].id;
      return columnCollisions;
    }

    if (lastOverId.current && lastOverId.current !== active.id) {
      return [{ id: lastOverId.current }];
    }

    return [];
  }, []);

  const handleDragStart = (event) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task);
    setDragMeta({
      taskId: task.id,
      fromColumn: task.columnName,
      fromOrderKey: task.orderKey,
      baseVersion: task.version,
    });
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;

    const isOverColumn = COLUMNS.some((c) => c.id === overId);

    setTasks((prev) => {
      const activeIndex = prev.findIndex((t) => t.id === activeId);
      if (activeIndex === -1) return prev;

      const activeColumn = prev[activeIndex].columnName;
      const overColumn = isOverColumn
        ? overId
        : prev.find((t) => t.id === overId)?.columnName;

      if (!activeColumn || !overColumn) return prev;

      if (activeColumn === overColumn) {
        if (isOverColumn) return prev;
        const overIndex = prev.findIndex((t) => t.id === overId);
        if (overIndex === -1) return prev;

        const result = arrayMove(prev, activeIndex, overIndex);

        return result;
      }

      const updatedActive = { ...prev[activeIndex], columnName: overColumn };
      const withoutActive = prev.filter((t) => t.id !== activeId);

      if (isOverColumn) {
        return [...withoutActive, updatedActive];
      }

      const insertAt = withoutActive.findIndex((t) => t.id === overId);

      if (insertAt === -1) return [...withoutActive, updatedActive];

      const result = [
        ...withoutActive.slice(0, insertAt),
        updatedActive,
        ...withoutActive.slice(insertAt),
      ];
      return result;
    });
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over || !dragMeta) return;

    const activeId = active.id;
    if (activeId === over.id) return;

    const overColumn = tasks.find((t) => t.id === activeId)?.columnName;
    if (!overColumn) return;

    const allColumnTasks = tasks.filter((t) => t.columnName === overColumn);
    const activeIndex = allColumnTasks.findIndex((t) => t.id === activeId);

    const beforeTaskId = allColumnTasks[activeIndex - 1]?.id ?? null;
    const afterTaskId = allColumnTasks[activeIndex + 1]?.id ?? null;

    const payload = {
      taskId: dragMeta.taskId,
      fromColumn: dragMeta.fromColumn,
      fromOrderKey: dragMeta.fromOrderKey,
      toColumn: overColumn,
      beforeTaskId,
      afterTaskId,
      baseVersion: dragMeta.baseVersion,
      userId: me?.id || "user1",
    };

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/move`,
        payload,
      );
      const updatedTask = response.data.updatedTask;

      setTasks((prev) =>
        prev.map((t) =>
          t.id === updatedTask.id
            ? {
                ...t,
                version: updatedTask.version,
                orderKey: updatedTask.orderKey,
              }
            : t,
        ),
      );
    } catch (err) {
      const code = err.response?.data?.code;

      if (code === "TASK_DELETED_CONFLICT") {
        toast.error("⚠️ Task was deleted by another user");
        fetchTasks();
      } else if (err.response?.status === 409) {
        toast("⚠️ Move conflict resolved by server");
        fetchTasks();
      } else {
        toast.error("Move failed");
        fetchTasks();
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gray-100 p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Kanban Board</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            👀 {users.length} viewing
          </span>

          <div className="flex -space-x-2">
            {users.slice(0, 5).map((u) => (
              <div
                key={u.id}
                className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold border-2 border-white"
                title={u.name}
              >
                {u.name?.[0]}
              </div>
            ))}
          </div>

          {me && (
            <span className="text-xs text-gray-400">
              You are <b>{me.name}</b>
            </span>
          )}
        </div>
        <div className="flex gap-6">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              columnName={col}
              tasks={tasks.filter((t) => t.columnName === col.id)}
              onCreateTask={createTask}
              onEditTask={editTask}
              onDeleteTask={deleteTask}
            />
          ))}
        </div>
      </div>
      {Object.entries(cursors).map(([userId, c]) => (
        <div
          key={userId}
          style={{
            position: "fixed",
            left: c.x,
            top: c.y,
            pointerEvents: "none",
            zIndex: 9999,
            transform: "translate(8px, 8px)",
          }}
          className="flex items-center gap-1"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="black"
            className="drop-shadow"
          >
            <path d="M3 2l6 20 2-7 7-2L3 2z" />
          </svg>

          <span className="text-xs bg-black text-white px-1 rounded">
            {c.name}
          </span>
        </div>
      ))}

      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} isDragging />}
      </DragOverlay>
    </DndContext>
  );
};

export default Board;
