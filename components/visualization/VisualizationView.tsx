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
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { useDataStore } from "@/store/dataStore";
import { computeDatasetSummary } from "@/lib/analysis";
import { isMissing, toNumber } from "@/lib/cleaning";
import type { ColumnType } from "@/lib/types";

const SCATTER_SAMPLE = 2000;
const HIST_BINS = 20;
const BAR_MAX_CATS = 25;

// ── helpers ──────────────────────────────────────────────────────────────────

function buildHistogram(values: number[]) {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return [{ name: String(min), count: values.length }];
  const binW = (max - min) / HIST_BINS;
  const bins = Array.from({ length: HIST_BINS }, (_, i) => ({
    name: `${(min + i * binW).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}`,
    count: 0,
  }));
  for (const v of values) {
    const idx = Math.min(Math.floor((v - min) / binW), HIST_BINS - 1);
    if (idx >= 0) bins[idx].count++;
  }
  return bins;
}

function buildBarData(values: unknown[]) {
  const freq = new Map<string, number>();
  for (const v of values) {
    if (!isMissing(v)) {
      const s = String(v);
      freq.set(s, (freq.get(s) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, BAR_MAX_CATS)
    .map(([name, count]) => ({ name, count }));
}

function buildLineData(values: unknown[]) {
  const freq = new Map<string, number>();
  for (const v of values) {
    if (isMissing(v)) continue;
    const d = new Date(String(v));
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    freq.set(key, (freq.get(key) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => ({ name, count }));
}

function sampleArray<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const step = arr.length / n;
  return Array.from({ length: n }, (_, i) => arr[Math.floor(i * step)]);
}

// ── sub-components ────────────────────────────────────────────────────────────

function DataSourceToggle() {
  const { cleanedData, activeDataSource, setActiveDataSource } = useDataStore();
  if (!cleanedData) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-500">데이터:</span>
      {(["original", "cleaned"] as const).map((src) => (
        <button
          key={src}
          onClick={() => setActiveDataSource(src)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            activeDataSource === src
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {src === "original" ? "원본" : "정제본"}
        </button>
      ))}
    </div>
  );
}

function ChartArea({
  col1,
  col2,
  colType,
  rows,
  columns,
}: {
  col1: string;
  col2: string;
  colType: Record<string, ColumnType>;
  rows: Record<string, unknown>[];
  columns: string[];
}) {
  const isScatter = col2 !== "";

  // scatter
  if (isScatter) {
    const raw = rows
      .filter((r) => !isMissing(r[col1]) && !isMissing(r[col2]))
      .map((r) => ({ x: toNumber(r[col1]), y: toNumber(r[col2]) }))
      .filter((p) => !isNaN(p.x) && !isNaN(p.y));
    const sampled = sampleArray(raw, SCATTER_SAMPLE);
    const excluded = rows.length - raw.length;

    return (
      <div>
        {excluded > 0 && (
          <p className="text-xs text-gray-400 mb-2">
            결측치 {excluded.toLocaleString()}행 제외 / 산점도 최대{" "}
            {SCATTER_SAMPLE.toLocaleString()}점 표시
          </p>
        )}
        <ResponsiveContainer width="100%" height={360}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="x"
              name={col1}
              label={{ value: col1, position: "insideBottom", offset: -10, fontSize: 12 }}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              dataKey="y"
              name={col2}
              label={{ value: col2, angle: -90, position: "insideLeft", fontSize: 12 }}
              tick={{ fontSize: 11 }}
            />
            <ZAxis range={[20, 20]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              formatter={(v, name) => [
                typeof v === "number"
                  ? v.toLocaleString("ko-KR", { maximumFractionDigits: 2 })
                  : v,
                name,
              ]}
            />
            <Scatter data={sampled} fill="#f97316" fillOpacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const type = colType[col1] ?? "categorical";
  const allValues = rows.map((r) => r[col1]);
  const missing = allValues.filter(isMissing).length;
  const validCount = rows.length - missing;

  if (type === "numeric") {
    const nums = allValues
      .filter((v) => !isMissing(v))
      .map((v) => toNumber(v))
      .filter((n) => !isNaN(n));
    const hist = buildHistogram(nums);

    return (
      <div>
        <p className="text-xs text-gray-400 mb-2">
          유효 값 {validCount.toLocaleString()}개
          {missing > 0 && ` (결측치 ${missing.toLocaleString()}개 제외)`}
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={hist} margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
              label={{ value: col1, position: "insideBottom", offset: -10, fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(v) => [v, "빈도"]}
              labelFormatter={(l) => `구간: ${l}`}
            />
            <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === "datetime") {
    const lineData = buildLineData(allValues);
    return (
      <div>
        <p className="text-xs text-gray-400 mb-2">
          월별 빈도 — 유효 값 {validCount.toLocaleString()}개
          {missing > 0 && ` (결측치 ${missing.toLocaleString()}개 제외)`}
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={lineData} margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
              label={{ value: "기간", position: "insideBottom", offset: -10, fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [v, "건수"]} />
            <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // categorical
  const barData = buildBarData(allValues);
  const shown = barData.length;
  const total = new Set(allValues.filter((v) => !isMissing(v)).map(String)).size;

  return (
    <div>
      <p className="text-xs text-gray-400 mb-2">
        상위 {shown}개 범주 표시 (전체 {total.toLocaleString()}개)
        {missing > 0 && ` / 결측치 ${missing.toLocaleString()}개 제외`}
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={barData}
          layout="vertical"
          margin={{ top: 10, right: 20, bottom: 10, left: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fontSize: 11 }}
            width={75}
          />
          <Tooltip formatter={(v) => [v, "빈도"]} />
          <Bar dataKey="count" fill="#8b5cf6" radius={[0, 2, 2, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────

export default function VisualizationView() {
  const { data, cleanedData, activeDataSource } = useDataStore();
  const activeData =
    activeDataSource === "cleaned" && cleanedData ? cleanedData : data;

  const summary = useMemo(
    () =>
      activeData
        ? computeDatasetSummary(activeData.columns, activeData.rows)
        : null,
    [activeData]
  );

  const colTypeMap = useMemo<Record<string, ColumnType>>(
    () =>
      Object.fromEntries(summary?.columns.map((c) => [c.name, c.type]) ?? []),
    [summary]
  );

  const [col1, setCol1] = useState("");
  const [col2, setCol2] = useState("");

  if (!activeData || !summary) return null;

  const resolvedCol1 = col1 || activeData.columns[0] || "";

  return (
    <div className="space-y-6 max-w-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-gray-800">시각화</h2>
        <DataSourceToggle />
      </div>

      {/* column selectors */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">컬럼 (X축 / 단일)</label>
          <select
            value={resolvedCol1}
            onChange={(e) => { setCol1(e.target.value); setCol2(""); }}
            className="border border-gray-200 rounded-md px-3 py-1.5 text-sm bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {activeData.columns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">
            두 번째 컬럼 (산점도 Y축, 선택)
          </label>
          <select
            value={col2}
            onChange={(e) => setCol2(e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-1.5 text-sm bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="">— 선택 안 함 —</option>
            {activeData.columns
              .filter((c) => c !== resolvedCol1)
              .map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
          </select>
        </div>

        <div className="text-xs text-gray-400 self-end pb-2">
          {col2
            ? "산점도"
            : colTypeMap[resolvedCol1] === "numeric"
            ? "히스토그램"
            : colTypeMap[resolvedCol1] === "datetime"
            ? "라인차트 (월별)"
            : "바차트 (빈도)"}
        </div>
      </div>

      {/* chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <ChartArea
          col1={resolvedCol1}
          col2={col2}
          colType={colTypeMap}
          rows={activeData.rows}
          columns={activeData.columns}
        />
      </div>
    </div>
  );
}
