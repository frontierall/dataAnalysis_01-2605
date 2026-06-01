"use client";

import { create } from "zustand";
import type { ParsedData } from "@/lib/types";

interface DataStore {
  data: ParsedData | null;
  activeMenu: string;
  setData: (data: ParsedData) => void;
  clearData: () => void;
  setActiveMenu: (id: string) => void;
}

export const useDataStore = create<DataStore>((set) => ({
  data: null,
  activeMenu: "upload",
  setData: (data) => set({ data }),
  clearData: () => set({ data: null }),
  setActiveMenu: (id) => set({ activeMenu: id }),
}));
