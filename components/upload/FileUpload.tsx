"use client";

import { useCallback, useRef, useState } from "react";
import { useDataStore } from "@/store/dataStore";
import { parseFile } from "@/lib/parsers";

export default function FileUpload() {
  const { setData, setActiveMenu } = useDataStore();
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setLoading(true);
      try {
        const parsed = await parseFile(file);
        setData(parsed);
        setActiveMenu("analysis");
      } catch (e) {
        setError(e instanceof Error ? e.message : "파일 파싱에 실패했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [setData, setActiveMenu]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <div className="max-w-xl mx-auto mt-16">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">파일 업로드</h2>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer transition-colors
          ${dragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"}
          ${loading ? "pointer-events-none opacity-60" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={onInputChange}
          className="hidden"
        />

        {loading ? (
          <div className="flex flex-col items-center gap-3 text-blue-600">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">파일 파싱 중...</span>
          </div>
        ) : (
          <>
            <span className="text-4xl mb-4">📁</span>
            <p className="text-gray-700 font-medium">
              파일을 드래그하거나 클릭해서 선택하세요
            </p>
            <p className="text-sm text-gray-400 mt-2">CSV, XLSX, XLS 지원</p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
