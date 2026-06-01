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
