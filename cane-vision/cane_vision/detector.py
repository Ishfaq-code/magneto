"""Thin wrapper around an Ultralytics YOLO model."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Detection:
    label: str
    confidence: float
    box: tuple[float, float, float, float]  # x1, y1, x2, y2 in pixels

    @property
    def area(self) -> float:
        x1, y1, x2, y2 = self.box
        return max(x2 - x1, 0.0) * max(y2 - y1, 0.0)


class Detector:
    def __init__(
        self,
        model: str = "yolo11n.pt",
        confidence: float = 0.4,
        image_size: int = 640,
        device: str | None = None,
        vocabulary: list[str] | None = None,
    ):
        from ultralytics import YOLO

        self.model = YOLO(model)
        if vocabulary:
            # Open-vocabulary models (YOLO-World) accept a custom class list.
            self.model.set_classes(vocabulary)
        self.confidence = confidence
        self.image_size = image_size
        self.device = device

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
