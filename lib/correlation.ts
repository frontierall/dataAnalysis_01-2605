import type { CorrelationMatrix } from "./types";
import { isMissing, toNumber } from "./cleaning";

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return NaN;
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let num = 0,
    sx2 = 0,
    sy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx,
      dy = ys[i] - my;
    num += dx * dy;
    sx2 += dx * dx;
    sy2 += dy * dy;
  }
  const denom = Math.sqrt(sx2 * sy2);
  return denom < 1e-10 ? NaN : num / denom;
}

export function computeCorrelationMatrix(
  columns: string[],
  rows: Record<string, unknown>[]
): CorrelationMatrix {
  const n = columns.length;
  const matrix: number[][] = Array.from({ length: n }, () =>
    new Array(n).fill(NaN)
  );
  const sampleCounts: number[][] = Array.from({ length: n }, () =>
    new Array(n).fill(0)
  );

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1;
    sampleCounts[i][i] = rows.filter(
      (r) => !isMissing(r[columns[i]])
    ).length;

    for (let j = i + 1; j < n; j++) {
      const xs: number[] = [];
      const ys: number[] = [];
      for (const r of rows) {
        if (isMissing(r[columns[i]]) || isMissing(r[columns[j]])) continue;
        const x = toNumber(r[columns[i]]);
        const y = toNumber(r[columns[j]]);
        if (!isNaN(x) && !isNaN(y)) {
          xs.push(x);
          ys.push(y);
        }
      }
      sampleCounts[i][j] = sampleCounts[j][i] = xs.length;
      if (xs.length >= 2) {
        const corr = pearson(xs, ys);
        matrix[i][j] = matrix[j][i] = corr;
      }
    }
  }

  return { columns, matrix, sampleCounts };
}

export function corrColor(r: number): string {
  if (isNaN(r)) return "#f3f4f6";
  if (r > 0) {
    const t = Math.min(r, 1);
    const R = Math.round(255 + (220 - 255) * t);
    const G = Math.round(255 + (38 - 255) * t);
    const B = Math.round(255 + (38 - 255) * t);
    return `rgb(${R},${G},${B})`;
  } else {
    const t = Math.min(-r, 1);
    const R = Math.round(255 + (37 - 255) * t);
    const G = Math.round(255 + (99 - 255) * t);
    const B = Math.round(255 + (235 - 255) * t);
    return `rgb(${R},${G},${B})`;
  }
}
