import { Popconfirm } from "antd";
import type { BoxUpdatePayload } from "@/services/api";
import type { BBox } from "@/types";

type BoxDraft = {
  className: string;
  x1: string;
  y1: string;
  x2: string;
  y2: string;
};

interface Props {
  boxes: BBox[];
  hiddenIndices: Set<string>;
  onToggleVisibility: (boxId: string) => void;
  imageWidth?: number;
  imageHeight?: number;
  onUpdate?: (boxId: string, box: BoxUpdatePayload) => Promise<void> | void;
  onDelete?: (boxId: string) => void;
}

export function ResultTable({
  boxes,
  hiddenIndices,
  onToggleVisibility,
  imageWidth = 0,
  imageHeight = 0,
  onUpdate,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BoxDraft | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (boxes.length === 0) {
    return <p className="py-4 text-sm text-gray-400 text-center">{t("resultTable.noTargets")}</p>;
  }

  const beginEdit = (box: BBox) => {
    setEditingId(box.id);
    setDraft({
      className: box.className,
      x1: String(box.x1),
      y1: String(box.y1),
      x2: String(box.x2),
      y2: String(box.y2),
    });
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
    setError("");
  };

  const parseDraft = (): BoxUpdatePayload | null => {
    if (!draft) return null;
    const className = draft.className.trim();
    const coordValues = [draft.x1, draft.y1, draft.x2, draft.y2].map((value) => value.trim());
    if (!className || coordValues.some((value) => value === "")) {
      setError(t("resultTable.invalidBox"));
      return null;
    }
    const x1 = Number(draft.x1);
    const y1 = Number(draft.y1);
    const x2 = Number(draft.x2);
    const y2 = Number(draft.y2);
    if ([x1, y1, x2, y2].some((value) => !Number.isFinite(value))) {
      setError(t("resultTable.invalidBox"));
      return null;
    }
    const payload = {
      className,
      x1: Math.round(x1),
      y1: Math.round(y1),
      x2: Math.round(x2),
      y2: Math.round(y2),
    };
    if (payload.x2 <= payload.x1 || payload.y2 <= payload.y1) {
      setError(t("resultTable.invalidBox"));
      return null;
    }
    if (
      payload.x1 < 0 ||
      payload.y1 < 0 ||
      (imageWidth > 0 && payload.x2 > imageWidth) ||
      (imageHeight > 0 && payload.y2 > imageHeight)
    ) {
      setError(t("resultTable.outOfBounds"));
      return null;
    }
    return payload;
  };

  const saveEdit = async (boxId: string) => {
    if (!onUpdate) return;
    const payload = parseDraft();
    if (!payload) return;
    setSavingId(boxId);
    setError("");
    try {
      await onUpdate(boxId, payload);
      cancelEdit();
    } catch {
      setError(t("resultTable.updateBoxFailed"));
    } finally {
      setSavingId(null);
    }
  };

  const updateDraft = (key: keyof BoxDraft, value: string) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-600">#</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">
                {t("resultTable.category")}
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">x1</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">y1</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">x2</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">y2</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">
                {t("resultTable.confidence")}
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Mask</th>
              <th className="px-3 py-2 w-10" />
              {(onUpdate || onDelete) && <th className="px-3 py-2 w-28" />}
            </tr>
          </thead>
          <tbody>
            {boxes.map((box, i) => {
              const isEditing = editingId === box.id && draft;
              return (
                <tr
                  key={box.id}
                  className={`border-t border-gray-100 hover:bg-gray-50 ${
                    isEditing ? "bg-primary-50/40" : ""
                  }`}
                >
                  <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-gray-800">
                    {isEditing ? (
                      <input
                        value={draft.className}
                        onChange={(e) => updateDraft("className", e.target.value)}
                        className="w-32 rounded border border-gray-300 px-2 py-1 text-xs"
                      />
                    ) : (
                      box.className
                    )}
                  </td>
                  {(["x1", "y1", "x2", "y2"] as const).map((key) => (
                    <td key={key} className="px-3 py-2 text-gray-600">
                      {isEditing ? (
                        <input
                          type="number"
                          value={draft[key]}
                          min={0}
                          max={key === "x1" || key === "x2" ? imageWidth || undefined : imageHeight || undefined}
                          onChange={(e) => updateDraft(key, e.target.value)}
                          className="w-20 rounded border border-gray-300 px-2 py-1 text-xs"
                        />
                      ) : (
                        box[key]
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-gray-600">
                    {box.confidence != null ? box.confidence.toFixed(3) : "-"}
                  </td>
                  <td className="px-3 py-2 text-gray-500">
                    {box.maskPolygon && box.maskPolygon.length >= 3
                      ? `${box.maskPolygon.length} pts`
                      : "-"}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => onToggleVisibility(box.id)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title={
                        hiddenIndices.has(box.id) ? t("resultTable.showBox") : t("resultTable.hideBox")
                      }
                    >
                      {hiddenIndices.has(box.id) ? (
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      )}
                    </button>
                  </td>
                  {(onUpdate || onDelete) && (
                    <td className="px-2 py-2">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={savingId === box.id}
                            onClick={() => saveEdit(box.id)}
                            className="text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
                          >
                            {savingId === box.id ? t("common.loading") : t("common.save")}
                          </button>
                          <button
                            type="button"
                            disabled={savingId === box.id}
                            onClick={cancelEdit}
                            className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
                          >
                            {t("common.cancel")}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          {onUpdate && (
                            <button
                              type="button"
                              onClick={() => beginEdit(box)}
                              className="text-xs text-primary-500 hover:text-primary-700 transition-colors"
                              title={t("resultTable.editBox")}
                            >
                              {t("common.edit")}
                            </button>
                          )}
                          {onDelete && (
                            <Popconfirm
                              title={t("resultTable.deleteBoxConfirm")}
                              onConfirm={() => onDelete(box.id)}
                              okText={t("common.delete")}
                              cancelText={t("common.cancel")}
                              okButtonProps={{ danger: true }}
                            >
                              <button
                                type="button"
                                className="text-xs text-red-400 hover:text-red-600 transition-colors"
                                title={t("resultTable.deleteBox")}
                              >
                                {t("common.delete")}
                              </button>
                            </Popconfirm>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      {editingId &&
        (() => {
          const polygon = boxes.find((box) => box.id === editingId)?.maskPolygon;
          return polygon && polygon.length >= 3 ? (
            <p className="mt-2 text-xs text-amber-600">{t("resultTable.maskClearedOnBoxEdit")}</p>
          ) : null;
        })()}
    </div>
  );
}
