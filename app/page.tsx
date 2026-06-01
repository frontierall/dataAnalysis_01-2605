"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useDataStore } from "@/store/dataStore";
import FileUpload from "@/components/upload/FileUpload";
import SummaryCards from "@/components/analysis/SummaryCards";
import ColumnInfoTable from "@/components/analysis/ColumnInfoTable";
import DataPreview from "@/components/analysis/DataPreview";
import DataCleaning from "@/components/cleaning/DataCleaning";
import { computeDatasetSummary } from "@/lib/analysis";

// recharts는 브라우저 전용이므로 SSR 비활성화
const VisualizationView = dynamic(
  () => import("@/components/visualization/VisualizationView"),
  { ssr: false }
);
const CorrelationView = dynamic(
  () => import("@/components/correlation/CorrelationView"),
  { ssr: false }
);

function AnalysisView() {
  const { data } = useDataStore();
  if (!data) return null;

  const summary = useMemo(
    () => computeDatasetSummary(data.columns, data.rows),
    [data]
  );

  return (
    <div className="space-y-6 max-w-full">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          데이터셋 요약
        </h2>
        <SummaryCards summary={summary} />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          컬럼 정보
        </h2>
        <ColumnInfoTable columns={summary.columns} />
      </div>

      <div>
        <DataPreview columns={data.columns} rows={data.rows} />
      </div>
    </div>
  );
}

export default function HomePage() {
  const { activeMenu } = useDataStore();

  if (activeMenu === "analysis") return <AnalysisView />;
  if (activeMenu === "cleaning") return <DataCleaning />;
  if (activeMenu === "visualization") return <VisualizationView />;
  if (activeMenu === "correlation") return <CorrelationView />;

  return <FileUpload />;
}
