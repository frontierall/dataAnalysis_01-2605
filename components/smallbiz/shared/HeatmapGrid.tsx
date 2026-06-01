"use client";

interface HeatmapGridProps {
  rowLabels: string[];
  colLabels: string[];
  data: (number | null)[][];
  maxValue?: number;
  formatValue?: (v: number) => string;
  colorFn?: (ratio: number) => string;
  cellSize?: number;
}

function defaultColor(ratio: number): string {
  const r = Math.round(59 + (220 - 59) * (1 - ratio));
  const g = Math.round(130 + (38 - 130) * ratio);
  const b = Math.round(246 + (38 - 246) * ratio);
  return `rgb(${r},${g},${b})`;
}

export default function HeatmapGrid({
  rowLabels,
  colLabels,
  data,
  maxValue,
  formatValue = (v) => String(v),
  colorFn = defaultColor,
  cellSize = 28,
}: HeatmapGridProps) {
  const max = maxValue ?? Math.max(...data.flat().filter((v): v is number => v !== null), 1);

  return (
    <div className="overflow-auto">
      <div
        className="inline-grid gap-px"
        style={{
          gridTemplateColumns: `auto repeat(${colLabels.length}, ${cellSize}px)`,
        }}
      >
        {/* Header row */}
        <div />
        {colLabels.map((label, ci) => (
          <div
            key={ci}
            className="text-center text-[10px] text-gray-500 font-medium leading-none py-1"
            style={{ width: cellSize }}
          >
            {label}
          </div>
        ))}

        {/* Data rows */}
        {rowLabels.map((rowLabel, ri) => (
          <>
            <div
              key={`label-${ri}`}
              className="text-right text-[11px] text-gray-600 pr-2 flex items-center justify-end"
              style={{ height: cellSize }}
            >
              {rowLabel}
            </div>
            {colLabels.map((_, ci) => {
              const val = data[ri]?.[ci];
              const ratio = val != null && max > 0 ? val / max : 0;
              return (
                <div
                  key={`${ri}-${ci}`}
                  title={val != null ? formatValue(val) : "-"}
                  className="rounded-sm flex items-center justify-center cursor-default transition-opacity hover:opacity-80"
                  style={{
                    width: cellSize,
                    height: cellSize,
                    backgroundColor:
                      val != null ? colorFn(ratio) : "#f3f4f6",
                  }}
                >
                  {cellSize >= 32 && val != null && (
                    <span
                      className="text-[9px] font-medium"
                      style={{ color: ratio > 0.5 ? "#fff" : "#374151" }}
                    >
                      {formatValue(val)}
                    </span>
                  )}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}
