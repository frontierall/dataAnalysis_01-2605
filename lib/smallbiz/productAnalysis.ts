import type { SalesRecord } from "./types";

// ── Best sellers ──────────────────────────────────────────────────────────────

export interface ProductStats {
  product: string;
  count: number;
  revenue: number;
  avgPrice: number;
  ratio: number;
}

export function computeBestSellers(
  records: SalesRecord[],
  topN = 10
): { byCount: ProductStats[]; byRevenue: ProductStats[] } {
  const map = new Map<string, { count: number; revenue: number }>();

  for (const r of records) {
    if (r.isFree || r.isCancelled) continue;
    const k = r.productName || r.usageType || "기타";
    if (!map.has(k)) map.set(k, { count: 0, revenue: 0 });
    const e = map.get(k)!;
    e.count++;
    e.revenue += r.amount;
  }

  const totalRevenue = [...map.values()].reduce((s, v) => s + v.revenue, 0);

  const list: ProductStats[] = [...map.entries()].map(
    ([product, { count, revenue }]) => ({
      product,
      count,
      revenue,
      avgPrice: count > 0 ? Math.round(revenue / count) : 0,
      ratio: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
    })
  );

  return {
    byCount: [...list].sort((a, b) => b.count - a.count).slice(0, topN),
    byRevenue: [...list].sort((a, b) => b.revenue - a.revenue).slice(0, topN),
  };
}

// ── Category breakdown ────────────────────────────────────────────────────────

export const CATEGORY_LABELS_KR: Record<string, string> = {
  subscription: "정기권(자유석·지정석)",
  charge: "충전권",
  oneTime: "1회권",
  extra: "부가서비스",
  free: "서비스(무료)",
};

export interface CategoryBreakdown {
  category: string;
  label: string;
  count: number;
  revenue: number;
  ratio: number;
}

export function computeUsageCategoryBreakdown(
  records: SalesRecord[]
): CategoryBreakdown[] {
  const map = new Map<string, { count: number; revenue: number }>();
  let freeCount = 0;

  for (const r of records) {
    if (r.isCancelled) continue;
    if (r.isFree) {
      freeCount++;
      continue;
    }
    const cat = r.usageCategory;
    if (!map.has(cat)) map.set(cat, { count: 0, revenue: 0 });
    const e = map.get(cat)!;
    e.count++;
    e.revenue += r.amount;
  }

  const totalRevenue = [...map.values()].reduce((s, v) => s + v.revenue, 0);

  const result: CategoryBreakdown[] = [...map.entries()].map(
    ([category, { count, revenue }]) => ({
      category,
      label: CATEGORY_LABELS_KR[category] ?? category,
      count,
      revenue,
      ratio: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
    })
  );

  if (freeCount > 0) {
    result.push({
      category: "free",
      label: CATEGORY_LABELS_KR.free,
      count: freeCount,
      revenue: 0,
      ratio: 0,
    });
  }

  return result.sort((a, b) => b.revenue - a.revenue);
}

// ── Payment method breakdown ──────────────────────────────────────────────────

export interface PayMethodBreakdown {
  method: string;
  count: number;
  revenue: number;
  ratio: number;
}

export function computePayMethodBreakdown(
  records: SalesRecord[]
): PayMethodBreakdown[] {
  const map = new Map<string, { count: number; revenue: number }>();

  for (const r of records) {
    if (r.isCancelled) continue;
    const method = r.payMethod || "기타";
    if (!map.has(method)) map.set(method, { count: 0, revenue: 0 });
    const e = map.get(method)!;
    e.count++;
    if (!r.isFree) e.revenue += r.amount;
  }

  const totalCount = [...map.values()].reduce((s, v) => s + v.count, 0);

  return [...map.entries()]
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([method, { count, revenue }]) => ({
      method,
      count,
      revenue,
      ratio: totalCount > 0 ? (count / totalCount) * 100 : 0,
    }));
}

// ── Coupon stats ──────────────────────────────────────────────────────────────

export interface CouponStats {
  totalUsed: number;
  totalTransactions: number;
  usageRate: number;
  couponTypes: { name: string; count: number }[];
}

export function computeCouponStats(records: SalesRecord[]): CouponStats {
  const totalTransactions = records.filter(
    (r) => !r.isCancelled && !r.isFree
  ).length;
  const couponRows = records.filter((r) => !r.isCancelled && r.coupon);

  const typeMap = new Map<string, number>();
  for (const r of couponRows) {
    const name = r.coupon!;
    typeMap.set(name, (typeMap.get(name) ?? 0) + 1);
  }

  return {
    totalUsed: couponRows.length,
    totalTransactions,
    usageRate:
      totalTransactions > 0 ? (couponRows.length / totalTransactions) * 100 : 0,
    couponTypes: [...typeMap.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count })),
  };
}

// ── Price distribution ────────────────────────────────────────────────────────

export interface PriceBucket {
  label: string;
  min: number;
  max: number;
  count: number;
}

export function computePriceDistribution(records: SalesRecord[]): PriceBucket[] {
  const buckets: { label: string; min: number; max: number }[] = [
    { label: "~5천", min: 0, max: 5000 },
    { label: "5천~1만", min: 5000, max: 10000 },
    { label: "1만~3만", min: 10000, max: 30000 },
    { label: "3만~5만", min: 30000, max: 50000 },
    { label: "5만~10만", min: 50000, max: 100000 },
    { label: "10만~20만", min: 100000, max: 200000 },
    { label: "20만 초과", min: 200000, max: Infinity },
  ];

  const counts = new Array(buckets.length).fill(0);

  for (const r of records) {
    if (r.isFree || r.isCancelled || r.amount <= 0) continue;
    const idx = buckets.findIndex((b) => r.amount >= b.min && r.amount < b.max);
    if (idx >= 0) counts[idx]++;
  }

  return buckets.map((b, i) => ({ ...b, count: counts[i] }));
}

// ── Product summary ───────────────────────────────────────────────────────────

export interface ProductSummary {
  topProduct: string;
  subscriptionRatio: number;
  couponUsageRate: number;
  freeServiceCount: number;
}

export function computeProductSummary(records: SalesRecord[]): ProductSummary {
  const sellers = computeBestSellers(records, 1);
  const topProduct = sellers.byRevenue[0]?.product ?? "-";

  const catBreakdown = computeUsageCategoryBreakdown(records);
  const totalRevenue = catBreakdown.reduce((s, c) => s + c.revenue, 0);
  const subRevenue =
    catBreakdown.find((c) => c.category === "subscription")?.revenue ?? 0;
  const subscriptionRatio =
    totalRevenue > 0 ? (subRevenue / totalRevenue) * 100 : 0;

  const couponStats = computeCouponStats(records);
  const freeServiceCount = records.filter(
    (r) => r.isFree && !r.isCancelled
  ).length;

  return {
    topProduct,
    subscriptionRatio,
    couponUsageRate: couponStats.usageRate,
    freeServiceCount,
  };
}
