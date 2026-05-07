// src/stores/counterStore.js
"use client";

import { create } from "zustand";

export const useCounterStore = create((set) => ({
  count: 0,

  increase: () => set((state) => ({ count: state.count + 1 })),
  decrease: () => set((state) => ({ count: state.count - 1 })),
}));