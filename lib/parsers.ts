"use client";

import Papa from "papaparse";
import type { ParsedData } from "./types";

function normalizeRows(
  rawRows: Record<string, unknown>[],
  columns: string[]
): Record<string, unknown>[] {
  return rawRows.map((row) => {
    const normalized: Record<string, unknown> = {};
    for (const col of columns) {
      normalized[col] = row[col] ?? null;
    }
    return normalized;
  });
}

export async function parseCSV(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          reject(new Error(results.errors[0].message));
          return;
        }
        const columns = results.meta.fields ?? [];
        const rows = normalizeRows(results.data, columns);
        resolve({
          columns,
          rows,
          fileName: file.name,
          fileSize: file.size,
        });
      },
      error: (err) => reject(new Error(err.message)),
    });
  });
}

export async function parseXLSX(file: File): Promise<ParsedData> {
  const { read, utils } = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("XLSX 파일에 시트가 없습니다.");
  const sheet = workbook.Sheets[sheetName];
  const rawRows = utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
  });
  if (rawRows.length === 0) throw new Error("데이터가 없습니다.");
  const columns = Object.keys(rawRows[0]);
  const rows = normalizeRows(rawRows, columns);
  return { columns, rows, fileName: file.name, fileSize: file.size };
}

export async function parseFile(file: File): Promise<ParsedData> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") return parseCSV(file);
  if (ext === "xlsx" || ext === "xls") return parseXLSX(file);
  throw new Error(`지원하지 않는 파일 형식입니다: .${ext}`);
}
