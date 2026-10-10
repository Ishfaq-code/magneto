"""Map raw model class names to what we say and what we spell."""

from __future__ import annotations

from dataclasses import dataclass

# COCO names that read badly when spoken or take too long to spell.
DEFAULT_RENAMES: dict[str, str] = {
    "dining table": "table",
    "potted plant": "plant",
    "cell phone": "phone",
    "tv": "TV",
    "fire hydrant": "hydrant",
    "parking meter": "meter",
    "sports ball": "ball",
    "wine glass": "glass",
    "hair drier": "hair dryer",
    "baseball bat": "bat",
    "baseball glove": "glove",
    "tennis racket": "racket",
}


@dataclass(frozen=True)
class Announcement:
    spoken: str
    braille: str


class LabelMap:
    def __init__(self, renames: dict[str, str] | None = None, ignore: list[str] | None = None):
        self.renames = {**DEFAULT_RENAMES, **(renames or {})}
        self.ignore = set(ignore or [])

    def allowed(self, label: str) -> bool:
        return label not in self.ignore

    def __call__(self, label: str) -> Announcement:
        word = self.renames.get(label, label)
        return Announcement(spoken=word, braille=word.lower())
