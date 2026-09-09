"""Repository IDs arrive as strings from HTTP routes and dataset imports."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

import app.models  # noqa: F401
from app.core.database import Base
from app.repositories.detection import DetectionRepository


@pytest.mark.parametrize("operation", ["read", "add", "replace", "get_box"])
def test_string_ids_on_sqlite(operation):
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        repo = DetectionRepository(db)
        det = repo.create(
            image_path="test.png",
            image_name="test.png",
            image_width=100,
            image_height=100,
            categories=["test"],
        )
        box = {"class_name": "test", "x1": 1, "y1": 2, "x2": 10, "y2": 20}
        if operation == "read":
            assert repo.get_by_id(str(det.id)) is det
        elif operation == "add":
            assert len(repo.add_boxes(str(det.id), [box])) == 1
        else:
            saved = repo.add_boxes(det.id, [box])[0]
            if operation == "replace":
                assert len(repo.replace_boxes(str(det.id), [box])) == 1
            else:
                assert repo.get_box(str(det.id), str(saved.id)) is saved
    engine.dispose()
