"use client";

import { useState, useMemo } from "react";
import { useDataStore } from "@/store/dataStore";
import { computeDatasetSummary } from "@/lib/analysis";
import {
  applyMissingStrategies,
  detectOutliers,
  removeOutlierRows,
  downloadAsCSV,
} from "@/lib/cleaning";
import type {
  ColumnCleanConfig,
  OutlierConfig,
  OutlierInfo,
  MissingStrategy,
} from "@/lib/types";

const STRATEGY_LABELS: Record<MissingStrategy, string> = {
  none: "처리 안 함",
  drop: "행 삭제",
  mean: "평균값 대체",
  median: "중앙값 대체",
  mode: "최빈값 대체",
};

function DataSourceBadge() {
  const { cleanedData, activeDataSource } = useDataStore();
  if (!cleanedData) return null;
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        activeDataSource === "cleaned"
          ? "bg-green-100 text-green-700"
          : "bg-gray-100 text-gray-500"
      }`}
    >
      {activeDataSource === "cleaned" ? "정제 데이터 적용됨" : "원본 데이터"}
    </span>
  );
}

export default function DataCleaning() {
  const { data, setCleanedData, cleanedData, clearCleanedData } =
    useDataStore();

  const summary = useMemo(
    () => (data ? computeDatasetSummary(data.columns, data.rows) : null),
    [data]
  );

  const missingCols = useMemo(
    () => summary?.columns.filter((c) => c.missingCount > 0) ?? [],
    [summary]
  );

  const numericCols = useMemo(
    () =>
      summary?.columns.filter((c) => c.type === "numeric").map((c) => c.name) ??
      [],
    [summary]
  );

  const [configs, setConfigs] = useState<Record<string, MissingStrategy>>({});
  const [outlierCfg, setOutlierCfg] = useState<OutlierConfig>({
    method: "iqr",
    threshold: 1.5,
    remove: false,
  });
  const [outlierResults, setOutlierResults] = useState<OutlierInfo[] | null>(
    null
  );
  const [applied, setApplied] = useState(false);

  if (!data || !summary) return null;

  const getStrategy = (col: string): MissingStrategy =>
    configs[col] ?? "none";

  const setStrategy = (col: string, s: MissingStrategy) =>
    setConfigs((prev) => ({ ...prev, [col]: s }));

  function handleDetectOutliers() {
    if (!data) return;
    const results = detectOutliers(data.rows, numericCols, outlierCfg);
    setOutlierResults(results);
  }

  function handleApply() {
    if (!data) return;

    const cleanConfigs: ColumnCleanConfig[] = missingCols.map((col) => ({
      column: col.name,
      missingStrategy: getStrategy(col.name),
    }));

    const { rows: afterMissing, removedRows, filledCells } =
      applyMissingStrategies(data.rows, cleanConfigs);

    let finalRows = afterMissing;
    let outlierRemoved = 0;

    if (outlierCfg.remove && outlierResults) {
      const { rows, removedRows: r } = removeOutlierRows(
        afterMissing,
        outlierResults
      );
      finalRows = rows;
      outlierRemoved = r;
    }

    const cleaned = {
      ...data,
      rows: finalRows,
      fileName: `[정제] ${data.fileName}`,
    };

    setCleanedData(cleaned);
    setApplied(true);

    const summary = [
      removedRows > 0 ? `행 삭제 ${removedRows}개` : null,
      filledCells > 0 ? `결측치 대체 ${filledCells}개` : null,
      outlierRemoved > 0 ? `이상치 행 삭제 ${outlierRemoved}개` : null,
    ]
      .filter(Boolean)
      .join(", ");

    alert(
      summary
        ? `정제 완료: ${summary}\n최종 행 수: ${finalRows.length.toLocaleString()}개`
        : "처리할 내용이 없습니다. 전략을 선택해 주세요."
    );
  }

  function handleDownload() {
    const target = cleanedData ?? data;
    if (!target) return;
    downloadAsCSV(target, target.fileName.replace(/\.(xlsx?|csv)$/i, "") + "_cleaned.csv");
  }

  const totalOutliers =
    outlierResults?.reduce((s, r) => s + r.count, 0) ?? 0;

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-800">데이터 정제</h2>
        <DataSourceBadge />
      </div>

      {/* ── 1. 결측치 처리 ── */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="font-medium text-gray-700 text-sm">결측치 처리</span>
          <span className="text-xs text-gray-400">
            결측치 있는 컬럼 {missingCols.length}개
          </span>
        </div>

        {missingCols.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-green-600">
            결측치가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-2 text-left">컬럼명</th>
                  <th className="px-4 py-2 text-left">타입</th>
                  <th className="px-4 py-2 text-right">결측치</th>
                  <th className="px-4 py-2 text-left">처리 방법</th>
                </tr>
              </thead>
              <tbody>
                {missingCols.map((col, i) => {
                  const isNumeric = col.type === "numeric";
                  const strategies: MissingStrategy[] = isNumeric
                    ? ["none", "drop", "mean", "median", "mode"]
                    : ["none", "drop", "mode"];

                  return (
                    <tr
                      key={col.name}
                      className={`border-b border-gray-100 ${
                        i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                      }`}
                    >
                      <td className="px-4 py-2 font-medium text-gray-800 max-w-[160px] truncate">
                        {col.name}
                      </td>
                      <td className="px-4 py-2 text-gray-500 text-xs">
                        {col.type === "numeric"
                          ? "연속형"
                          : col.type === "categorical"
                          ? "범주형"
                          : col.type === "datetime"
                          ? "날짜형"
                          : "알 수 없음"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className="text-yellow-700 font-medium">
                          {col.missingCount.toLocaleString()}
                        </span>
                        <span className="text-gray-400 text-xs ml-1">
                          ({(col.missingRatio * 100).toFixed(1)}%)
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={getStrategy(col.name)}
                          onChange={(e) =>
                            setStrategy(
                              col.name,
                              e.target.value as MissingStrategy
                            )
                          }
                          className="border border-gray-200 rounded-md px-2 py-1 text-xs bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        >
                          {strategies.map((s) => (
                            <option key={s} value={s}>
                              {STRATEGY_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── 2. 이상치 탐지 ── */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <span className="font-medium text-gray-700 text-sm">이상치 탐지</span>
          <span className="text-xs text-gray-400 ml-2">
            수치형 컬럼 {numericCols.length}개 대상
          </span>
        </div>

        {numericCols.length === 0 ? (
          <div className="px-5 py-6 text-sm text-gray-400">
            수치형 컬럼이 없습니다.
          </div>
        ) : (
          <div className="px-5 py-4 space-y-4">
            {/* Config row */}
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">탐지 방법</label>
                <div className="flex gap-3">
                  {(["iqr", "zscore"] as const).map((m) => (
                    <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={outlierCfg.method === m}
                        onChange={() =>
                          setOutlierCfg((p) => ({
                            ...p,
                            method: m,
                            threshold: m === "iqr" ? 1.5 : 3,
                          }))
                        }
                      />
                      <span className="text-sm text-gray-700">
                        {m === "iqr" ? "IQR" : "Z-score"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">
                  임계값{" "}
                  <span className="text-gray-400">
                    ({outlierCfg.method === "iqr"
                      ? "IQR 배수"
                      : "표준편차 배수"})
                  </span>
                </label>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={outlierCfg.threshold}
                  onChange={(e) =>
                    setOutlierCfg((p) => ({
                      ...p,
                      threshold: parseFloat(e.target.value) || 1.5,
                    }))
                  }
                  className="border border-gray-200 rounded-md px-3 py-1.5 text-sm w-24 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 invisible">옵션</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={outlierCfg.remove}
                    onChange={(e) =>
                      setOutlierCfg((p) => ({ ...p, remove: e.target.checked }))
                    }
                  />
                  <span className="text-sm text-gray-700">이상치 행 삭제</span>
                </label>
              </div>

              <button
                onClick={handleDetectOutliers}
                className="px-4 py-1.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors"
              >
                이상치 탐지
              </button>
            </div>

            {/* Detection results */}
            {outlierResults && (
              <div>
                <div className="text-xs text-gray-500 mb-2">
                  탐지 결과 — 총{" "}
                  <span className="font-semibold text-orange-600">
                    {totalOutliers.toLocaleString()}
                  </span>
                  개 이상치
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-t border-gray-100">
                    <thead>
                      <tr className="text-xs text-gray-500 uppercase tracking-wide">
                        <th className="px-4 py-2 text-left">컬럼</th>
                        <th className="px-4 py-2 text-right">이상치 수</th>
                        <th className="px-4 py-2 text-left">하한</th>
                        <th className="px-4 py-2 text-left">상한</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outlierResults.map((r) => (
                        <tr
                          key={r.column}
                          className="border-t border-gray-100"
                        >
                          <td className="px-4 py-1.5 text-gray-800 max-w-[160px] truncate">
                            {r.column}
                          </td>
                          <td className="px-4 py-1.5 text-right">
                            {r.count > 0 ? (
                              <span className="text-orange-600 font-medium">
                                {r.count.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                          <td className="px-4 py-1.5 text-gray-600 text-xs">
                            {isFinite(r.lowerBound)
                              ? r.lowerBound.toLocaleString("ko-KR", {
                                  maximumFractionDigits: 2,
                                })
                              : "-"}
                          </td>
                          <td className="px-4 py-1.5 text-gray-600 text-xs">
                            {isFinite(r.upperBound)
                              ? r.upperBound.toLocaleString("ko-KR", {
                                  maximumFractionDigits: 2,
                                })
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── 3. 적용 & 다운로드 ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={handleApply}
          className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          정제 데이터 적용 및 저장
        </button>

        <button
          onClick={handleDownload}
          className="px-5 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
        >
          CSV 다운로드
        </button>

        {cleanedData && (
          <button
            onClick={() => {
              clearCleanedData();
              setApplied(false);
              setOutlierResults(null);
              setConfigs({});
            }}
            className="px-4 py-2 rounded-lg text-red-500 hover:bg-red-50 text-sm transition-colors"
          >
            정제 초기화
          </button>
        )}

        {applied && cleanedData && (
          <span className="text-xs text-green-600">
            저장 완료 — {cleanedData.rows.length.toLocaleString()}행
            (원본 {data.rows.length.toLocaleString()}행)
          </span>
        )}
      </div>
    </div>
  );
}
