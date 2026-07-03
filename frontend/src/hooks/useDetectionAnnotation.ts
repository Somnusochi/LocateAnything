import { useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/store/useAppStore";
import { addBox, deleteBox, saveFilterSettings, updateBox } from "@/services/api";
import { applyFilter } from "@/lib/filterBoxes";
import type { BoxUpdatePayload } from "@/services/api";

export function useDetectionAnnotation() {
  const { t } = useTranslation();
  const { drawCategory, filterMode, nmsIou, setHiddenIndices, result, setResult, setBatchResults } = useAppStore();

  const handleDrawBox = useCallback(
    async (raw: { x1: number; y1: number; x2: number; y2: number }) => {
      if (!result || !drawCategory.trim()) {
        toast.error(t("home.drawCategoryRequired"));
        return;
      }
      try {
        const newBox = await addBox(result.id, { ...raw, className: drawCategory.trim() });
        const updated = { ...result, boxes: [...result.boxes, newBox] };
        setResult(updated);
        setBatchResults((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      } catch (e) {
        console.error("Draw box failed:", e);
        toast.error(t("home.drawBoxFailed") || "Failed to save box");
      }
    },
    [result, drawCategory, setBatchResults, setResult, t],
  );

  const handleUpdateBox = useCallback(
    async (boxId: string, next: BoxUpdatePayload) => {
      if (!result) return;
      try {
        const updatedBox = await updateBox(result.id, boxId, next);
        const updated = {
          ...result,
          boxes: result.boxes.map((box) => (box.id === boxId ? updatedBox : box)),
        };
        setResult(updated);
        setBatchResults((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        toast.success(t("resultTable.updateBoxSuccess"));
      } catch (e) {
        console.error("Update box failed:", e);
        toast.error(t("resultTable.updateBoxFailed"));
        throw e;
      }
    },
    [result, setBatchResults, setResult, t],
  );

  const handleDeleteBox = useCallback(
    async (boxId: string) => {
      if (!result) return;
      const box = result.boxes.find((b) => b.id === boxId);
      if (!box) return;
      try {
        await deleteBox(result.id, box.id);
        const updated = { ...result, boxes: result.boxes.filter((b) => b.id !== boxId) };
        setResult(updated);
        setBatchResults((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      } catch (e) {
        console.error("Delete box failed:", e);
        toast.error(t("home.deleteBoxFailed") || "Failed to delete box");
      }
    },
    [result, setBatchResults, setResult, t],
  );

  const handleSaveBoxes = useCallback(async () => {
    if (!result) return;

    try {
      await saveFilterSettings(result.id, filterMode, filterMode === "nms" ? nmsIou : null);
      toast.success(t("home.savedSuccessfully"));
      setResult({
        ...result,
        filterMode: filterMode,
        filterNmsIou: filterMode === "nms" ? nmsIou : null,
      });
    } catch (e) {
      console.error("Save boxes failed:", e);
      toast.error(t("home.saveFailed"));
    }
  }, [result, filterMode, nmsIou, setResult, t]);

  const toggleBoxVisibility = useCallback(
    (id: string) => {
      setHiddenIndices((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [setHiddenIndices],
  );

  const displayResult = useMemo(
    () => (result ? { ...result, boxes: applyFilter(filterMode, result.boxes, nmsIou) } : null),
    [result, filterMode, nmsIou],
  );

  return {
    handleDrawBox,
    handleUpdateBox,
    handleDeleteBox,
    handleSaveBoxes,
    toggleBoxVisibility,
    displayResult,
  };
}
