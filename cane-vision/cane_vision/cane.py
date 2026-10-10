"""The predefined cane: a fixed camera mount with a known tip position.

We assume the camera is rigidly mounted on the cane shaft, so the cane tip
always appears at the same place in the image. The touched object is the
detection at (or nearest) that point. No touch sensor is involved yet.
"""

from __future__ import annotations

from dataclasses import dataclass

from .detector import Detection


@dataclass(frozen=True)
class Cane:
    # Tip position as a fraction of frame width/height (0,0 = top-left).
    tip_x: float = 0.5
    tip_y: float = 0.85
    # How far (fraction of frame diagonal) a box edge may be from the tip
    # and still count as touched when no box contains the tip.
    reach: float = 0.06

    def tip_px(self, width: int, height: int) -> tuple[int, int]:
        return round(self.tip_x * width), round(self.tip_y * height)

    def reach_px(self, width: int, height: int) -> float:
        return self.reach * (width**2 + height**2) ** 0.5


def _distance_to_box(px: float, py: float, box: tuple[float, float, float, float]) -> float:
    x1, y1, x2, y2 = box
    dx = max(x1 - px, 0.0, px - x2)
    dy = max(y1 - py, 0.0, py - y2)
    return (dx * dx + dy * dy) ** 0.5


def select_touched(
    detections: list[Detection], cane: Cane, width: int, height: int
) -> Detection | None:
    """Pick the object the cane tip is touching.

    Boxes that contain the tip win; among those the smallest box is chosen,
    so a cup on a table beats the table. Otherwise the nearest box within
    the cane's reach is chosen. Returns None if nothing is close enough.
    """
    px, py = cane.tip_px(width, height)
    containing = [d for d in detections if _distance_to_box(px, py, d.box) == 0.0]
    if containing:
        return min(containing, key=lambda d: d.area)

    reach = cane.reach_px(width, height)
    nearby = [(dist, d) for d in detections if (dist := _distance_to_box(px, py, d.box)) <= reach]
    if nearby:
        return min(nearby, key=lambda t: t[0])[1]
    return None
