import asyncio
import logging
import time

from ..core.exceptions import AppError
from ..models.detection import Detection, ModelType
from ..repositories.detection import DetectionRepository
from ..schemas.detection import DetectionParams
from .detection_strategy import create_strategy
from .locate_anything import detect_batch, is_model_loaded, unload_model
from .sam2_service import is_sam_loaded, unload_sam
from .sam3_client import is_sam3_running, stop_sam3_server

logger = logging.getLogger(__name__)


def _resolve_model_type(params: DetectionParams) -> ModelType:
    if params.use_sam3:
        return ModelType.sam3
    if params.use_sam2:
        return ModelType.vlm_sam2
    return ModelType.vlm


def _persist_detection_result(
    *,
    filepath: str,
    original_name: str,
    categories: list[str],
    result,
    params: DetectionParams,
    repo: DetectionRepository,
    elapsed_ms: int,
) -> Detection:
    detection = repo.create(
        image_path=filepath,
        image_name=original_name,
        image_width=result.img_w,
        image_height=result.img_h,
        categories=categories,
    )
    detection.model_type = _resolve_model_type(params)
    detection.elapsed_ms = elapsed_ms

    polys = result.polygons
    box_dicts: list[dict] = [
        {
            "class_name": b.get("class_name") or categories[0] or "object",
            "x1": b["x1"],
            "y1": b["y1"],
            "x2": b["x2"],
            "y2": b["y2"],
            "confidence": b.get("confidence"),
            "mask_polygon": polys[i] if i < len(polys) else None,
        }
        for i, b in enumerate(result.boxes)
    ]

    repo.add_boxes(str(detection.id), box_dicts)
    return detection


async def process_detection(
    filepath: str,
    original_name: str,
    categories: list[str],
    params: DetectionParams,
    repo: DetectionRepository,
) -> Detection:
    """Orchestrates model offloading, inference strategy, and database persistence."""

    # 1. Unload the competing model to free GPU memory
    if params.use_sam3:
        if is_model_loaded():
            unload_model()
        if is_sam_loaded():
            unload_sam()
    else:
        if is_sam3_running():
            stop_sam3_server()

    # 2. Setup strategy
    strategy = create_strategy(use_sam2=params.use_sam2, use_sam3=params.use_sam3)
    strategy_kwargs = {
        "sam2_score_threshold": params.sam2_score_threshold,
        "use_sam3_seg": params.use_sam3_seg,
        "sam3_threshold": params.sam3_threshold,
        "sam3_mask_threshold": params.sam3_mask_threshold,
    }

    t0 = time.perf_counter()

    # 3. Execute inference
    try:
        result = await asyncio.to_thread(strategy.detect, filepath, categories, **strategy_kwargs)
    except AppError:
        raise
    except Exception as exc:
        logger.exception("Inference failed")
        raise AppError("Inference failed", 500) from exc

    detection = _persist_detection_result(
        filepath=filepath,
        original_name=original_name,
        categories=categories,
        result=result,
        params=params,
        repo=repo,
        elapsed_ms=int((time.perf_counter() - t0) * 1000),
    )
    repo.db.commit()
    repo.db.refresh(detection)

    return detection


async def process_detection_batch(
    files: list[tuple[str, str]],
    categories: list[str],
    params: DetectionParams,
    repo: DetectionRepository,
) -> list[Detection]:
    """Process many uploaded images, using CUDA VLM batching when possible."""
    if not files:
        return []

    if params.use_sam2 or params.use_sam3:
        detections: list[Detection] = []
        for filepath, original_name in files:
            detections.append(
                await process_detection(
                    filepath=filepath,
                    original_name=original_name,
                    categories=categories,
                    params=params,
                    repo=repo,
                )
            )
        return detections

    if is_sam3_running():
        stop_sam3_server()

    t0 = time.perf_counter()
    try:
        raw_results = await asyncio.to_thread(
            detect_batch,
            [filepath for filepath, _ in files],
            categories,
        )
    except AppError:
        raise
    except Exception as exc:
        logger.exception("Batch inference failed")
        raise AppError("Batch inference failed", 500) from exc

    from .detection_strategy import DetectionResult

    per_image_elapsed = int(((time.perf_counter() - t0) * 1000) / max(1, len(files)))
    detections = []
    for (filepath, original_name), raw in zip(files, raw_results, strict=True):
        boxes = raw["boxes"]
        detect_w, detect_h = raw["img_w"], raw["img_h"]
        orig_w = raw.get("orig_w", detect_w)
        orig_h = raw.get("orig_h", detect_h)
        scale_x = orig_w / detect_w if detect_w != orig_w else 1.0
        scale_y = orig_h / detect_h if detect_h != orig_h else 1.0
        if scale_x != 1.0 or scale_y != 1.0:
            boxes = [
                {
                    **b,
                    "x1": int(b["x1"] * scale_x),
                    "y1": int(b["y1"] * scale_y),
                    "x2": int(b["x2"] * scale_x),
                    "y2": int(b["y2"] * scale_y),
                }
                for b in boxes
            ]

        result = DetectionResult(
            boxes=boxes,
            img_w=orig_w,
            img_h=orig_h,
            raw_text=raw.get("raw_text", ""),
        )
        detections.append(
            _persist_detection_result(
                filepath=filepath,
                original_name=original_name,
                categories=categories,
                result=result,
                params=params,
                repo=repo,
                elapsed_ms=per_image_elapsed,
            )
        )

    repo.db.commit()
    for detection in detections:
        repo.db.refresh(detection)
    return detections
