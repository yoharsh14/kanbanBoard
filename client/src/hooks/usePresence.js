import { useEffect, useState } from "react";
import { generateRandomName } from "../utils/randomName.js";

export function usePresence(socket) {
  const [users, setUsers] = useState([]);
  const [me, setMe] = useState(null);

  const getOrCreateUserId = () => {
  let id = localStorage.getItem("userId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("userId", id);
  }
  return id;
};

  useEffect(() => {
    if (!socket) return;

    const name = generateRandomName();
    const userId = getOrCreateUserId();
    const user = { name, id: userId };

    const handleOpen = () => {
      console.log("✅ WS opened (usePresence)");
      socket.send(JSON.stringify({ type: "JOIN", user }));
      setMe(user);
    };

    const handleMessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "PRESENCE_UPDATE") {
        setUsers(msg.users);
      }
    };

    const handleError = (e) => {
      console.error("❌ WS error", e);
    };

    const handleClose = () => {
      console.log("🔴 WS closed");
    };

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("message", handleMessage);
    socket.addEventListener("error", handleError);
    socket.addEventListener("close", handleClose);

    return () => {
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("message", handleMessage);
      socket.removeEventListener("error", handleError);
      socket.removeEventListener("close", handleClose);
    };
  }, [socket]);

  return { users, me };
}
