"use client";

import type { ColumnStats } from "@/lib/types";

const TYPE_LABELS: Record<string, string> = {
  numeric: "연속형",
  categorical: "범주형",
  datetime: "날짜형",
  unknown: "알 수 없음",
};

const TYPE_BADGE: Record<string, string> = {
  numeric: "bg-blue-100 text-blue-700",
  categorical: "bg-purple-100 text-purple-700",
  datetime: "bg-green-100 text-green-700",
  unknown: "bg-gray-100 text-gray-500",
};

function MissingCell({ ratio, count }: { ratio: number; count: number }) {
  const pct = (ratio * 100).toFixed(1);
  const highlight =
    ratio > 0.3
      ? "bg-red-100 text-red-700 font-semibold"
      : ratio > 0
      ? "bg-yellow-50 text-yellow-700"
      : "text-gray-500";

  return (
    <td className={`px-4 py-3 text-sm ${highlight}`}>
      {count} ({pct}%)
    </td>
  );
}

function RangeCell({ stats }: { stats: ColumnStats }) {
  if (stats.type === "numeric" || stats.type === "datetime") {
    return (
      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
        {stats.range || "-"}
      </td>
    );
  }
  if (stats.examples.length === 0) {
    return <td className="px-4 py-3 text-sm text-gray-400">-</td>;
  }
  return (
    <td className="px-4 py-3 text-sm text-gray-700 max-w-xs">
      <span>{stats.examples.join(", ")}</span>
      {stats.uniqueCount > stats.examples.length && (
        <span className="text-gray-400"> ...</span>
      )}
    </td>
  );
}

interface Props {
  columns: ColumnStats[];
}

export default function ColumnInfoTable({ columns }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">컬럼명</th>
              <th className="px-4 py-3 text-left">타입</th>
              <th className="px-4 py-3 text-right">고유값</th>
              <th className="px-4 py-3 text-left">결측치</th>
              <th className="px-4 py-3 text-left">범위 / 예시</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((col, i) => (
              <tr
                key={col.name}
                className={`border-b border-gray-100 ${
                  i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                }`}
              >
                <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                <td
                  className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate"
                  title={col.name}
                >
                  {col.name}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[col.type]}`}
                  >
                    {TYPE_LABELS[col.type]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {col.uniqueCount.toLocaleString()}
                </td>
                <MissingCell ratio={col.missingRatio} count={col.missingCount} />
                <RangeCell stats={col} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
