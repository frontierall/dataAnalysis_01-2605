export type TxType = "purchase" | "reservation" | "cancel" | "refund";
export type UsageCategory = "oneTime" | "charge" | "subscription" | "extra";
export type RFMSegment = "VIP" | "loyal" | "potential" | "dormant" | "churnRisk" | "new";
export type SmallBizSubTab = "sales" | "timePattern" | "customer" | "product";

export interface SmallBizColumnMap {
  datetime: string;
  memberName: string;
  txType: string;
  usageType: string;
  productName: string;
  amount: string;
  payMethod: string;
  coupon: string | null;
}

export interface SalesRecord {
  datetime: Date;
  year: number;
  month: number;
  weekStart: string;
  weekday: number;
  hour: number;
  yearMonth: string;
  memberName: string;
  txType: TxType;
  usageType: string;
  usageCategory: UsageCategory;
  productName: string;
  amount: number;
  payMethod: string;
  isFree: boolean;
  isCancelled: boolean;
  coupon: string | null;
}

export interface CustomerProfile {
  name: string;
  totalVisits: number;
  totalSpend: number;
  freeVisits: number;
  firstVisit: Date;
  lastVisit: Date;
  usageTypes: Set<string>;
  monthlyActivity: Map<string, { visits: number; spend: number }>;
}

export interface RFMScore {
  name: string;
  recencyDays: number;
  frequency: number;
  monetary: number;
  rScore: number;
  fScore: number;
  mScore: number;
  segment: RFMSegment;
}
