import { ImageUploader } from "@/components/ImageUploader";
import { BatchProgress } from "@/components/BatchProgress";
import { ModelStatus } from "@/components/ModelStatus";
import { Sam3Status } from "@/components/Sam3Status";
import { VideoPanel } from "@/components/VideoPanel";
import { FilterPanel } from "@/components/FilterPanel";
import { DetectionControls } from "./DetectionControls";
import type { Detection } from "@/types";
import { useAppStore } from "@/store/useAppStore";

export interface SidebarProps {
  recentCategories: string[];
  handleFiles: (fs: File[]) => void;
  handleDetect: () => void;
  loading: boolean;
  batchProgress: { current: number; total: number };
  batchResults: Detection[];
  cancel: () => void;
  result: Detection | null;
  handleSelectKeyframe: (files: File[]) => void;
}

export function Sidebar({
  recentCategories,
  handleFiles,
  handleDetect,
  loading,
  batchProgress,
  batchResults,
  cancel,
  result,
  handleSelectKeyframe,
}: SidebarProps) {
  const { t } = useTranslation();
  const {
    inputMode, setInputMode,
    files, setFiles,
    setPreviewUrl,
    setBatchResults: setBatch,
    setUseSam2,
    useSam3, setUseSam3,
    filterMode, setFilterMode,
    nmsIou, setNmsIou,
    setHiddenIndices,
  } = useAppStore();

  return (
    <aside
      className="flex-shrink-0 border-r border-gray-200 bg-white flex flex-col gap-4 overflow-y-auto relative"
      style={{ width: 360, padding: "1.25rem" }}
    >
      <div className="flex rounded-lg border border-gray-200/60 bg-gray-100/80 p-1 relative min-h-[36px] mb-2 shadow-inner">
        {(["vlm+sam2", "sam3"] as const).map((mode) => {
          const active = mode === "sam3" ? useSam3 : !useSam3;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => { setUseSam2(mode === "vlm+sam2"); setUseSam3(mode === "sam3"); }}
              className={`flex-1 text-xs font-semibold px-3 py-1 rounded-md transition-all duration-300 cursor-pointer relative z-10 ${
                active
                  ? "bg-white text-primary-600 shadow-sm ring-1 ring-black/5"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
              }`}
            >
              {mode === "sam3" ? "SAM3" : "VLM + SAM2"}
            </button>
          );
        })}
      </div>

      {useSam3 ? <Sam3Status /> : <ModelStatus />}

      <div>
        <div className="flex gap-1 rounded bg-gray-100 p-0.5 mb-2">
          {(["image", "video"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => { setInputMode(mode); setFiles([]); setPreviewUrl(null); setBatch([]); }}
              className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                inputMode === mode
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {{ image: t("common.image"), video: t("common.video") }[mode]}
            </button>
          ))}
        </div>
        {inputMode === "image" ? (
          <ImageUploader
            onFiles={handleFiles}
            onClear={() => { setFiles([]); setPreviewUrl(null); setBatch([]); }}
            disabled={loading}
          />
        ) : (
          <VideoPanel
            onLoadKeyframes={handleSelectKeyframe}
            disabled={loading}
          />
        )}
      </div>

      <DetectionControls
        recentCategories={recentCategories}
        loading={loading}
        filesCount={files.length}
        batchProgress={batchProgress}
        onDetect={handleDetect}
      />

      <BatchProgress
        current={batchProgress.current}
        total={batchProgress.total}
        completed={batchResults.length}
        onCancel={cancel}
      />

      {result && (
        <FilterPanel
          filterMode={filterMode}
          onFilterModeChange={setFilterMode}
          nmsIou={nmsIou}
          onNmsIouChange={setNmsIou}
          setHiddenIndices={setHiddenIndices}
        />
      )}
    </aside>
  );
}
