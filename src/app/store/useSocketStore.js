"use client";

import { create } from "zustand";

export const useSocketStore = create((set, get) => ({
  socket: null,
  isConnected: false,
  onlineUsers: [],
  typingUsers: {},

  setSocket: (s) => set({ socket: s }),
  setIsConnected: (v) => set({ isConnected: v }),
  setOnlineUsers: (users) => set({ onlineUsers: users }),

  addTypingUser: (chatId, userId) =>
    set((state) => {
      const current = state.typingUsers[chatId] || [];
      if (current.includes(userId)) return state;
      return { typingUsers: { ...state.typingUsers, [chatId]: [...current, userId] } };
    }),

  removeTypingUser: (chatId, userId) =>
    set((state) => {
      const current = state.typingUsers[chatId] || [];
      return { typingUsers: { ...state.typingUsers, [chatId]: current.filter((id) => id !== userId) } };
    }),

  isUserOnline: (userId) => get().onlineUsers.includes(userId),
}));
