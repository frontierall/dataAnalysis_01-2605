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
  if (workbook.SheetNames.length === 0)
    throw new Error("XLSX 파일에 시트가 없습니다.");

  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const firstRaw = utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
    defval: null,
  });
  if (firstRaw.length === 0) throw new Error("데이터가 없습니다.");

  const columns = Object.keys(firstRaw[0]);

  // Merge all sheets when they share the same column structure
  let allRaw: Record<string, unknown>[] = [];
  let canMerge = true;
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
    });
    if (rows.length === 0) continue;
    const cols = Object.keys(rows[0]);
    const same =
      cols.length === columns.length && cols.every((c, i) => c === columns[i]);
    if (!same) {
      canMerge = false;
      break;
    }
    allRaw = allRaw.concat(rows);
  }

  const rawRows = canMerge ? allRaw : firstRaw;
  const rows = normalizeRows(rawRows, columns);
  return { columns, rows, fileName: file.name, fileSize: file.size };
}

export async function parseFile(file: File): Promise<ParsedData> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") return parseCSV(file);
  if (ext === "xlsx" || ext === "xls") return parseXLSX(file);
  throw new Error(`지원하지 않는 파일 형식입니다: .${ext}`);
}
