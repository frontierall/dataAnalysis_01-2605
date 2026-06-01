export interface ParsedData {
  columns: string[];
  rows: Record<string, unknown>[];
  fileName: string;
  fileSize: number;
}

export type ColumnType = "numeric" | "categorical" | "datetime" | "unknown";

export interface ColumnStats {
  name: string;
  type: ColumnType;
  uniqueCount: number;
  missingCount: number;
  missingRatio: number;
  range: string;
  examples: string[];
}

export interface DatasetSummary {
  rowCount: number;
  columnCount: number;
  totalMissing: number;
  missingRatio: number;
  columns: ColumnStats[];
}

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  requiresData: boolean;
}

// ── Cleaning ──────────────────────────────────────────────────────────────────

export type MissingStrategy = "none" | "drop" | "mean" | "median" | "mode";

export interface ColumnCleanConfig {
  column: string;
  missingStrategy: MissingStrategy;
}

export interface OutlierConfig {
  method: "iqr" | "zscore";
  threshold: number;
  remove: boolean;
}

export interface OutlierInfo {
  column: string;
  count: number;
  indices: number[];
  lowerBound: number;
  upperBound: number;
}

// ── Correlation ───────────────────────────────────────────────────────────────

export interface CorrelationMatrix {
  columns: string[];
  matrix: number[][];
  sampleCounts: number[][];
}
