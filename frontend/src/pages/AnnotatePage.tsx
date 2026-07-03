import { useEffect } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Sidebar } from "@/components/Sidebar";
import { DetectionResult } from "@/components/DetectionResult";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/store/useAppStore";
import { useDetectionProcess } from "@/hooks/useDetectionProcess";
import { useDetectionHistory } from "@/hooks/useDetectionHistory";
import { useDetectionAnnotation } from "@/hooks/useDetectionAnnotation";

export function AnnotatePage() {
  const { t } = useTranslation();
  const {
    setAppMode,
    previewUrl,
    setPreviewUrl,
    files,
    categories,
    canvasMode,
    drawCategory,
    hiddenIndices,
    setCanvasMode,
    setDrawCategory,
    result,
    setResult,
    batchResults,
  } = useAppStore();

  useEffect(() => {
    setAppMode("annotate");
  }, [setAppMode]);

  const {
    elapsedMs,
    batchProgress,
    handleFiles,
    handleSelectKeyframe,
    handleBatchSelect,
    handleDetect,
    handleReDetect,
    cancel,
    loading,
    isRedetecting,
  } = useDetectionProcess();

  const { recentCategories } = useDetectionHistory();

  const {
    handleDrawBox,
    handleUpdateBox,
    handleDeleteBox,
    handleSaveBoxes,
    toggleBoxVisibility,
    displayResult,
  } = useDetectionAnnotation();

  useEffect(() => {
    if (batchResults.length <= 1) return;
    const handler = (e: KeyboardEvent) => {
      const idx = result ? batchResults.findIndex((r) => r.id === result.id) : -1;
      if (e.key === "ArrowLeft" && idx > 0) {
        handleBatchSelect(batchResults[idx - 1], files[idx - 1]);
      } else if (e.key === "ArrowRight" && idx < batchResults.length - 1) {
        handleBatchSelect(batchResults[idx + 1], files[idx + 1]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [batchResults, result, files, handleBatchSelect]);

  return (
    <>
      <Sidebar
        recentCategories={recentCategories}
        handleFiles={handleFiles}
        handleDetect={handleDetect}
        loading={loading}
        batchProgress={batchProgress}
        batchResults={batchResults}
        cancel={cancel}
        result={result}
        handleSelectKeyframe={handleSelectKeyframe}
      />

      <main className="flex-1 flex flex-col overflow-y-auto p-6">
        {!displayResult && !previewUrl && (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            {t("home.placeholderDefault")}
          </div>
        )}

        {previewUrl && (
          <ErrorBoundary>
            <DetectionResult
              result={displayResult}
              previewUrl={previewUrl}
              batchResults={batchResults}
              batchFiles={files}
              loading={loading}
              elapsedMs={elapsedMs}
              categories={categories}
              canvasMode={canvasMode}
              drawCategory={drawCategory}
              recentCategories={recentCategories}
              hiddenIndices={hiddenIndices}
              onToggleVisibility={toggleBoxVisibility}
              isValidation={false}
              onCanvasModeChange={setCanvasMode}
              onDrawCategoryChange={setDrawCategory}
              onUpdateBox={handleUpdateBox}
              onDeleteBox={handleDeleteBox}
              onSelectBatch={handleBatchSelect}
              onSelectPending={(url) => {
                setPreviewUrl(url);
                setResult(null);
              }}
              onReDetect={handleReDetect}
              onSaveBoxes={handleSaveBoxes}
              onDrawBox={handleDrawBox}
              isRedetecting={isRedetecting}
            />
          </ErrorBoundary>
        )}
      </main>
    </>
  );
}
