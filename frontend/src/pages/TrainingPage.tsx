import { TrainingPanel } from "@/components/TrainingPanel";
import { useDetectionHistory } from "@/hooks/useDetectionHistory";

export function TrainingPage() {
  const { t } = useTranslation();
  const { historyQuery, allItems, total } = useDetectionHistory();

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-700">{t("common.yoloTrain")}</h1>
          <span className="text-xs text-gray-400">
            {t("historyList.loadedCount", { loaded: allItems.length, total })}
          </span>
        </div>

        <section className="rounded border border-gray-200 bg-white p-4">
          <TrainingPanel
            detections={allItems}
            total={total}
            hasNextPage={historyQuery.hasNextPage ?? false}
            isFetchingNextPage={historyQuery.isFetchingNextPage}
            fetchNextPage={() => historyQuery.fetchNextPage()}
          />
        </section>
      </div>
    </main>
  );
}
