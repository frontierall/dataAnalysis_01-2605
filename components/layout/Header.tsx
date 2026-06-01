"use client";

import { useDataStore } from "@/store/dataStore";

export default function Header() {
  const { data } = useDataStore();

  return (
    <header className="h-14 flex items-center px-6 bg-white border-b border-gray-200 shrink-0">
      {data ? (
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">파일</span>
            <span className="font-semibold text-gray-900 text-sm">
              {data.fileName}
            </span>
          </div>
          <div className="h-4 w-px bg-gray-300" />
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>
              <span className="font-medium text-gray-900">
                {data.rows.length.toLocaleString()}
              </span>{" "}
              행
            </span>
            <span>
              <span className="font-medium text-gray-900">
                {data.columns.length}
              </span>{" "}
              열
            </span>
          </div>
        </div>
      ) : (
        <span className="text-gray-400 text-sm">파일을 업로드해주세요</span>
      )}
    </header>
  );
}
