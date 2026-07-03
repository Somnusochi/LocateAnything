import { useNavigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { HistoryList } from "@/components/HistoryList";
import { useDetectionHistory } from "@/hooks/useDetectionHistory";
import { useAppStore } from "@/store/useAppStore";
import type { Detection } from "@/types";

export function RecordsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAppMode = useAppStore((s) => s.setAppMode);
  const { historyQuery, allItems, total, handleSelectHistory } = useDetectionHistory();

  const handleSelect = async (det: Detection) => {
    await handleSelectHistory(det);
    setAppMode("annotate");
    navigate("/annotate");
  };

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto flex h-full max-w-6xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-700">{t("common.history")}</h1>
          <span className="text-xs text-gray-400">
            {t("historyList.loadedCount", { loaded: allItems.length, total })}
          </span>
        </div>

        <section className="min-h-0 flex-1 rounded border border-gray-200 bg-white p-4">
          <ErrorBoundary>
            <HistoryList
              allItems={allItems}
              total={total}
              hasNextPage={historyQuery.hasNextPage ?? false}
              isFetchingNextPage={historyQuery.isFetchingNextPage}
              fetchNextPage={() => historyQuery.fetchNextPage()}
              onSelect={handleSelect}
              scrollClassName="h-[calc(100vh-220px)] min-h-[360px]"
            />
          </ErrorBoundary>
        </section>
      </div>
    </main>
  );
}
