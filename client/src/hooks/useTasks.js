import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  createTaskApi,
  editTaskApi,
  deleteTaskApi,
  moveTaskApi,
  getAllTasksApi,
} from "../api/tasks.api";
import { useOfflineQueue } from "./useOfflineQueue";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:3001";

export function useTasks(me) {
  const [tasks, setTasks] = useState([]);
  const wsRef = useRef(null);
  const { queue, enqueue, clearQueue, isOnline } = useOfflineQueue(
    wsRef.current,
  );
  const fetchTasks = async () => {
    try {
      const data = await getAllTasksApi();
      console.log(
        "📦 fetched order:",
        data.map((t) => `${t.title}: ${t.orderKey}`),
      );
      setTasks(data);
    } catch (err) {
      console.error("Fetch tasks failed", err);
      toast.error("Failed to load tasks");
    }
  };

  useEffect(() => {
    fetchTasks();

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ WS connected (tasks)");
      // resync snapshot on connect (in case missed WS messages while disconnected)
      fetchTasks();
      const raw = localStorage.getItem("kanban_offline_queue");
      const savedQueue = raw ? JSON.parse(raw) : [];
      if (savedQueue.length > 0) {
        console.log("🔁 Replaying offline queue:", savedQueue.length);

        (async () => {
          for (const action of savedQueue) {
            try {
              if (action.type === "CREATE") await createTaskApi(action.payload);
              if (action.type === "EDIT") await editTaskApi(action.payload);
              if (action.type === "MOVE") await moveTaskApi(action.payload);
              if (action.type === "DELETE")
                await deleteTaskApi(action.payload.taskId);
            } catch (e) {
              console.warn("Replay failed:", action, e);
            }
          }
          // clear after all replayed
          localStorage.removeItem("kanban_offline_queue");
          clearQueue();
          fetchTasks(); // sync final state
        })();
      }
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      switch (msg.type) {
        case "TASK_CREATED":
          if (msg.actorId === me) return;
          setTasks((prev) => {
            // avoid duplicates if optimistic create already added it
            if (prev.some((t) => t.id === msg.task.id)) return prev;
            return [...prev, msg.task];
          });
          break;

        case "TASK_UPDATED":
        case "TASK_MOVED":
          if (msg.actorId === me) return;
          setTasks((prev) => {
            const updated = prev.map((t) =>
              t.id === msg.updatedTask.id ? msg.updatedTask : t,
            );
            return updated.sort((a, b) =>
              a.orderKey < b.orderKey ? -1 : a.orderKey > b.orderKey ? 1 : 0,
            );
          });

          if (msg.conflict && msg.actorId === me?.id) {
            toast("⚠️ Your change was overridden by another user");
          }
          break;
        case "TASK_DELETED":
          if (msg.actorId === me) return;
          setTasks((prev) => prev.filter((t) => t.id !== msg.taskId));
          break;

        default:
          break;
      }
    };

    ws.onerror = (e) => {
      console.error("❌ WS error (tasks)", e);
    };

    ws.onclose = () => {
      console.log("🔴 WS closed (tasks)");
    };

    return () => {
      ws.close();
    };
  }, [me]);

  // -------------------------
  // CRUD actions (HTTP)
  // -------------------------

  const createTask = async ({ title, description, columnName }) => {
    const payload = { title, description, columnName };

    try {
      if (!isOnline) {
        enqueue({ type: "CREATE", payload });
        toast("📡 Offline – task queued");
        return;
      }

      const task = await createTaskApi({
        ...payload,
        orderKey: "", // server computes placement
      });

      toast.success("Task created");
      return task;
    } catch (err) {
      console.warn("Create failed, queueing offline:", err);

      enqueue({ type: "CREATE", payload });
      toast("📡 Network error – task queued");

      // No need to throw — user action is preserved
    }
  };

  const editTask = async (task) => {
    const payload = {
      taskId: task.id,
      patch: { title: task.title, description: task.description },
      baseVersion: task.version,
      userId: me?.id || "1001",
    };

    try {
      if (!isOnline) {
        enqueue({ type: "EDIT", payload });
        toast("📡 Offline – edit queued");
        return;
      }

      const { updatedTask, conflict } = await editTaskApi(payload);

      // optimistic reconcile (WS will also send authoritative update)
      setTasks((prev) =>
        prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
      );

      conflict
        ? toast("⚠️ Saved with conflict resolution")
        : toast.success("Task updated");
    } catch (err) {
      console.warn("Edit failed, queueing offline:", err);

      enqueue({ type: "EDIT", payload });
      toast("📡 Network error – edit queued");

      // Optional: resync UI to authoritative state
      fetchTasks();
    }
  };

  const deleteTask = async (taskId) => {
    // Optimistic UI
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      if (!isOnline) {
        enqueue({ type: "DELETE", payload: { taskId } });
        toast("📡 Offline – delete queued");
        return;
      }

      await deleteTaskApi(taskId);
      toast.success("Task deleted");
    } catch (err) {
      console.warn("Delete failed, queueing offline:", err);

      enqueue({ type: "DELETE", payload: { taskId } });
      toast("📡 Network error – delete queued");

      // rollback only if you want strict consistency
      fetchTasks();
    }
  };

  const moveTask = async (payload) => {
    try {
      if (!isOnline) {
        enqueue({ type: "MOVE", payload });
        toast("📡 Offline – move queued");
        return;
      }

      await moveTaskApi(payload);
    } catch (err) {
      console.warn("Move failed, queueing offline:", err);

      enqueue({ type: "MOVE", payload });
      toast("📡 Network error – move queued");

      // rollback optimistic UI
      fetchTasks();
    }
  };

  return {
    tasks,
    setTasks,
    fetchTasks,
    createTask,
    editTask,
    deleteTask,
    moveTask,
    socket: wsRef.current,
  };
}
