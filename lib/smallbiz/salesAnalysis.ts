import type {
  SalesRecord,
  SmallBizColumnMap,
  TxType,
  UsageCategory,
} from "./types";

function parseDate(val: unknown): Date | null {
  if (!val) return null;
  const s = String(val).trim().replace(" ", "T");
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function getWeekStart(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function classifyTxType(val: string): TxType {
  if (val === "취소") return "cancel";
  if (val === "환불") return "refund";
  if (val === "예약") return "reservation";
  return "purchase";
}

function classifyUsageCategory(usageType: string): UsageCategory {
  if (usageType === "1회권") return "oneTime";
  if (usageType === "충전권") return "charge";
  if (usageType === "자유석" || usageType === "지정석") return "subscription";
  return "extra";
}

export function parseSalesRecords(
  rows: Record<string, unknown>[],
  colMap: SmallBizColumnMap
): SalesRecord[] {
  const records: SalesRecord[] = [];

  for (const row of rows) {
    const dt = parseDate(row[colMap.datetime]);
    if (!dt) continue;

    const amount = Number(row[colMap.amount]) || 0;
    const txTypeRaw = String(row[colMap.txType] ?? "").trim();
    const usageType = colMap.usageType
      ? String(row[colMap.usageType] ?? "").trim()
      : "";
    const txType = classifyTxType(txTypeRaw);
    const isCancelled = txType === "cancel" || txType === "refund";
    const payMethod = colMap.payMethod
      ? String(row[colMap.payMethod] ?? "").trim()
      : "";
    const isFree = payMethod === "서비스";
    const couponRaw = colMap.coupon ? row[colMap.coupon] : null;

    records.push({
      datetime: dt,
      year: dt.getFullYear(),
      month: dt.getMonth() + 1,
      weekStart: getWeekStart(dt),
      weekday: dt.getDay(),
      hour: dt.getHours(),
      yearMonth: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`,
      memberName: String(row[colMap.memberName] ?? "").trim(),
      txType,
      usageType,
      usageCategory: classifyUsageCategory(usageType),
      productName: colMap.productName
        ? String(row[colMap.productName] ?? "").trim()
        : "",
      amount,
      payMethod,
      isFree,
      isCancelled,
      coupon: couponRaw ? String(couponRaw) : null,
    });
  }

  return records;
}

// ── Period grouping ───────────────────────────────────────────────────────────

export type Period = "day" | "week" | "month" | "year";

export interface PeriodSales {
  label: string;
  grossRevenue: number;
  netRevenue: number;
  count: number;
  cancelAmount: number;
  cancelCount: number;
  freeCount: number;
}

function getPeriodLabel(r: SalesRecord, period: Period): string {
  if (period === "day") return r.datetime.toISOString().slice(0, 10);
  if (period === "week") return r.weekStart;
  if (period === "month") return r.yearMonth;
  return String(r.year);
}

export function groupByPeriod(
  records: SalesRecord[],
  period: Period
): PeriodSales[] {
  const map = new Map<string, PeriodSales>();

  for (const r of records) {
    const label = getPeriodLabel(r, period);
    if (!map.has(label)) {
      map.set(label, {
        label,
        grossRevenue: 0,
        netRevenue: 0,
        count: 0,
        cancelAmount: 0,
        cancelCount: 0,
        freeCount: 0,
      });
    }
    const e = map.get(label)!;

    if (r.isFree) {
      e.freeCount++;
    } else if (r.isCancelled) {
      e.cancelAmount += Math.abs(r.amount);
      e.cancelCount++;
    } else {
      e.grossRevenue += r.amount;
      e.count++;
    }
    e.netRevenue = e.grossRevenue - e.cancelAmount;
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

// ── YoY ───────────────────────────────────────────────────────────────────────

export interface YoYData {
  year: number;
  total: number;
  prevTotal: number;
  growth: number | null;
}

export function computeYoY(records: SalesRecord[]): YoYData[] {
  const yearMap = new Map<number, number>();

  for (const r of records) {
    if (r.isFree || r.isCancelled) continue;
    yearMap.set(r.year, (yearMap.get(r.year) ?? 0) + r.amount);
  }

  const years = [...yearMap.keys()].sort();
  return years.map((year, i) => {
    const total = yearMap.get(year) ?? 0;
    const prevTotal = i > 0 ? (yearMap.get(years[i - 1]) ?? 0) : 0;
    const growth =
      i > 0 && prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;
    return { year, total, prevTotal, growth };
  });
}

// ── Category breakdown ────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<string, string> = {
  subscription: "정기권",
  charge: "충전권",
  oneTime: "1회권",
  extra: "부가서비스",
};

export interface CategorySales {
  category: string;
  label: string;
  total: number;
  count: number;
  ratio: number;
}

export function computeSalesByCategory(records: SalesRecord[]): CategorySales[] {
  const map = new Map<string, { total: number; count: number }>();

  for (const r of records) {
    if (r.isFree || r.isCancelled) continue;
    const cat = r.usageCategory;
    if (!map.has(cat)) map.set(cat, { total: 0, count: 0 });
    const e = map.get(cat)!;
    e.total += r.amount;
    e.count++;
  }

  const totalRevenue = [...map.values()].reduce((s, v) => s + v.total, 0);

  return [...map.entries()]
    .sort(([, a], [, b]) => b.total - a.total)
    .map(([category, { total, count }]) => ({
      category,
      label: CATEGORY_LABELS[category] ?? category,
      total,
      count,
      ratio: totalRevenue > 0 ? (total / totalRevenue) * 100 : 0,
    }));
}

// ── ATV trend ─────────────────────────────────────────────────────────────────

export interface ATVPoint {
  label: string;
  atv: number;
  count: number;
}

export function computeATVTrend(
  records: SalesRecord[],
  period: "month" | "year" = "month"
): ATVPoint[] {
  const map = new Map<string, { total: number; count: number }>();

  for (const r of records) {
    if (r.isFree || r.isCancelled) continue;
    const label = period === "month" ? r.yearMonth : String(r.year);
    if (!map.has(label)) map.set(label, { total: 0, count: 0 });
    const e = map.get(label)!;
    e.total += r.amount;
    e.count++;
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, { total, count }]) => ({
      label,
      atv: count > 0 ? Math.round(total / count) : 0,
      count,
    }));
}

// ── Summary ───────────────────────────────────────────────────────────────────

export interface SalesSummary {
  grossRevenue: number;
  netRevenue: number;
  totalTransactions: number;
  avgTransactionValue: number;
  cancelCount: number;
  cancelRate: number;
  freeServiceCount: number;
}

export function computeSalesSummary(records: SalesRecord[]): SalesSummary {
  let grossRevenue = 0;
  let totalTransactions = 0;
  let cancelAmount = 0;
  let cancelCount = 0;
  let freeServiceCount = 0;

  for (const r of records) {
    if (r.isFree) {
      freeServiceCount++;
    } else if (r.isCancelled) {
      cancelAmount += Math.abs(r.amount);
      cancelCount++;
    } else {
      grossRevenue += r.amount;
      totalTransactions++;
    }
  }

  return {
    grossRevenue,
    netRevenue: grossRevenue - cancelAmount,
    totalTransactions,
    avgTransactionValue:
      totalTransactions > 0 ? Math.round(grossRevenue / totalTransactions) : 0,
    cancelCount,
    cancelRate:
      totalTransactions > 0
        ? (cancelCount / (totalTransactions + cancelCount)) * 100
        : 0,
    freeServiceCount,
  };
}
