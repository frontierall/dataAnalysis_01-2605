"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { SalesRecord } from "@/lib/smallbiz/types";
import {
  groupByPeriod,
  computeYoY,
  computeSalesByCategory,
  computeATVTrend,
  computeSalesSummary,
  type Period,
} from "@/lib/smallbiz/salesAnalysis";

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

function fmtKRW(v: number): string {
  if (v >= 100_000_000)
    return `${(v / 100_000_000).toFixed(1)}억원`;
  if (v >= 10_000)
    return `${Math.round(v / 10_000).toLocaleString("ko-KR")}만원`;
  return `${v.toLocaleString("ko-KR")}원`;
}

function fmtAxis(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 10_000) return `${(v / 10_000).toFixed(0)}만`;
  return String(v);
}

function SummaryCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color ?? "text-gray-900"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

const PERIOD_OPTIONS: { id: Period; label: string }[] = [
  { id: "day", label: "일" },
  { id: "week", label: "주" },
  { id: "month", label: "월" },
  { id: "year", label: "연" },
];

export default function SalesAnalysisTab({
  records,
}: {
  records: SalesRecord[];
}) {
  const [period, setPeriod] = useState<Period>("month");

  const summary = useMemo(() => computeSalesSummary(records), [records]);
  const periodData = useMemo(
    () => groupByPeriod(records, period),
    [records, period]
  );
  const yoyData = useMemo(() => computeYoY(records), [records]);
  const categoryData = useMemo(
    () => computeSalesByCategory(records),
    [records]
  );
  const atvData = useMemo(() => computeATVTrend(records, "month"), [records]);

  const displayPeriodData = period === "day" ? periodData.slice(-90) : periodData;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="총매출"
          value={fmtKRW(summary.grossRevenue)}
          sub={`${summary.totalTransactions.toLocaleString()}건`}
        />
        <SummaryCard
          label="순매출"
          value={fmtKRW(summary.netRevenue)}
          sub="총매출 − 취소·환불"
          color="text-blue-600"
        />
        <SummaryCard
          label="취소·환불율"
          value={`${summary.cancelRate.toFixed(1)}%`}
          sub={`${summary.cancelCount.toLocaleString()}건`}
          color={summary.cancelRate > 10 ? "text-red-500" : "text-gray-900"}
        />
        <SummaryCard
          label="평균 객단가"
          value={fmtKRW(summary.avgTransactionValue)}
          sub={`서비스 제공 ${summary.freeServiceCount.toLocaleString()}건`}
        />
      </div>

      {/* Trend chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">매출 추이</h3>
          <div className="flex gap-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setPeriod(opt.id)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                  period === opt.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {period === "day" && (
          <p className="text-xs text-gray-400 mb-2">최근 90일 표시</p>
        )}
        <ResponsiveContainer width="100%" height={280}>
          <LineChart
            data={displayPeriodData}
            margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10 }} width={55} />
            <Tooltip
              formatter={(v, name) => [
                fmtKRW(v as number),
                name === "grossRevenue" ? "총매출" : "순매출",
              ]}
            />
            <Legend
              formatter={(v) => (v === "grossRevenue" ? "총매출" : "순매출")}
            />
            <Line
              type="monotone"
              dataKey="grossRevenue"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="netRevenue"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              strokeDasharray="4 2"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* YoY + Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            연도별 매출 (YoY)
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={yoyData}
              margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10 }} width={55} />
              <Tooltip
                formatter={(v) => [fmtKRW(v as number), "매출"]}
                labelFormatter={(l) => `${l}년`}
              />
              <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                {yoyData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.growth != null && entry.growth < 0 ? "#ef4444" : "#3b82f6"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-2">
            {yoyData.map(
              (d) =>
                d.growth != null && (
                  <span
                    key={d.year}
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      d.growth >= 0
                        ? "bg-blue-50 text-blue-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {d.year}: {d.growth >= 0 ? "+" : ""}
                    {d.growth.toFixed(1)}%
                  </span>
                )
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            이용 유형별 구성비
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="total"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
              >
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v, name) => [fmtKRW(v as number), name]}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v) => <span className="text-xs">{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ATV trend */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          월별 객단가(ATV) 추이
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={atvData}
            margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10 }} width={55} />
            <Tooltip formatter={(v) => [fmtKRW(v as number), "객단가"]} />
            <Line
              type="monotone"
              dataKey="atv"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
