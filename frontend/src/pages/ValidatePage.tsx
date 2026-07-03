import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ValidationSettings } from "@/components/ValidationSettings";
import { VideoPanel } from "@/components/VideoPanel";
import { VideoValidator } from "@/components/VideoValidator";
import { useAppStore } from "@/store/useAppStore";
import { useDetectionProcess } from "@/hooks/useDetectionProcess";

export function ValidatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    setAppMode,
    setInputMode,
    validateModelSource,
    setValidateModelSource,
    selectedTrainedJobId,
    setSelectedTrainedJobId,
    externalModelFile,
    setExternalModelFile,
    validateConf,
    setValidateConf,
    validateIou,
    setValidateIou,
    validateVideoId,
    setValidateVideoId,
    validateRunKey,
    setValidateRunKey,
  } = useAppStore();
  const { handleSelectKeyframe, loading } = useDetectionProcess();

  useEffect(() => {
    setAppMode("validate");
  }, [setAppMode]);

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded border border-gray-200 bg-white p-4">
          <h1 className="text-base font-semibold text-gray-700">{t("common.validate")}</h1>
          <ValidationSettings
            selectedJobId={selectedTrainedJobId}
            onSelectJob={setSelectedTrainedJobId}
            modelSource={validateModelSource}
            onSourceChange={setValidateModelSource}
            externalFile={externalModelFile}
            onExternalFile={setExternalModelFile}
            validateConf={validateConf}
            onConfChange={setValidateConf}
            validateIou={validateIou}
            onIouChange={setValidateIou}
          />
          <VideoPanel
            onLoadKeyframes={(files) => {
              handleSelectKeyframe(files);
              setInputMode("video");
              setAppMode("annotate");
              navigate("/annotate");
            }}
            onValidateVideo={(videoId) => {
              setValidateVideoId(videoId);
              setValidateRunKey((k) => k + 1);
            }}
            disabled={loading}
          />
        </aside>

        <section className="min-h-[420px] rounded border border-gray-200 bg-white p-4">
          {validateVideoId ? (
            <VideoValidator
              key={validateRunKey}
              videoId={validateVideoId}
              jobId={
                validateModelSource === "trained" ? (selectedTrainedJobId ?? undefined) : undefined
              }
              modelFile={
                validateModelSource === "upload" ? (externalModelFile ?? undefined) : undefined
              }
              conf={validateConf}
              iou={validateIou}
            />
          ) : (
            <div className="flex h-full min-h-[360px] items-center justify-center text-sm text-gray-400">
              {t("home.placeholderSelectVideo")}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
