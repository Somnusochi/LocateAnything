from __future__ import annotations

import pytest

from app.services.locate_anything import parse_boxes


def test_parse_boxes_single():
    raw = "<ref>cat</ref><box><100><200><300><400></box>"
    boxes = parse_boxes(raw, 1000, 1000)
    assert len(boxes) == 1
    assert boxes[0] == {
        "class_name": "cat",
        "x1": 100,
        "y1": 200,
        "x2": 300,
        "y2": 400,
        "confidence": None,
    }


def test_parse_boxes_multiple_boxes_same_ref():
    raw = "<ref>dog</ref><box><100><200><300><400></box><box><500><600><700><800></box>"
    boxes = parse_boxes(raw, 1000, 1000)
    assert len(boxes) == 2
    assert boxes[0] == {
        "class_name": "dog",
        "x1": 100,
        "y1": 200,
        "x2": 300,
        "y2": 400,
        "confidence": None,
    }
    assert boxes[1] == {
        "class_name": "dog",
        "x1": 500,
        "y1": 600,
        "x2": 700,
        "y2": 800,
        "confidence": None,
    }


def test_parse_boxes_switched_refs():
    raw = (
        "<ref>cat</ref><box><100><200><300><400></box>"
        "<ref>bird</ref><box><500><600><700><800></box>"
    )
    boxes = parse_boxes(raw, 1000, 1000)
    assert len(boxes) == 2
    assert boxes[0]["class_name"] == "cat"
    assert boxes[1]["class_name"] == "bird"


def test_parse_boxes_empty_or_invalid():
    assert parse_boxes("", 1000, 1000) == []
    assert parse_boxes("some random text without tags", 1000, 1000) == []
    assert parse_boxes("<ref>empty box</ref>", 1000, 1000) == []
    assert parse_boxes("<box><1><2><3><4></box>", 1000, 1000) == []


def test_validate_vlm_device_rejects_cpu():
    from app.core.gpu_memory import validate_vlm_device

    with pytest.raises(RuntimeError, match="cannot run on CPU"):
        validate_vlm_device("cpu")


def test_get_worker_records_preflight_errors(monkeypatch):
    from app.services import locate_anything

    class BrokenSettings:
        resolved_model_dir = "/tmp/missing-model"
        model_id = "nvidia/LocateAnything-3B"

        @property
        def resolved_device(self):
            raise RuntimeError("No GPU detected")

    monkeypatch.setattr(locate_anything, "settings", BrokenSettings())
    monkeypatch.setattr(locate_anything, "_worker", None)
    with locate_anything._state_lock:
        locate_anything._model_state.update(
            {"state": locate_anything.ModelState.UNLOADED, "stage": "", "progress": 0, "error": ""}
        )

    with pytest.raises(RuntimeError, match="No GPU detected"):
        locate_anything._get_worker()

    status = locate_anything.get_model_status()
    assert status["state"] == locate_anything.ModelState.ERROR
    assert status["error"] == "No GPU detected"


def test_detect_raises_loading_error_detail(monkeypatch):
    from app.core.exceptions import InferenceError
    from app.services import locate_anything

    monkeypatch.setattr(
        locate_anything,
        "_get_worker",
        lambda: (_ for _ in ()).throw(RuntimeError("CUDA out of memory")),
    )

    with pytest.raises(InferenceError) as exc_info:
        locate_anything.detect("/tmp/not-needed.jpg", ["cat"])

    assert exc_info.value.detail == "Model loading failed: CUDA out of memory"
