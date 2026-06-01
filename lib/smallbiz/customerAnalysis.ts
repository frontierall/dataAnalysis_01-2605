import type {
  SalesRecord,
  CustomerProfile,
  RFMScore,
  RFMSegment,
} from "./types";

// ── Customer profiles ─────────────────────────────────────────────────────────

export function buildCustomerProfiles(
  records: SalesRecord[]
): Map<string, CustomerProfile> {
  const profiles = new Map<string, CustomerProfile>();

  for (const r of records) {
    if (!r.memberName) continue;

    if (!profiles.has(r.memberName)) {
      profiles.set(r.memberName, {
        name: r.memberName,
        totalVisits: 0,
        totalSpend: 0,
        freeVisits: 0,
        firstVisit: r.datetime,
        lastVisit: r.datetime,
        usageTypes: new Set(),
        monthlyActivity: new Map(),
      });
    }

    const p = profiles.get(r.memberName)!;
    if (r.datetime < p.firstVisit) p.firstVisit = r.datetime;
    if (r.datetime > p.lastVisit) p.lastVisit = r.datetime;

    if (r.isFree) {
      p.freeVisits++;
    } else if (!r.isCancelled) {
      p.totalVisits++;
      p.totalSpend += r.amount;
      if (r.usageType) p.usageTypes.add(r.usageType);

      const ma = p.monthlyActivity.get(r.yearMonth) ?? { visits: 0, spend: 0 };
      ma.visits++;
      ma.spend += r.amount;
      p.monthlyActivity.set(r.yearMonth, ma);
    }
  }

  return profiles;
}

// ── RFM scoring ───────────────────────────────────────────────────────────────

function quintileScore(
  value: number,
  sorted: number[],
  higherIsBetter: boolean
): number {
  if (sorted.length === 0) return 3;
  const rank = sorted.filter((v) => v <= value).length;
  const pct = rank / sorted.length;
  const raw = Math.ceil(pct * 5) || 1;
  return higherIsBetter ? raw : 6 - raw;
}

export function computeRFM(
  profiles: Map<string, CustomerProfile>,
  referenceDate: Date = new Date()
): RFMScore[] {
  const list = [...profiles.values()].filter((p) => p.totalVisits > 0);
  if (list.length === 0) return [];

  const now = referenceDate.getTime();
  const recencies = list.map((p) =>
    Math.floor((now - p.lastVisit.getTime()) / 86400000)
  );
  const frequencies = list.map((p) => p.totalVisits);
  const monetaries = list.map((p) => p.totalSpend);

  const sortedR = [...recencies].sort((a, b) => a - b);
  const sortedF = [...frequencies].sort((a, b) => a - b);
  const sortedM = [...monetaries].sort((a, b) => a - b);

  return list.map((p, i) => {
    const recencyDays = recencies[i];
    const frequency = frequencies[i];
    const monetary = monetaries[i];

    const rScore = quintileScore(recencyDays, sortedR, false);
    const fScore = quintileScore(frequency, sortedF, true);
    const mScore = quintileScore(monetary, sortedM, true);

    const daysSinceFirst = Math.floor(
      (now - p.firstVisit.getTime()) / 86400000
    );

    let segment: RFMSegment;
    if (daysSinceFirst <= 30) {
      segment = "new";
    } else if (recencyDays > 180) {
      segment = "dormant";
    } else if (recencyDays > 90 && fScore >= 3) {
      segment = "churnRisk";
    } else if (rScore >= 4 && fScore >= 4 && mScore >= 4) {
      segment = "VIP";
    } else if (fScore >= 3 && mScore >= 3) {
      segment = "loyal";
    } else {
      segment = "potential";
    }

    return { name: p.name, recencyDays, frequency, monetary, rScore, fScore, mScore, segment };
  });
}

export const RFM_SEGMENT_LABELS: Record<RFMSegment, string> = {
  VIP: "VIP",
  loyal: "충성",
  potential: "잠재",
  new: "신규",
  churnRisk: "이탈위험",
  dormant: "휴면",
};

export const RFM_SEGMENT_COLORS: Record<RFMSegment, string> = {
  VIP: "#f59e0b",
  loyal: "#3b82f6",
  potential: "#10b981",
  new: "#8b5cf6",
  churnRisk: "#ef4444",
  dormant: "#9ca3af",
};

// ── New vs Returning ──────────────────────────────────────────────────────────

export interface NewVsReturning {
  yearMonth: string;
  newCount: number;
  returningCount: number;
}

export function computeNewVsReturning(
  records: SalesRecord[],
  profiles: Map<string, CustomerProfile>
): NewVsReturning[] {
  const firstMonths = new Map<string, string>();
  for (const [name, p] of profiles) {
    const d = p.firstVisit;
    firstMonths.set(
      name,
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }

  const map = new Map<string, { newCount: number; returningCount: number }>();

  for (const r of records) {
    if (r.isFree || r.isCancelled) continue;
    const ym = r.yearMonth;
    if (!map.has(ym)) map.set(ym, { newCount: 0, returningCount: 0 });
    const e = map.get(ym)!;

    if (firstMonths.get(r.memberName) === ym) {
      e.newCount++;
    } else {
      e.returningCount++;
    }
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([yearMonth, { newCount, returningCount }]) => ({
      yearMonth,
      newCount,
      returningCount,
    }));
}

// ── Top customers ─────────────────────────────────────────────────────────────

export interface TopCustomer {
  rank: number;
  name: string;
  visits: number;
  totalSpend: number;
  lastVisit: Date;
}

export function computeTopCustomers(
  profiles: Map<string, CustomerProfile>,
  n = 10
): { byVisits: TopCustomer[]; bySpend: TopCustomer[] } {
  const list = [...profiles.values()].filter((p) => p.totalVisits > 0);

  const toRanked = (sorted: CustomerProfile[]): TopCustomer[] =>
    sorted.slice(0, n).map((p, i) => ({
      rank: i + 1,
      name: p.name,
      visits: p.totalVisits,
      totalSpend: p.totalSpend,
      lastVisit: p.lastVisit,
    }));

  return {
    byVisits: toRanked([...list].sort((a, b) => b.totalVisits - a.totalVisits)),
    bySpend: toRanked([...list].sort((a, b) => b.totalSpend - a.totalSpend)),
  };
}

// ── Churn detection ───────────────────────────────────────────────────────────

export interface ChurnedCustomer {
  name: string;
  lastVisit: Date;
  daysSince: number;
  totalVisits: number;
  totalSpend: number;
}

export function detectChurned(
  profiles: Map<string, CustomerProfile>,
  dayThreshold: number,
  referenceDate: Date = new Date()
): ChurnedCustomer[] {
  const now = referenceDate.getTime();
  return [...profiles.values()]
    .filter((p) => p.totalVisits > 0)
    .map((p) => ({
      name: p.name,
      lastVisit: p.lastVisit,
      daysSince: Math.floor((now - p.lastVisit.getTime()) / 86400000),
      totalVisits: p.totalVisits,
      totalSpend: p.totalSpend,
    }))
    .filter((c) => c.daysSince >= dayThreshold)
    .sort((a, b) => b.daysSince - a.daysSince);
}

// ── Cohort retention ──────────────────────────────────────────────────────────

export interface CohortMatrix {
  cohorts: string[];
  maxPeriods: number;
  data: (number | null)[][];
  sizes: number[];
}

export function computeCohortMatrix(
  records: SalesRecord[],
  profiles: Map<string, CustomerProfile>,
  maxPeriods = 12
): CohortMatrix {
  const cohortMonth = new Map<string, string>();
  for (const [name, p] of profiles) {
    if (p.totalVisits === 0) continue;
    const d = p.firstVisit;
    cohortMonth.set(
      name,
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }

  const customerActiveMonths = new Map<string, Set<string>>();
  for (const r of records) {
    if (r.isFree || r.isCancelled) continue;
    if (!customerActiveMonths.has(r.memberName)) {
      customerActiveMonths.set(r.memberName, new Set());
    }
    customerActiveMonths.get(r.memberName)!.add(r.yearMonth);
  }

  const nowYM = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  })();

  const cohorts = [...new Set(cohortMonth.values())].sort().slice(-24);
  const sizes: number[] = [];
  const data: (number | null)[][] = [];

  for (const cohort of cohorts) {
    const members = [...cohortMonth.entries()]
      .filter(([, cm]) => cm === cohort)
      .map(([name]) => name);
    sizes.push(members.length);

    const [cy, cm] = cohort.split("-").map(Number);
    const row: (number | null)[] = [];

    for (let period = 0; period < maxPeriods; period++) {
      const d = new Date(cy, cm - 1 + period, 1);
      const targetYM = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (targetYM > nowYM) {
        row.push(null);
        continue;
      }
      const active = members.filter((name) =>
        customerActiveMonths.get(name)?.has(targetYM)
      ).length;
      row.push(members.length > 0 ? Math.round((active / members.length) * 100) : null);
    }

    data.push(row);
  }

  return { cohorts, maxPeriods, data, sizes };
}

// ── Product funnel ────────────────────────────────────────────────────────────

export interface FunnelStep {
  label: string;
  count: number;
  percentage: number;
}

export function computeProductFunnel(records: SalesRecord[]): FunnelStep[] {
  const byCategory = new Map<string, Set<string>>();

  for (const r of records) {
    if (r.isFree || r.isCancelled || !r.memberName) continue;
    const cat = r.usageCategory;
    if (!byCategory.has(cat)) byCategory.set(cat, new Set());
    byCategory.get(cat)!.add(r.memberName);
  }

  const allCustomers = new Set<string>();
  for (const s of byCategory.values()) s.forEach((n) => allCustomers.add(n));
  const total = allCustomers.size;

  const steps = [
    { label: "전체 이용 고객", count: total },
    { label: "1회권 이용", count: byCategory.get("oneTime")?.size ?? 0 },
    { label: "충전권 이용", count: byCategory.get("charge")?.size ?? 0 },
    { label: "정기권 이용", count: byCategory.get("subscription")?.size ?? 0 },
  ];

  return steps.map((s) => ({
    ...s,
    percentage: total > 0 ? Math.round((s.count / total) * 100) : 0,
  }));
}

// ── Summary ───────────────────────────────────────────────────────────────────

export interface CustomerSummary {
  totalMembers: number;
  newMembersLast30: number;
  returningRatio: number;
  churnRiskCount: number;
  avgDaysBetweenVisits: number;
}

export function computeCustomerSummary(
  profiles: Map<string, CustomerProfile>,
  rfmScores: RFMScore[],
  referenceDate: Date = new Date()
): CustomerSummary {
  const list = [...profiles.values()].filter((p) => p.totalVisits > 0);
  const now = referenceDate.getTime();

  const newMembersLast30 = list.filter(
    (p) => (now - p.firstVisit.getTime()) / 86400000 <= 30
  ).length;

  const churnRiskCount = rfmScores.filter(
    (r) => r.segment === "churnRisk" || r.segment === "dormant"
  ).length;

  const avgDaysBetweenVisits =
    list.length > 0
      ? list.reduce((sum, p) => {
          if (p.totalVisits <= 1) return sum;
          const span =
            (p.lastVisit.getTime() - p.firstVisit.getTime()) / 86400000;
          return sum + span / (p.totalVisits - 1);
        }, 0) / list.filter((p) => p.totalVisits > 1).length
      : 0;

  const totalTx = list.reduce((s, p) => s + p.totalVisits, 0);
  const newTx = list
    .filter((p) => {
      const ym = `${p.firstVisit.getFullYear()}-${String(p.firstVisit.getMonth() + 1).padStart(2, "0")}`;
      const nowYm = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, "0")}`;
      return ym === nowYm;
    })
    .reduce((s, p) => s + p.totalVisits, 0);

  return {
    totalMembers: list.length,
    newMembersLast30,
    returningRatio: totalTx > 0 ? ((totalTx - newTx) / totalTx) * 100 : 0,
    churnRiskCount,
    avgDaysBetweenVisits: Math.round(avgDaysBetweenVisits),
  };
}
