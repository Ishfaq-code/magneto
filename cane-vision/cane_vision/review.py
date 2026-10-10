"""Run the detector over photos or videos and report what would be announced.

    python -m cane_vision.review photos/ walk.mp4 --out review/

For each image (and every Nth video frame) this writes an annotated copy and
a row in review.csv, then prints per-class score ranges. Use it with footage
from the real cane camera to tune `confidence`, `labels.min_confidence`, the
tip position and vocabulary.txt.
"""

from __future__ import annotations

import argparse
import csv
import statistics
from collections import Counter, defaultdict
from pathlib import Path

import cv2
import yaml

from .pipeline import DEFAULT_CONFIG, IMAGE_SUFFIXES, CaneVision

VIDEO_SUFFIXES = {".mp4", ".mov", ".avi", ".mkv", ".m4v"}


def frames(paths: list[Path], every: int):
    """Yield (source, frame_index, image) for images and sampled video frames."""
    files: list[Path] = []
    for p in paths:
        files += sorted(f for f in p.rglob("*") if f.is_file()) if p.is_dir() else [p]
    for f in files:
        suffix = f.suffix.lower()
        if suffix in IMAGE_SUFFIXES:
            image = cv2.imread(str(f))
            if image is not None:
                yield f, 0, image
        elif suffix in VIDEO_SUFFIXES:
            cap = cv2.VideoCapture(str(f))
            i = 0
            while True:
                ok, image = cap.read()
                if not ok:
                    break
                if i % every == 0:
                    yield f, i, image
                i += 1
            cap.release()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("paths", nargs="+", type=Path, help="images, videos or folders")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG))
    parser.add_argument("--out", type=Path, default=Path("review"))
    parser.add_argument("--every", type=int, default=15, help="sample every Nth video frame")
    args = parser.parse_args()

    config_path = Path(args.config).resolve()
    config = yaml.safe_load(config_path.read_text()) or {}
    config.setdefault("speech", {})["engine"] = "print"  # review is silent
    app = CaneVision(config, config_path.parent)

    args.out.mkdir(parents=True, exist_ok=True)
    scores: dict[str, list[float]] = defaultdict(list)
    announced: Counter = Counter()
    count = 0
    with open(args.out / "review.csv", "w", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(["source", "frame", "announced", "confidence", "detections"])
        for source, index, image in frames(args.paths, args.every):
            detections, touched = app.process(image)
            for d in detections:
                scores[d.label].append(d.confidence)
            announced[touched.label if touched else "(nothing)"] += 1
            writer.writerow([
                source, index,
                touched.label if touched else "",
                f"{touched.confidence:.2f}" if touched else "",
                "; ".join(f"{d.label} {d.confidence:.2f}" for d in detections),
            ])
            app.draw(image, detections, touched, hint=False)
            name = source.stem + (f"_f{index:05d}" if source.suffix.lower() in VIDEO_SUFFIXES else "")
            cv2.imwrite(str(args.out / f"{name}.jpg"), image)
            count += 1

    if not count:
        raise SystemExit("No images or video frames found.")
    print(f"\n{count} frames -> {args.out}/ (annotated images + review.csv)\n")
    print("Announced at the tip:")
    for label, n in announced.most_common():
        print(f"  {label:<16} {n}")
    print("\nAll detections (count, min / median / max score):")
    for label, s in sorted(scores.items(), key=lambda kv: -len(kv[1])):
        print(f"  {label:<16} {len(s):>4}   {min(s):.2f} / {statistics.median(s):.2f} / {max(s):.2f}")


if __name__ == "__main__":
    main()
