import type { SalesRecord } from "./types";

export const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// ── Weekday × Hour heatmap ────────────────────────────────────────────────────

export interface WeekdayHourMatrix {
  matrix: number[][];
  maxValue: number;
}

export function buildWeekdayHourMatrix(
  records: SalesRecord[],
  metric: "count" | "revenue" = "count"
): WeekdayHourMatrix {
  const matrix: number[][] = Array.from({ length: 7 }, () =>
    new Array(24).fill(0)
  );

  for (const r of records) {
    if (r.isCancelled || r.isFree) continue;
    const val = metric === "count" ? 1 : r.amount;
    matrix[r.weekday][r.hour] += val;
  }

  const maxValue = Math.max(...matrix.flat(), 1);
  return { matrix, maxValue };
}

// ── Weekday stats ─────────────────────────────────────────────────────────────

export interface WeekdayStats {
  weekday: number;
  label: string;
  total: number;
  count: number;
  avg: number;
}

export function computeWeekdayStats(records: SalesRecord[]): WeekdayStats[] {
  const map = new Map<number, { total: number; count: number }>();
  for (let i = 0; i < 7; i++) map.set(i, { total: 0, count: 0 });

  for (const r of records) {
    if (r.isCancelled || r.isFree) continue;
    const e = map.get(r.weekday)!;
    e.total += r.amount;
    e.count++;
  }

  return [...map.entries()].map(([weekday, { total, count }]) => ({
    weekday,
    label: WEEKDAY_LABELS[weekday],
    total,
    count,
    avg: count > 0 ? Math.round(total / count) : 0,
  }));
}

// ── Hourly stats ──────────────────────────────────────────────────────────────

export interface HourlyStats {
  hour: number;
  label: string;
  total: number;
  count: number;
}

export function computeHourlyStats(records: SalesRecord[]): HourlyStats[] {
  const map = new Map<number, { total: number; count: number }>();
  for (let i = 0; i < 24; i++) map.set(i, { total: 0, count: 0 });

  for (const r of records) {
    if (r.isCancelled || r.isFree) continue;
    const e = map.get(r.hour)!;
    e.total += r.amount;
    e.count++;
  }

  return [...map.entries()].map(([hour, { total, count }]) => ({
    hour,
    label: `${String(hour).padStart(2, "0")}시`,
    total,
    count,
  }));
}

// ── Monthly trend with exam period flags ──────────────────────────────────────

export interface MonthlyTrendPoint {
  yearMonth: string;
  total: number;
  count: number;
  examLabel?: string;
  isExamPeriod: boolean;
  isVacation: boolean;
}

const EXAM_MONTHS: Record<number, string> = {
  4: "중간고사",
  6: "기말고사",
  10: "중간고사",
  11: "수능",
  12: "기말고사",
};

const VACATION_MONTHS = new Set([1, 2, 7, 8]);

export function computeMonthlyTrend(
  records: SalesRecord[]
): MonthlyTrendPoint[] {
  const map = new Map<string, { total: number; count: number; month: number }>();

  for (const r of records) {
    if (r.isCancelled || r.isFree) continue;
    const key = r.yearMonth;
    if (!map.has(key)) map.set(key, { total: 0, count: 0, month: r.month });
    const e = map.get(key)!;
    e.total += r.amount;
    e.count++;
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([yearMonth, { total, count, month }]) => ({
      yearMonth,
      total,
      count,
      examLabel: EXAM_MONTHS[month],
      isExamPeriod: !!EXAM_MONTHS[month],
      isVacation: VACATION_MONTHS.has(month),
    }));
}
