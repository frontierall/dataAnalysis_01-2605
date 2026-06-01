"use client";

import { useState } from "react";

const ROW_OPTIONS = [10, 25, 50, 100] as const;

interface Props {
  columns: string[];
  rows: Record<string, unknown>[];
}

export default function DataPreview({ columns, rows }: Props) {
  const [limit, setLimit] = useState<(typeof ROW_OPTIONS)[number]>(10);
  const preview = rows.slice(0, limit);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">데이터 미리보기</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>표시</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value) as (typeof ROW_OPTIONS)[number])}
              className="border border-gray-200 rounded px-1.5 py-0.5 text-xs bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              {ROW_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}행</option>
              ))}
            </select>
          </div>
          <span className="text-xs text-gray-400">
            / 전체 {rows.length.toLocaleString()}행
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-3 py-2 text-center w-10">#</th>
              {columns.map((col) => (
                <th key={col} className="px-4 py-2 text-left max-w-[180px]">
                  <span className="block truncate" title={col}>{col}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-gray-100 ${
                  i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                }`}
              >
                <td className="px-3 py-2 text-center text-gray-400 text-xs">
                  {i + 1}
                </td>
                {columns.map((col) => {
                  const val = row[col];
                  const isEmpty = val === null || val === undefined || val === "";
                  return (
                    <td
                      key={col}
                      className={`px-4 py-2 max-w-[180px] truncate ${
                        isEmpty ? "text-gray-300 italic" : "text-gray-700"
                      }`}
                      title={isEmpty ? undefined : String(val)}
                    >
                      {isEmpty ? "null" : String(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
