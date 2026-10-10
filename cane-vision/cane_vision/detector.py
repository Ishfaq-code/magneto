"""Thin wrapper around an Ultralytics YOLO model."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Detection:
    label: str
    confidence: float
    box: tuple[float, float, float, float]  # x1, y1, x2, y2 in pixels

    @property
    def area(self) -> float:
        x1, y1, x2, y2 = self.box
        return max(x2 - x1, 0.0) * max(y2 - y1, 0.0)


def load_vocabulary(value: str | list[str] | None, base_dir: Path = Path(".")) -> list[str] | None:
    """Vocabulary from a list, or from a text file with one name per line."""
    if not value:
        return None
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    lines = (base_dir / value).read_text().splitlines()
    names = [ln.strip() for ln in lines if ln.strip() and not ln.lstrip().startswith("#")]
    return list(dict.fromkeys(names))


class Detector:
    def __init__(
        self,
        model: str = "yolov8s-worldv2.pt",
        confidence: float = 0.25,
        image_size: int = 640,
        device: str | None = None,
        vocabulary: list[str] | None = None,
    ):
        from ultralytics import YOLO

        self.model = YOLO(model)
        if vocabulary:
            # YOLO-World: detect exactly these names. This encodes the words
            # with CLIP at startup; a baked model (cane_vision.bake) skips it.
            self.model.set_classes(vocabulary)
        self.confidence = confidence
        self.image_size = image_size
        self.device = device

    @property
    def class_names(self) -> list[str]:
        names = self.model.names
        return list(names.values()) if isinstance(names, dict) else list(names)

    def __call__(self, frame) -> list[Detection]:
        result = self.model.predict(
            frame,
            conf=self.confidence,
            imgsz=self.image_size,
            device=self.device,
            verbose=False,
        )[0]
        names = result.names
        return [
            Detection(names[int(c)], float(p), tuple(float(v) for v in xyxy))
            for xyxy, p, c in zip(
                result.boxes.xyxy.tolist(), result.boxes.conf.tolist(), result.boxes.cls.tolist()
            )
        ]
