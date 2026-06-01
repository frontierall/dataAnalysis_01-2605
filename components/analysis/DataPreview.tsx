"use client";

const PREVIEW_ROWS = 10;

interface Props {
  columns: string[];
  rows: Record<string, unknown>[];
}

export default function DataPreview({ columns, rows }: Props) {
  const preview = rows.slice(0, PREVIEW_ROWS);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          데이터 미리보기
        </span>
        <span className="text-xs text-gray-400">
          상위 {PREVIEW_ROWS}행 / 전체 {rows.length.toLocaleString()}행
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-3 py-2 text-center w-10">#</th>
              {columns.map((col) => (
                <th key={col} className="px-4 py-2 text-left max-w-[180px]">
                  <span className="block truncate">{col}</span>
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
