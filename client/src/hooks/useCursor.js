// client/src/hooks/useCursors.js
import { useEffect, useState } from "react";

export function useCursor(socket) {
  const [cursors, setCursors] = useState({}); 

  useEffect(() => {
    if (!socket) return;

    let lastSent = 0;

    const handleMouseMove = (e) => {
      const now = Date.now();
      if (now - lastSent < 50) return;
      lastSent = now;

      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: "CURSOR_MOVE",
          x: e.clientX,
          y: e.clientY,
        }));
      }
    };

    const handleMessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "CURSOR_UPDATE") {
        setCursors((prev) => ({
          ...prev,
          [msg.userId]: { x: msg.x, y: msg.y, name: msg.name },
        }));
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    socket.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      socket.removeEventListener("message", handleMessage);
    };
  }, [socket]);

  return { cursors };
}
