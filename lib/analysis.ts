import type { ColumnStats, ColumnType, DatasetSummary } from "./types";

// ── 타입 판별 ─────────────────────────────────────────────────────────────────

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?/,
  /^\d{2}\/\d{2}\/\d{4}/,
  /^\d{4}\/\d{2}\/\d{2}/,
  /^\d{4}\.\d{2}\.\d{2}/,
];

function isDateString(val: string): boolean {
  if (!DATE_PATTERNS.some((p) => p.test(val))) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
}

function isNumericString(val: string): boolean {
  return val.trim() !== "" && !isNaN(Number(val.replace(/,/g, "")));
}

function distributedSample(arr: string[], n: number): string[] {
  if (arr.length <= n) return arr;
  const step = arr.length / n;
  return Array.from({ length: n }, (_, i) => arr[Math.floor(i * step)]);
}

/** 컬럼의 비-결측 샘플을 기반으로 타입을 판별합니다. */
export function inferColumnType(
  values: unknown[],
  uniqueCount: number
): ColumnType {
  const nonNull = values
    .filter((v) => v !== null && v !== undefined && v !== "")
    .map((v) => String(v));

  if (nonNull.length === 0) return "unknown";

  const sample = distributedSample(nonNull, 200);

  const numericCount = sample.filter(isNumericString).length;
  if (numericCount / sample.length >= 0.9) return "numeric";

  const dateCount = sample.filter(isDateString).length;
  if (dateCount / sample.length >= 0.8) return "datetime";

  // 고유값이 전체의 50% 미만이고 20개 이하이면 범주형으로 판별
  if (uniqueCount <= 20 || uniqueCount / values.length < 0.5)
    return "categorical";

  return "categorical";
}

// ── 통계 계산 ─────────────────────────────────────────────────────────────────

function computeNumericRange(values: unknown[]): string {
  const nums = values
    .filter((v) => v !== null && v !== undefined && v !== "")
    .map((v) => Number(String(v).replace(/,/g, "")))
    .filter((n) => !isNaN(n));

  if (nums.length === 0) return "-";
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const avg = nums.reduce((s, n) => s + n, 0) / nums.length;

  const fmt = (n: number) =>
    Math.abs(n) >= 1000
      ? n.toLocaleString("ko-KR", { maximumFractionDigits: 2 })
      : n.toFixed(2).replace(/\.?0+$/, "");

  return `${fmt(min)} ~ ${fmt(max)} (평균 ${fmt(avg)})`;
}

function computeDateRange(values: unknown[]): string {
  const dates = values
    .filter((v) => v !== null && v !== undefined && v !== "")
    .map((v) => new Date(String(v)))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length === 0) return "-";
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return `${fmt(dates[0])} ~ ${fmt(dates[dates.length - 1])}`;
}

function topExamples(values: unknown[], n = 5): string[] {
  const freq = new Map<string, number>();
  for (const v of values) {
    if (v === null || v === undefined || v === "") continue;
    const s = String(v);
    freq.set(s, (freq.get(s) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

// ── 공개 API ──────────────────────────────────────────────────────────────────

export function computeColumnStats(
  name: string,
  values: unknown[]
): ColumnStats {
  const total = values.length;
  const missingCount = values.filter(
    (v) => v === null || v === undefined || v === ""
  ).length;
  const missingRatio = total > 0 ? missingCount / total : 0;

  const uniqueValues = new Set(
    values
      .filter((v) => v !== null && v !== undefined && v !== "")
      .map(String)
  );
  const uniqueCount = uniqueValues.size;

  const type = inferColumnType(values, uniqueCount);

  let range = "";
  let examples: string[] = [];

  if (type === "numeric") {
    range = computeNumericRange(values);
  } else if (type === "datetime") {
    range = computeDateRange(values);
  } else {
    examples = topExamples(values);
  }

  return { name, type, uniqueCount, missingCount, missingRatio, range, examples };
}

export function computeDatasetSummary(
  columns: string[],
  rows: Record<string, unknown>[]
): DatasetSummary {
  const columnStats = columns.map((col) =>
    computeColumnStats(col, rows.map((r) => r[col]))
  );

  const totalMissing = columnStats.reduce((s, c) => s + c.missingCount, 0);
  const totalCells = rows.length * columns.length;
  const missingRatio = totalCells > 0 ? totalMissing / totalCells : 0;

  return {
    rowCount: rows.length,
    columnCount: columns.length,
    totalMissing,
    missingRatio,
    columns: columnStats,
  };
}
