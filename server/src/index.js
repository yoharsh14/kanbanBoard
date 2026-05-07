import express from "express";
import cors from "cors";
import routers from "./routes/index.js";
import { setupWebSocket } from "./ws/socket.js";
import http from "http";
const app = express();
app.use(express.json());

app.use(cors());
const port = process.env.PORT || 3001;

app.use("/", routers);
const server = http.createServer(app);

setupWebSocket(server);

server.listen(port, () => {
  console.log(`HTTP + WS server running on http://localhost:${port}`);
});