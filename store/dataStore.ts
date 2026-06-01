"use client";

import { create } from "zustand";
import type { ParsedData } from "@/lib/types";
import type { SmallBizColumnMap } from "@/lib/smallbiz/types";

interface DataStore {
  data: ParsedData | null;
  cleanedData: ParsedData | null;
  activeDataSource: "original" | "cleaned";
  activeMenu: string;
  isSmallBizData: boolean;
  smallBizColMap: SmallBizColumnMap | null;
  setData: (data: ParsedData) => void;
  setCleanedData: (data: ParsedData) => void;
  clearCleanedData: () => void;
  clearData: () => void;
  setActiveMenu: (id: string) => void;
  setActiveDataSource: (source: "original" | "cleaned") => void;
  setSmallBizMeta: (isSmallBiz: boolean, colMap: SmallBizColumnMap | null) => void;
}

export const useDataStore = create<DataStore>((set) => ({
  data: null,
  cleanedData: null,
  activeDataSource: "original",
  activeMenu: "upload",
  isSmallBizData: false,
  smallBizColMap: null,
  setData: (data) =>
    set({ data, cleanedData: null, activeDataSource: "original" }),
  setCleanedData: (data) =>
    set({ cleanedData: data, activeDataSource: "cleaned" }),
  clearCleanedData: () =>
    set({ cleanedData: null, activeDataSource: "original" }),
  clearData: () =>
    set({
      data: null,
      cleanedData: null,
      activeDataSource: "original",
      isSmallBizData: false,
      smallBizColMap: null,
    }),
  setActiveMenu: (id) => set({ activeMenu: id }),
  setActiveDataSource: (source) => set({ activeDataSource: source }),
  setSmallBizMeta: (isSmallBiz, colMap) =>
    set({ isSmallBizData: isSmallBiz, smallBizColMap: colMap }),
}));
