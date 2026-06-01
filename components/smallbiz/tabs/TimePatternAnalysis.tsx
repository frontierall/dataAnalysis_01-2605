"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";
import type { SalesRecord } from "@/lib/smallbiz/types";
import {
  buildWeekdayHourMatrix,
  computeWeekdayStats,
  computeHourlyStats,
  computeMonthlyTrend,
  WEEKDAY_LABELS,
} from "@/lib/smallbiz/timePattern";
import HeatmapGrid from "@/components/smallbiz/shared/HeatmapGrid";

function fmtKRW(v: number): string {
  if (v >= 10_000) return `${Math.round(v / 10_000)}만원`;
  return `${v.toLocaleString("ko-KR")}원`;
}

function fmtAxis(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 10_000) return `${(v / 10_000).toFixed(0)}만`;
  return String(v);
}

const HOUR_LABELS = Array.from({ length: 24 }, (_, i) =>
  i % 3 === 0 ? `${i}시` : ""
);

export default function TimePatternAnalysisTab({
  records,
}: {
  records: SalesRecord[];
}) {
  const [heatMetric, setHeatMetric] = useState<"count" | "revenue">("count");

  const heatmap = useMemo(
    () => buildWeekdayHourMatrix(records, heatMetric),
    [records, heatMetric]
  );
  const weekdayStats = useMemo(() => computeWeekdayStats(records), [records]);
  const hourlyStats = useMemo(() => computeHourlyStats(records), [records]);
  const monthlyTrend = useMemo(() => computeMonthlyTrend(records), [records]);

  const examMonths = monthlyTrend
    .filter((d) => d.isExamPeriod)
    .map((d) => d.yearMonth);

  return (
    <div className="space-y-6">
      {/* Heatmap */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">
            요일 × 시간대 히트맵
          </h3>
          <div className="flex gap-1">
            {(["count", "revenue"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setHeatMetric(m)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                  heatMetric === m
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {m === "count" ? "건수" : "매출액"}
              </button>
            ))}
          </div>
        </div>
        <HeatmapGrid
          rowLabels={WEEKDAY_LABELS}
          colLabels={HOUR_LABELS}
          data={heatmap.matrix}
          maxValue={heatmap.maxValue}
          formatValue={(v) =>
            heatMetric === "count"
              ? `${v}건`
              : `${Math.round(v / 10000)}만원`
          }
          cellSize={26}
        />
        <p className="text-xs text-gray-400 mt-3">
          진한 파란색 = 피크타임 / hover 시 수치 확인
        </p>
      </div>

      {/* Weekday + Hourly bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            요일별 평균 매출
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={weekdayStats}
              margin={{ top: 5, right: 15, bottom: 5, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10 }} width={50} />
              <Tooltip
                formatter={(v) => [fmtKRW(v as number), "평균 매출"]}
                labelFormatter={(l) => `${l}요일`}
              />
              <Bar dataKey="avg" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            시간대별 거래 건수
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={hourlyStats}
              margin={{ top: 5, right: 15, bottom: 5, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9 }}
                interval={2}
              />
              <YAxis tick={{ fontSize: 10 }} width={35} />
              <Tooltip
                formatter={(v) => [`${v}건`, "거래 수"]}
              />
              <Bar dataKey="count" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly trend with exam annotations */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">
          월별 매출 추이
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          세로선: 시험기간(중간·기말고사, 수능)
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart
            data={monthlyTrend}
            margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="yearMonth"
              tick={{ fontSize: 9 }}
              interval={2}
            />
            <YAxis tickFormatter={fmtAxis} tick={{ fontSize: 10 }} width={55} />
            <Tooltip
              formatter={(v) => [fmtKRW(v as number), "매출"]}
              labelFormatter={(l) => {
                const found = monthlyTrend.find((d) => d.yearMonth === l);
                return found?.examLabel
                  ? `${l} (${found.examLabel})`
                  : String(l);
              }}
            />
            {examMonths.map((ym) => (
              <ReferenceLine
                key={ym}
                x={ym}
                stroke="#f59e0b"
                strokeDasharray="4 2"
                label={{ value: "📚", position: "top", fontSize: 11 }}
              />
            ))}
            <Line
              type="monotone"
              dataKey="total"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-yellow-400" />
            시험기간 (매출 급증 예상)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-gray-100 border border-gray-200" />
            방학(1·2·7·8월)은 계절성 변화 주목
          </span>
        </div>
      </div>
    </div>
  );
}
