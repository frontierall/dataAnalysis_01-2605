"use client";

import { useDataStore } from "@/store/dataStore";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Header() {
  const { data } = useDataStore();

  return (
    <header className="h-14 flex items-center px-6 bg-white border-b border-gray-200 shrink-0">
      {data ? (
        <div className="flex items-center gap-6 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-gray-500 text-sm shrink-0">파일</span>
            <span className="font-semibold text-gray-900 text-sm truncate" title={data.fileName}>
              {data.fileName}
            </span>
          </div>
          <div className="h-4 w-px bg-gray-300 shrink-0" />
          <div className="flex items-center gap-4 text-sm text-gray-600 shrink-0">
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
            <span className="text-gray-400">
              {formatFileSize(data.fileSize)}
            </span>
          </div>
        </div>
      ) : (
        <span className="text-gray-400 text-sm">파일을 업로드해주세요</span>
      )}
    </header>
  );
}
