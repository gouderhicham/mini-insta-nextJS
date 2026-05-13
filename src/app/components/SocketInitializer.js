"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";
import { useSocketStore } from "../store/useSocketStore";

export default function SocketInitializer({ userId }) {
  const { setSocket, setIsConnected, setOnlineUsers } = useSocketStore();

  useEffect(() => {
    if (!userId) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

    const socketInstance = io(socketUrl, {
      query: { userId },
      withCredentials: true,
      // Robust reconnection strategy
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketInstance.on("connect", () => {
      console.log("✅ Socket connected");
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    socketInstance.on("reconnect", () => {
      setIsConnected(true);
    });

    // Global online users broadcast from server
    socketInstance.on("online_users", (users) => {
      setOnlineUsers(users);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [userId]);

  return null;
}
