"""Tests for exporting every saved detection."""

from __future__ import annotations

import io
import zipfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes import export as export_routes
from app.core.database import get_db
from app.services.export import export_all


def _fake_detection(image_path: Path, image_name: str = "sample.jpg") -> SimpleNamespace:
    return SimpleNamespace(
        image_path=str(image_path),
        image_name=image_name,
        image_width=100,
        image_height=100,
        filter_mode=None,
        filter_nms_iou=None,
        boxes=[
            SimpleNamespace(
                x1=10,
                y1=10,
                x2=50,
                y2=50,
                class_name="cat",
                mask_polygon=[[10, 10], [50, 10], [50, 50]],
            ),
        ],
    )


def _db_returning(detections: list[SimpleNamespace]) -> MagicMock:
    db = MagicMock()
    query = db.query.return_value
    query.order_by.return_value.all.return_value = detections
    return db


def test_export_all_returns_all_detections_in_yolo_seg_zip(tmp_path: Path) -> None:
    image_path = tmp_path / "sample.jpg"
    image_path.write_bytes(b"image")
    db = _db_returning([_fake_detection(image_path)])

    payload = export_all(db, format="yolo-seg")

    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        assert archive.namelist() == ["labels/sample.txt", "images/sample.jpg", "data.yaml"]
        assert archive.read("labels/sample.txt").startswith(b"0 ")


def test_export_all_rejects_empty_database() -> None:
    db = _db_returning([])

    with pytest.raises(ValueError, match="No detections available for export"):
        export_all(db)


def test_export_all_route_returns_zip(monkeypatch: pytest.MonkeyPatch) -> None:
    app = FastAPI()
    app.include_router(export_routes.router)
    app.dependency_overrides[get_db] = lambda: object()
    monkeypatch.setattr(export_routes, "export_all", lambda _db, format="yolo": b"zip")

    response = TestClient(app).post("/api/v1/detections/export-all", json={"format": "yolo-seg"})

    assert response.status_code == 200
    assert response.content == b"zip"
    assert response.headers["content-type"] == "application/zip"


def test_export_all_route_returns_bad_request_for_empty_database(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = FastAPI()
    app.include_router(export_routes.router)
    app.dependency_overrides[get_db] = lambda: object()

    def raise_empty(_db, format="yolo"):
        raise ValueError("No detections available for export")

    monkeypatch.setattr(export_routes, "export_all", raise_empty)

    response = TestClient(app).post("/api/v1/detections/export-all")

    assert response.status_code == 400
    assert response.json()["detail"] == "No detections available for export"
