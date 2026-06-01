"use client";

import { useMemo } from "react";
import { useDataStore } from "@/store/dataStore";
import FileUpload from "@/components/upload/FileUpload";
import SummaryCards from "@/components/analysis/SummaryCards";
import ColumnInfoTable from "@/components/analysis/ColumnInfoTable";
import DataPreview from "@/components/analysis/DataPreview";
import DataCleaning from "@/components/cleaning/DataCleaning";
import VisualizationView from "@/components/visualization/VisualizationView";
import CorrelationView from "@/components/correlation/CorrelationView";
import { computeDatasetSummary } from "@/lib/analysis";

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
