"use client";

import { useState } from "react";
import { useDataStore } from "@/store/dataStore";
import type { MenuItem } from "@/lib/types";

const BASE_MENU_ITEMS: MenuItem[] = [
  { id: "upload", label: "파일 업로드", requiresData: false },
  { id: "analysis", label: "기본 데이터 분석", requiresData: true },
  { id: "cleaning", label: "데이터 정제", requiresData: true },
  { id: "visualization", label: "시각화", requiresData: true },
  { id: "correlation", label: "상관관계 분석", requiresData: true },
];

const SMALLBIZ_MENU_ITEM: MenuItem = {
  id: "smallbiz",
  label: "소상공인 매출 분석",
  requiresData: true,
};

const ICONS: Record<string, string> = {
  upload: "📂",
  analysis: "📊",
  cleaning: "🧹",
  visualization: "📈",
  correlation: "🔗",
  smallbiz: "🏪",
};

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { data, activeMenu, setActiveMenu, isSmallBizData } = useDataStore();

  const menuItems = isSmallBizData
    ? [BASE_MENU_ITEMS[0], SMALLBIZ_MENU_ITEM, ...BASE_MENU_ITEMS.slice(1)]
    : BASE_MENU_ITEMS;

  return (
    <aside
      className={`flex flex-col bg-gray-900 text-white transition-all duration-300 ${
        collapsed ? "w-14" : "w-56"
      } shrink-0`}
    >
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
        {!collapsed && (
          <span className="font-semibold text-sm truncate">데이터 분석</span>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="ml-auto text-gray-400 hover:text-white transition-colors"
          aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      <nav className="flex-1 py-4">
        {menuItems.map((item) => {
          const disabled = item.requiresData && !data;
          const active = activeMenu === item.id;

          return (
            <button
              key={item.id}
              onClick={() => !disabled && setActiveMenu(item.id)}
              disabled={disabled}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors
                ${active ? "bg-blue-600 text-white" : "text-gray-300"}
                ${disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-700 cursor-pointer"}
              `}
              title={collapsed ? item.label : undefined}
            >
              <span className="text-base leading-none shrink-0">
                {ICONS[item.id] ?? "•"}
              </span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
