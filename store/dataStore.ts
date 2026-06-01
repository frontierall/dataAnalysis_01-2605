"use client";

import { create } from "zustand";
import type { ParsedData } from "@/lib/types";

interface DataStore {
  data: ParsedData | null;
  cleanedData: ParsedData | null;
  activeDataSource: "original" | "cleaned";
  activeMenu: string;
  setData: (data: ParsedData) => void;
  setCleanedData: (data: ParsedData) => void;
  clearCleanedData: () => void;
  clearData: () => void;
  setActiveMenu: (id: string) => void;
  setActiveDataSource: (source: "original" | "cleaned") => void;
}

export const useDataStore = create<DataStore>((set) => ({
  data: null,
  cleanedData: null,
  activeDataSource: "original",
  activeMenu: "upload",
  setData: (data) =>
    set({ data, cleanedData: null, activeDataSource: "original" }),
  setCleanedData: (data) =>
    set({ cleanedData: data, activeDataSource: "cleaned" }),
  clearCleanedData: () =>
    set({ cleanedData: null, activeDataSource: "original" }),
  clearData: () =>
    set({ data: null, cleanedData: null, activeDataSource: "original" }),
  setActiveMenu: (id) => set({ activeMenu: id }),
  setActiveDataSource: (source) => set({ activeDataSource: source }),
}));
