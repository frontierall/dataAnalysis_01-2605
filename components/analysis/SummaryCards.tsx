"use client";

import type { DatasetSummary } from "@/lib/types";

interface Props {
  summary: DatasetSummary;
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function SummaryCards({ summary }: Props) {
  const { rowCount, columnCount, totalMissing, missingRatio } = summary;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Card label="전체 행" value={rowCount.toLocaleString()} />
      <Card label="전체 열" value={columnCount.toLocaleString()} />
      <Card
        label="결측치 개수"
        value={totalMissing.toLocaleString()}
        sub={`전체 셀의 ${(missingRatio * 100).toFixed(1)}%`}
      />
      <Card
        label="데이터 충족률"
        value={`${((1 - missingRatio) * 100).toFixed(1)}%`}
        sub="전체 셀 중 값이 있는 비율"
      />
    </div>
  );
}
