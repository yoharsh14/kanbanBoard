import { useEffect, useState } from "react";

const STORAGE_KEY = "kanban_offline_queue";

export function useOfflineQueue(socket) {
  const [queue, setQueue] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }, [queue]);

  const enqueue = (action) => {
    setQueue((prev) => [...prev, action]);
  };

  const clearQueue = () => {
    setQueue([]);
  };

  const isOnline = socket && socket.readyState === WebSocket.OPEN;

  return { queue, enqueue, clearQueue, isOnline };
}
