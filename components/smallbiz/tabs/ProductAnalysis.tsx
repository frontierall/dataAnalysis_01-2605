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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { SalesRecord } from "@/lib/smallbiz/types";
import {
  computeBestSellers,
  computeUsageCategoryBreakdown,
  computePayMethodBreakdown,
  computeCouponStats,
  computePriceDistribution,
  computeProductSummary,
} from "@/lib/smallbiz/productAnalysis";

function fmtKRW(v: number): string {
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억원`;
  if (v >= 10_000) return `${Math.round(v / 10_000).toLocaleString("ko-KR")}만원`;
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
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

const CAT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#9ca3af"];
const PAY_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#9ca3af"];

function truncateProduct(s: string, max = 22): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

export default function ProductAnalysisTab({
  records,
}: {
  records: SalesRecord[];
}) {
  const [sellerMetric, setSellerMetric] = useState<"count" | "revenue">(
    "revenue"
  );

  const summary = useMemo(() => computeProductSummary(records), [records]);
  const bestSellers = useMemo(() => computeBestSellers(records, 10), [records]);
  const catBreakdown = useMemo(
    () => computeUsageCategoryBreakdown(records),
    [records]
  );
  const payBreakdown = useMemo(
    () => computePayMethodBreakdown(records),
    [records]
  );
  const couponStats = useMemo(() => computeCouponStats(records), [records]);
  const priceDistribution = useMemo(
    () => computePriceDistribution(records),
    [records]
  );

  const displaySellers =
    sellerMetric === "count" ? bestSellers.byCount : bestSellers.byRevenue;
  const displaySellersForChart = [...displaySellers]
    .reverse()
    .map((p) => ({
      ...p,
      product: truncateProduct(p.product),
      value: sellerMetric === "count" ? p.count : p.revenue,
    }));

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="베스트 상품"
          value={truncateProduct(summary.topProduct, 14)}
          sub="매출액 기준"
        />
        <SummaryCard
          label="정기권 매출 비율"
          value={`${summary.subscriptionRatio.toFixed(1)}%`}
          sub="자유석·지정석 합산"
        />
        <SummaryCard
          label="쿠폰 사용률"
          value={`${summary.couponUsageRate.toFixed(1)}%`}
          sub={`${couponStats.totalUsed}건 사용`}
        />
        <SummaryCard
          label="무료 서비스 제공"
          value={`${summary.freeServiceCount.toLocaleString()}건`}
          sub="지불방법=서비스"
        />
      </div>

      {/* Best sellers + Category donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">
              베스트셀러 TOP 10
            </h3>
            <div className="flex gap-1">
              {(["revenue", "count"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setSellerMetric(m)}
                  className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                    sellerMetric === m
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {m === "revenue" ? "매출액" : "판매건수"}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={displaySellersForChart}
              layout="vertical"
              margin={{ top: 5, right: 15, bottom: 5, left: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={sellerMetric === "revenue" ? fmtAxis : String}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                dataKey="product"
                type="category"
                tick={{ fontSize: 10 }}
                width={120}
              />
              <Tooltip
                formatter={(v) =>
                  sellerMetric === "revenue"
                    ? [fmtKRW(v as number), "매출"]
                    : [`${v}건`, "판매수"]
                }
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            이용 유형별 매출 구성
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={catBreakdown.filter((c) => c.revenue > 0)}
                dataKey="revenue"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
              >
                {catBreakdown
                  .filter((c) => c.revenue > 0)
                  .map((_, i) => (
                    <Cell
                      key={i}
                      fill={CAT_COLORS[i % CAT_COLORS.length]}
                    />
                  ))}
              </Pie>
              <Tooltip formatter={(v) => [fmtKRW(v as number), ""]} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v) => <span className="text-xs">{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1">
            {catBreakdown
              .filter((c) => c.revenue > 0)
              .map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }}
                    />
                    <span className="text-gray-600">{c.label}</span>
                  </div>
                  <span className="text-gray-500">
                    {c.ratio.toFixed(1)}% · {c.count}건
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Pay method + Price distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            결제 수단 비중
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={payBreakdown}
                dataKey="count"
                nameKey="method"
                cx="50%"
                cy="50%"
                outerRadius={80}
                paddingAngle={2}
              >
                {payBreakdown.map((_, i) => (
                  <Cell key={i} fill={PAY_COLORS[i % PAY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v, name) => [`${v}건`, name]}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v) => (
                  <span className="text-xs">
                    {v} (
                    {payBreakdown
                      .find((p) => p.method === v)
                      ?.ratio.toFixed(1)}
                    %)
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            가격대별 거래 분포
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={priceDistribution}
              margin={{ top: 5, right: 15, bottom: 5, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={40} />
              <Tooltip formatter={(v) => [`${(v as number).toLocaleString()}건`, "거래수"]} />
              <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Coupon stats */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">쿠폰 분석</h3>
        {couponStats.totalUsed === 0 ? (
          <p className="text-sm text-gray-400 py-2">쿠폰 사용 데이터가 없습니다</p>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-gray-500">총 사용:</span>{" "}
                <span className="font-semibold text-gray-800">
                  {couponStats.totalUsed}건
                </span>
              </div>
              <div>
                <span className="text-gray-500">사용률:</span>{" "}
                <span className="font-semibold text-gray-800">
                  {couponStats.usageRate.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {couponStats.couponTypes.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-24 text-gray-600 truncate">{c.name}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-4 bg-blue-400 rounded-full"
                      style={{
                        width: `${(c.count / couponStats.totalUsed) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-gray-500 w-12 text-right">{c.count}건</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
