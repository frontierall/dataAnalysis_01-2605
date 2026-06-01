"use client";

import { useState, useMemo } from "react";
import { useDataStore } from "@/store/dataStore";
import { parseSalesRecords } from "@/lib/smallbiz/salesAnalysis";
import type { SmallBizSubTab } from "@/lib/smallbiz/types";
import SalesAnalysisTab from "./tabs/SalesAnalysis";
import TimePatternAnalysisTab from "./tabs/TimePatternAnalysis";
import CustomerAnalysisTab from "./tabs/CustomerAnalysis";
import ProductAnalysisTab from "./tabs/ProductAnalysis";

const TABS: { id: SmallBizSubTab; label: string; icon: string }[] = [
  { id: "sales", label: "매출 분석", icon: "💰" },
  { id: "timePattern", label: "시간 패턴", icon: "⏰" },
  { id: "customer", label: "고객·회원", icon: "👥" },
  { id: "product", label: "상품·결제", icon: "🛍️" },
];

export default function SmallBizDashboard() {
  const [activeTab, setActiveTab] = useState<SmallBizSubTab>("sales");
  const { data, smallBizColMap } = useDataStore();

  const records = useMemo(() => {
    if (!data || !smallBizColMap) return [];
    return parseSalesRecords(data.rows, smallBizColMap);
  }, [data, smallBizColMap]);

  if (!data || !smallBizColMap) return null;

  return (
    <div className="space-y-4 max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            소상공인 매출 분석
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {data.fileName} · {records.length.toLocaleString()}건
          </p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <span className="text-base leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pt-1">
        {activeTab === "sales" && <SalesAnalysisTab records={records} />}
        {activeTab === "timePattern" && (
          <TimePatternAnalysisTab records={records} />
        )}
        {activeTab === "customer" && (
          <CustomerAnalysisTab records={records} />
        )}
        {activeTab === "product" && <ProductAnalysisTab records={records} />}
      </div>
    </div>
  );
}
