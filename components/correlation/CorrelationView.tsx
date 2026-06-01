"use client";

import { useState, useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useDataStore } from "@/store/dataStore";
import { computeDatasetSummary } from "@/lib/analysis";
import { computeCorrelationMatrix, corrColor } from "@/lib/correlation";
import { isMissing, toNumber } from "@/lib/cleaning";
import { sampleArray } from "@/lib/utils";

const SCATTER_SAMPLE = 1500;

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

function ColorScaleLegend() {
  const stops = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1];
  return (
    <div className="flex items-center gap-1 text-xs text-gray-500">
      <span>-1</span>
      <div
        className="h-4 rounded"
        style={{
          width: 180,
          background: `linear-gradient(to right, ${corrColor(-1)}, ${corrColor(
            0
          )}, ${corrColor(1)})`,
        }}
      />
      <span>+1</span>
      <span className="ml-2 text-gray-400">|</span>
      <span className="ml-2 text-gray-400">회색: 계산 불가</span>
    </div>
  );
}

export default function CorrelationView() {
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

  const numericCols = useMemo(
    () =>
      summary?.columns
        .filter((c) => c.type === "numeric")
        .map((c) => c.name) ?? [],
    [summary]
  );

  const [selectedCols, setSelectedCols] = useState<Set<string>>(
    () => new Set()
  );
  const [computed, setComputed] = useState(false);
  const [selectedPair, setSelectedPair] = useState<[string, string] | null>(
    null
  );

  const activeCols = useMemo(
    () =>
      numericCols.filter((c) =>
        selectedCols.size === 0 ? true : selectedCols.has(c)
      ),
    [numericCols, selectedCols]
  );

  const corrMatrix = useMemo(() => {
    if (!activeData || !computed || activeCols.length < 2) return null;
    return computeCorrelationMatrix(activeCols, activeData.rows);
  }, [activeData, activeCols, computed]);

  const scatterData = useMemo(() => {
    if (!selectedPair || !activeData) return [];
    const [c1, c2] = selectedPair;
    const raw = activeData.rows
      .filter((r) => !isMissing(r[c1]) && !isMissing(r[c2]))
      .map((r) => ({ x: toNumber(r[c1]), y: toNumber(r[c2]) }))
      .filter((p) => !isNaN(p.x) && !isNaN(p.y));
    return sampleArray(raw, SCATTER_SAMPLE);
  }, [selectedPair, activeData]);

  if (!activeData || !summary) return null;

  const toggleCol = (col: string) => {
    setSelectedCols((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
    setComputed(false);
  };

  const allSelected =
    selectedCols.size === 0 || selectedCols.size === numericCols.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedCols(new Set());
    } else {
      setSelectedCols(new Set(numericCols));
    }
    setComputed(false);
  };

  return (
    <div className="space-y-6 max-w-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-gray-800">상관관계 분석</h2>
        <DataSourceToggle />
      </div>

      {numericCols.length < 2 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-10 text-center text-gray-400">
          수치형 컬럼이 2개 이상 필요합니다.
        </div>
      ) : (
        <>
          {/* column selector */}
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">
                분석할 수치형 컬럼 선택
              </span>
              <button
                onClick={toggleAll}
                className="text-xs text-blue-500 hover:underline"
              >
                {allSelected ? "전체 선택" : "전체 해제"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {numericCols.map((col) => {
                const active =
                  selectedCols.size === 0 || selectedCols.has(col);
                return (
                  <button
                    key={col}
                    onClick={() => toggleCol(col)}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                      active
                        ? "bg-blue-50 border-blue-300 text-blue-700"
                        : "bg-gray-50 border-gray-200 text-gray-400"
                    }`}
                  >
                    {col}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              선택 없이 계산하면 전체 {numericCols.length}개 컬럼 사용
            </p>
          </section>

          {/* compute button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setComputed(true);
                setSelectedPair(null);
              }}
              disabled={activeCols.length < 2}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium transition-colors"
            >
              상관계수 계산
            </button>
            {corrMatrix && (
              <span className="text-xs text-gray-400">
                Pearson 상관계수 — pairwise deletion (컬럼 쌍마다 유효 행 사용)
              </span>
            )}
          </div>

          {/* heatmap */}
          {corrMatrix && (
            <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm font-medium text-gray-700">
                  상관계수 히트맵
                </span>
                <ColorScaleLegend />
              </div>

              <div className="overflow-x-auto">
                <table className="border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="w-4" />
                      {corrMatrix.columns.map((c) => (
                        <th
                          key={c}
                          className="px-1 pb-1 text-gray-500 font-normal text-center max-w-[80px]"
                          style={{ writingMode: "vertical-lr", transform: "rotate(180deg)" }}
                        >
                          <span
                            className="block max-h-[100px] overflow-hidden"
                            title={c}
                          >
                            {c}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {corrMatrix.columns.map((rowCol, i) => (
                      <tr key={rowCol}>
                        <td
                          className="pr-2 text-right text-gray-500 font-normal whitespace-nowrap max-w-[120px] truncate"
                          title={rowCol}
                        >
                          {rowCol}
                        </td>
                        {corrMatrix.columns.map((colCol, j) => {
                          const r = corrMatrix.matrix[i][j];
                          const n = corrMatrix.sampleCounts[i][j];
                          const isSelected =
                            selectedPair?.[0] === rowCol &&
                            selectedPair?.[1] === colCol;
                          const isDiag = i === j;

                          return (
                            <td
                              key={colCol}
                              onClick={() =>
                                !isDiag &&
                                setSelectedPair(
                                  isSelected ? null : [rowCol, colCol]
                                )
                              }
                              title={
                                isDiag
                                  ? rowCol
                                  : `${rowCol} × ${colCol}\nr = ${isNaN(r) ? "N/A" : r.toFixed(3)}\nn = ${n.toLocaleString()}`
                              }
                              style={{ backgroundColor: corrColor(r) }}
                              className={`w-12 h-10 text-center border border-white/60 transition-opacity ${
                                isDiag
                                  ? "cursor-default"
                                  : "cursor-pointer hover:opacity-80"
                              } ${isSelected ? "ring-2 ring-blue-500 ring-inset" : ""}`}
                            >
                              <span
                                className={`font-medium ${
                                  !isNaN(r) && Math.abs(r) > 0.5
                                    ? "text-white"
                                    : "text-gray-700"
                                }`}
                              >
                                {isNaN(r) ? "—" : r.toFixed(2)}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-gray-400">
                셀 클릭 → 해당 두 컬럼의 산점도 확인
              </p>
            </section>
          )}

          {/* scatter panel */}
          {selectedPair && (
            <section className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  {selectedPair[0]} × {selectedPair[1]}
                </span>
                <div className="text-xs text-gray-400">
                  {scatterData.length < SCATTER_SAMPLE
                    ? `${scatterData.length.toLocaleString()}개 점`
                    : `${SCATTER_SAMPLE.toLocaleString()}개 샘플링`}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="x"
                    name={selectedPair[0]}
                    tick={{ fontSize: 11 }}
                    label={{
                      value: selectedPair[0],
                      position: "insideBottom",
                      offset: -10,
                      fontSize: 12,
                    }}
                  />
                  <YAxis
                    dataKey="y"
                    name={selectedPair[1]}
                    tick={{ fontSize: 11 }}
                    label={{
                      value: selectedPair[1],
                      angle: -90,
                      position: "insideLeft",
                      fontSize: 12,
                    }}
                  />
                  <ZAxis range={[15, 15]} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    formatter={(v, name) => [
                      typeof v === "number"
                        ? v.toLocaleString("ko-KR", { maximumFractionDigits: 2 })
                        : v,
                      name,
                    ]}
                  />
                  <Scatter data={scatterData} fill="#3b82f6" fillOpacity={0.5} />
                </ScatterChart>
              </ResponsiveContainer>
            </section>
          )}
        </>
      )}
    </div>
  );
}
