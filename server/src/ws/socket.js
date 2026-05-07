import { WebSocketServer } from "ws";
import { randomUUID } from "crypto";

const clients = new Map(); // ws -> { id, name }
let wss = null;

export function setupWebSocket(server) {
  wss = new WebSocketServer({ server });

  function broadcastPresence() {
    const users = Array.from(clients.values());
    const payload = JSON.stringify({
      type: "PRESENCE_UPDATE",
      users,
      count: users.length,
    });

    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(payload);
      }
    });
  }

  wss.on("connection", (ws) => {
    console.log("🟢 WS connected");
    const user = {
      id: randomUUID(),
      name: null,
    };

    clients.set(ws, user);

    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());

      if (msg.type === "JOIN") {
        user.name = msg.user.name;
        broadcastPresence();
      }

      if (msg.type === "CURSOR_MOVE") {
        const payload = JSON.stringify({
          type: "CURSOR_UPDATE",
          userId: user.id,
          x: msg.x,
          y: msg.y,
          name: user.name,
        });

        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === 1) {
            client.send(payload);
          }
        });
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
      broadcastPresence();
    });
  });
}

export function broadcast(event) {
  if (!wss) return;

  const payload = JSON.stringify(event);

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
}
