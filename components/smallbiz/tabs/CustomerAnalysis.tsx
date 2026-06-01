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
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { SalesRecord } from "@/lib/smallbiz/types";
import {
  buildCustomerProfiles,
  computeRFM,
  computeNewVsReturning,
  computeTopCustomers,
  detectChurned,
  computeCohortMatrix,
  computeProductFunnel,
  computeCustomerSummary,
  RFM_SEGMENT_LABELS,
  RFM_SEGMENT_COLORS,
} from "@/lib/smallbiz/customerAnalysis";
import HeatmapGrid from "@/components/smallbiz/shared/HeatmapGrid";

function fmtKRW(v: number): string {
  if (v >= 10_000) return `${Math.round(v / 10_000).toLocaleString("ko-KR")}만원`;
  return `${v.toLocaleString("ko-KR")}원`;
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

const CHURN_THRESHOLDS = [30, 60, 90, 180];

const COHORT_COLOR = (ratio: number) => {
  const r = Math.round(220 - ratio * 180);
  const g = Math.round(38 + ratio * 180);
  const b = Math.round(38 + ratio * 60);
  return `rgb(${r},${g},${b})`;
};

export default function CustomerAnalysisTab({
  records,
}: {
  records: SalesRecord[];
}) {
  const [topTab, setTopTab] = useState<"visits" | "spend">("visits");
  const [churnDays, setChurnDays] = useState(90);

  const referenceDate = useMemo(() => {
    const dates = records.map((r) => r.datetime.getTime());
    return new Date(Math.max(...dates));
  }, [records]);

  const profiles = useMemo(
    () => buildCustomerProfiles(records),
    [records]
  );
  const rfmScores = useMemo(
    () => computeRFM(profiles, referenceDate),
    [profiles, referenceDate]
  );
  const summary = useMemo(
    () => computeCustomerSummary(profiles, rfmScores, referenceDate),
    [profiles, rfmScores, referenceDate]
  );
  const newVsReturning = useMemo(
    () => computeNewVsReturning(records, profiles),
    [records, profiles]
  );
  const topCustomers = useMemo(
    () => computeTopCustomers(profiles),
    [profiles]
  );
  const churnedCustomers = useMemo(
    () => detectChurned(profiles, churnDays, referenceDate),
    [profiles, churnDays, referenceDate]
  );
  const cohortMatrix = useMemo(
    () => computeCohortMatrix(records, profiles),
    [records, profiles]
  );
  const funnel = useMemo(() => computeProductFunnel(records), [records]);

  // RFM segment counts for pie
  const segmentCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of rfmScores) {
      map.set(s.segment, (map.get(s.segment) ?? 0) + 1);
    }
    return [...map.entries()].map(([seg, count]) => ({
      name: RFM_SEGMENT_LABELS[seg as keyof typeof RFM_SEGMENT_LABELS] ?? seg,
      value: count,
      color: RFM_SEGMENT_COLORS[seg as keyof typeof RFM_SEGMENT_COLORS] ?? "#9ca3af",
    }));
  }, [rfmScores]);

  const displayTop =
    topTab === "visits" ? topCustomers.byVisits : topCustomers.bySpend;

  const cohortColLabels = Array.from(
    { length: cohortMatrix.maxPeriods },
    (_, i) => (i === 0 ? "M0" : `+${i}M`)
  );

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="총 회원 수"
          value={`${summary.totalMembers.toLocaleString()}명`}
        />
        <SummaryCard
          label="신규 회원 (최근 30일)"
          value={`${summary.newMembersLast30.toLocaleString()}명`}
          color="text-purple-600"
        />
        <SummaryCard
          label="이탈위험·휴면"
          value={`${summary.churnRiskCount.toLocaleString()}명`}
          color={summary.churnRiskCount > 0 ? "text-red-500" : "text-gray-900"}
        />
        <SummaryCard
          label="평균 방문 간격"
          value={`${summary.avgDaysBetweenVisits}일`}
        />
      </div>

      {/* New vs Returning */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          월별 신규 vs 재방문 거래 건수
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={newVsReturning}
            margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="yearMonth"
              tick={{ fontSize: 9 }}
              interval={2}
            />
            <YAxis tick={{ fontSize: 10 }} width={35} />
            <Tooltip formatter={(v, name) => [
              `${v}건`,
              name === "newCount" ? "신규" : "재방문",
            ]} />
            <Legend
              formatter={(v) => (v === "newCount" ? "신규" : "재방문")}
            />
            <Bar dataKey="returningCount" stackId="a" fill="#3b82f6" name="재방문" />
            <Bar dataKey="newCount" stackId="a" fill="#8b5cf6" radius={[3, 3, 0, 0]} name="신규" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* RFM Pie + Top customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            RFM 고객 세그먼트
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={segmentCounts}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
              >
                {segmentCounts.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v}명`, ""]} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v) => <span className="text-xs">{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">단골 TOP 10</h3>
            <div className="flex gap-1">
              {(["visits", "spend"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTopTab(t)}
                  className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                    topTab === t
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {t === "visits" ? "방문수" : "결제액"}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100">
                  <th className="text-left py-1 pr-2">#</th>
                  <th className="text-left py-1 pr-2">회원</th>
                  <th className="text-right py-1 pr-2">방문수</th>
                  <th className="text-right py-1">총결제</th>
                </tr>
              </thead>
              <tbody>
                {displayTop.map((c) => (
                  <tr
                    key={c.name}
                    className="border-b border-gray-50 hover:bg-gray-50"
                  >
                    <td className="py-1.5 pr-2 text-gray-400 font-medium">
                      {c.rank}
                    </td>
                    <td className="py-1.5 pr-2 font-medium text-gray-800">
                      {c.name}
                    </td>
                    <td className="py-1.5 pr-2 text-right text-gray-700">
                      {c.visits}회
                    </td>
                    <td className="py-1.5 text-right text-gray-700">
                      {fmtKRW(c.totalSpend)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Cohort retention heatmap */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">
          코호트 잔존율 (가입월 기준)
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          M0 = 가입 당월, +1M = 가입 후 1개월 뒤 재방문율(%) / 최근 24개 코호트
        </p>
        <HeatmapGrid
          rowLabels={cohortMatrix.cohorts.map(
            (c, i) => `${c} (${cohortMatrix.sizes[i]}명)`
          )}
          colLabels={cohortColLabels}
          data={cohortMatrix.data}
          maxValue={100}
          formatValue={(v) => `${v}%`}
          colorFn={COHORT_COLOR}
          cellSize={30}
        />
      </div>

      {/* Churn detection */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">
            이탈위험 회원 ({churnedCustomers.length}명)
          </h3>
          <div className="flex gap-1">
            {CHURN_THRESHOLDS.map((d) => (
              <button
                key={d}
                onClick={() => setChurnDays(d)}
                className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                  churnDays === d
                    ? "bg-red-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {d}일
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          마지막 방문 후 {churnDays}일 이상 경과한 회원
        </p>
        {churnedCustomers.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            해당 조건의 회원이 없습니다
          </p>
        ) : (
          <div className="overflow-auto max-h-64">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="text-gray-500 border-b border-gray-100">
                  <th className="text-left py-1 pr-3">회원</th>
                  <th className="text-right py-1 pr-3">마지막 방문</th>
                  <th className="text-right py-1 pr-3">경과일</th>
                  <th className="text-right py-1 pr-3">총방문</th>
                  <th className="text-right py-1">총결제</th>
                </tr>
              </thead>
              <tbody>
                {churnedCustomers.slice(0, 50).map((c) => (
                  <tr
                    key={c.name}
                    className="border-b border-gray-50 hover:bg-red-50"
                  >
                    <td className="py-1.5 pr-3 font-medium text-gray-800">
                      {c.name}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-gray-600">
                      {c.lastVisit.toISOString().slice(0, 10)}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-red-500 font-medium">
                      {c.daysSince}일
                    </td>
                    <td className="py-1.5 pr-3 text-right text-gray-600">
                      {c.totalVisits}회
                    </td>
                    <td className="py-1.5 text-right text-gray-600">
                      {fmtKRW(c.totalSpend)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {churnedCustomers.length > 50 && (
              <p className="text-xs text-gray-400 text-center py-2">
                상위 50명 표시 (전체 {churnedCustomers.length}명)
              </p>
            )}
          </div>
        )}
      </div>

      {/* Funnel */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          상품 전환 퍼널
        </h3>
        <div className="space-y-3">
          {funnel.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-32 text-xs text-gray-600 text-right shrink-0">
                {step.label}
              </span>
              <div className="flex-1 bg-gray-100 rounded-full h-7 relative overflow-hidden">
                <div
                  className="h-7 rounded-full flex items-center justify-end pr-3 transition-all"
                  style={{
                    width: `${step.percentage}%`,
                    backgroundColor:
                      i === 0
                        ? "#3b82f6"
                        : i === 1
                        ? "#10b981"
                        : i === 2
                        ? "#8b5cf6"
                        : "#f59e0b",
                    minWidth: step.count > 0 ? "2rem" : 0,
                  }}
                >
                  <span className="text-white text-xs font-medium">
                    {step.count}명
                  </span>
                </div>
              </div>
              <span className="w-12 text-xs text-gray-500 text-right shrink-0">
                {step.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
