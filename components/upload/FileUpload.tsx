"use client";

import { useCallback, useRef, useState } from "react";
import { useDataStore } from "@/store/dataStore";
import { parseFile } from "@/lib/parsers";

export default function FileUpload() {
  const { setData, setActiveMenu, cleanedData } = useDataStore();
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const doLoad = useCallback(
    async (file: File) => {
      setError(null);
      setLoading(true);
      setPendingFile(null);
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

  const handleFile = useCallback(
    (file: File) => {
      if (cleanedData) {
        setPendingFile(file);
      } else {
        doLoad(file);
      }
    },
    [cleanedData, doLoad]
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

      {pendingFile && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm">
          <p className="text-amber-800 font-medium mb-3">
            정제 데이터가 있습니다. 새 파일을 불러오면 정제 데이터가 초기화됩니다.
          </p>
          <p className="text-amber-700 mb-4">
            <span className="font-medium">{pendingFile.name}</span>을(를) 불러올까요?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => doLoad(pendingFile)}
              className="px-4 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-colors"
            >
              확인 (정제 데이터 초기화)
            </button>
            <button
              onClick={() => setPendingFile(null)}
              className="px-4 py-1.5 rounded-md border border-amber-300 text-amber-700 hover:bg-amber-100 text-xs transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
