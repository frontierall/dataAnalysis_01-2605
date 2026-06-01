import type {
  ParsedData,
  ColumnCleanConfig,
  OutlierConfig,
  OutlierInfo,
} from "./types";

export function isMissing(v: unknown): boolean {
  return v === null || v === undefined || v === "";
}

export function toNumber(v: unknown): number {
  return Number(String(v).replace(/,/g, ""));
}

function mean(nums: number[]): number {
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function mode(values: unknown[]): string {
  const freq = new Map<string, number>();
  for (const v of values) {
    if (!isMissing(v)) {
      const s = String(v);
      freq.set(s, (freq.get(s) ?? 0) + 1);
    }
  }
  if (freq.size === 0) return "";
  return [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function getNumericValues(
  rows: Record<string, unknown>[],
  col: string
): number[] {
  return rows
    .filter((r) => !isMissing(r[col]))
    .map((r) => toNumber(r[col]))
    .filter((n) => !isNaN(n));
}

export interface CleanResult {
  rows: Record<string, unknown>[];
  removedRows: number;
  filledCells: number;
}

export function applyMissingStrategies(
  originalRows: Record<string, unknown>[],
  configs: ColumnCleanConfig[]
): CleanResult {
  const dropCols = new Set(
    configs.filter((c) => c.missingStrategy === "drop").map((c) => c.column)
  );

  const fillValues = new Map<string, string>();
  for (const { column, missingStrategy } of configs) {
    if (missingStrategy === "none" || missingStrategy === "drop") continue;
    if (missingStrategy === "mean" || missingStrategy === "median") {
      const nums = getNumericValues(originalRows, column);
      if (nums.length === 0) continue;
      const val =
        missingStrategy === "mean" ? mean(nums) : median(nums);
      fillValues.set(column, String(parseFloat(val.toFixed(4))));
    } else if (missingStrategy === "mode") {
      const mv = mode(originalRows.map((r) => r[column]));
      if (mv !== "") fillValues.set(column, mv);
    }
  }

  let removedRows = 0;
  let filledCells = 0;
  const rows: Record<string, unknown>[] = [];

  for (const row of originalRows) {
    let dropped = false;
    for (const col of dropCols) {
      if (isMissing(row[col])) {
        dropped = true;
        break;
      }
    }
    if (dropped) {
      removedRows++;
      continue;
    }

    const newRow = { ...row };
    for (const [col, val] of fillValues) {
      if (isMissing(newRow[col])) {
        newRow[col] = val;
        filledCells++;
      }
    }
    rows.push(newRow);
  }

  return { rows, removedRows, filledCells };
}

export function detectOutliers(
  rows: Record<string, unknown>[],
  numericCols: string[],
  config: OutlierConfig
): OutlierInfo[] {
  return numericCols.map((col) => {
    const indexed = rows
      .map((r, i) => ({ val: toNumber(r[col]), i }))
      .filter((x) => !isNaN(x.val) && !isMissing(rows[x.i][col]));
    const nums = indexed.map((x) => x.val);

    if (nums.length < 4) {
      return {
        column: col,
        count: 0,
        indices: [],
        lowerBound: -Infinity,
        upperBound: Infinity,
      };
    }

    let lower: number, upper: number;
    if (config.method === "iqr") {
      const sorted = [...nums].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      lower = q1 - config.threshold * iqr;
      upper = q3 + config.threshold * iqr;
    } else {
      const m = mean(nums);
      const std = Math.sqrt(
        nums.reduce((s, n) => s + (n - m) ** 2, 0) / nums.length
      );
      lower = m - config.threshold * std;
      upper = m + config.threshold * std;
    }

    const outlierIndices = indexed
      .filter((x) => x.val < lower || x.val > upper)
      .map((x) => x.i);

    return {
      column: col,
      count: outlierIndices.length,
      indices: outlierIndices,
      lowerBound: lower,
      upperBound: upper,
    };
  });
}

export function removeOutlierRows(
  rows: Record<string, unknown>[],
  outlierInfos: OutlierInfo[]
): { rows: Record<string, unknown>[]; removedRows: number } {
  const removeSet = new Set(outlierInfos.flatMap((o) => o.indices));
  return {
    rows: rows.filter((_, i) => !removeSet.has(i)),
    removedRows: removeSet.size,
  };
}

export function downloadAsCSV(data: ParsedData, filename: string): void {
  const header = data.columns.join(",");
  const rowLines = data.rows.map((row) =>
    data.columns
      .map((col) => {
        const val = row[col];
        const s = val === null || val === undefined ? "" : String(val);
        return s.includes(",") || s.includes('"') || s.includes("\n")
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      })
      .join(",")
  );
  const csv = [header, ...rowLines].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
