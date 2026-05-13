import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import "dotenv/config";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));

app.get("/", (req, res) => {
  res.json({ status: "running", uptime: process.uptime(), connections: io.engine.clientsCount });
});

const server = createServer(app);
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true },
  pingInterval: 25000,
  pingTimeout: 60000,
});

// ========== IN-MEMORY STATE ==========
const onlineUsers = new Map();       // userId -> socketId
const disconnectTimers = new Map();  // userId -> timeout
const DISCONNECT_GRACE_MS = 5000;    // 5s grace for reconnects

const broadcastOnlineUsers = () => {
  io.emit("online_users", Array.from(onlineUsers.keys()));
};

// ========== CONNECTION ==========
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  if (!userId) { socket.disconnect(true); return; }

  // Clear pending disconnect timer (handles reconnects)
  if (disconnectTimers.has(userId)) {
    clearTimeout(disconnectTimers.get(userId));
    disconnectTimers.delete(userId);
  }

  onlineUsers.set(userId, socket.id);
  console.log(`✅ ${userId} connected`);
  broadcastOnlineUsers();

  // ---- ROOMS ----
  socket.on("join_chat", (chatId) => {
    if (!chatId) return;
    socket.join(chatId);
  });

  socket.on("leave_chat", (chatId) => {
    if (!chatId) return;
    socket.leave(chatId);
  });

  // ---- MESSAGES (routed AFTER client saves to Firestore) ----
  socket.on("send_message", (data, ack) => {
    if (!data?.chatId || !data?.id || !data?.text) {
      if (ack) ack({ success: false, error: "Invalid data" });
      return;
    }
    // Server overrides senderId — never trust client
    data.senderId = userId;
    // Route to room (excludes sender)
    socket.to(data.chatId).emit("receive_message", data);
    if (ack) ack({ success: true });
  });

  // ---- TYPING (ephemeral, no DB) ----
  socket.on("typing_start", ({ chatId }) => {
    if (!chatId) return;
    socket.to(chatId).emit("user_typing", { chatId, userId });
  });

  socket.on("typing_stop", ({ chatId }) => {
    if (!chatId) return;
    socket.to(chatId).emit("user_stop_typing", { chatId, userId });
  });

  // ---- READ RECEIPTS (ephemeral notification) ----
  socket.on("mark_read", ({ chatId }) => {
    if (!chatId) return;
    socket.to(chatId).emit("messages_read", { chatId, userId });
  });

  // ---- PRESENCE CHECK ----
  socket.on("check_online", (userIds, ack) => {
    if (!Array.isArray(userIds) || !ack) return;
    ack(userIds.filter((id) => onlineUsers.has(id)));
  });

  // ---- DISCONNECT (with grace period) ----
  socket.on("disconnect", () => {
    const timer = setTimeout(() => {
      onlineUsers.delete(userId);
      disconnectTimers.delete(userId);
      broadcastOnlineUsers();
      console.log(`❌ ${userId} offline`);
    }, DISCONNECT_GRACE_MS);
    disconnectTimers.set(userId, timer);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});
