# cane-vision

Points a camera where the cane tip touches, identifies the object with YOLO,
says it out loud and spells it on the single Braille cell.

```
camera frame ─▶ YOLO ─▶ box at the cane tip ─▶ vote over last frames ─▶ speech
                                                                     └▶ Braille cell
```

## Assumptions (no extra hardware yet)

- **Predefined cane.** The camera is rigidly mounted on the shaft, so the tip
  is always at a fixed spot in the image (`cane.tip_x`, `cane.tip_y` in
  `config.yaml`). The touched object is the smallest box containing that
  spot, or failing that the nearest box within `cane.reach`.
- **Simulated touch.** `key` mode: press SPACE to tap. `dwell` mode: resting
  the tip on the same object for `dwell_frames` frames counts as a tap.
- **Console cell.** Braille goes to the terminal (`⠓  dots 1,2,5`) and to a
  cell drawn in the corner of the preview. The Arduino/servo cell can later
  replace `ConsoleCell` in `cane_vision/cell.py` without touching the vision side.

## Run

```bash
cd cane-vision
python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt

.venv/bin/python -m cane_vision                         # webcam, SPACE to tap
.venv/bin/python -m cane_vision --mode dwell            # webcam, rest to tap
.venv/bin/python -m cane_vision --source photo.jpg      # single image
.venv/bin/python -m cane_vision --source clip.mp4 --no-display
.venv/bin/python -m pytest                              # tests
```

The first run downloads `yolo11n.pt` (COCO, 80 classes).

## Jetson Orin Nano

1. Install PyTorch/torchvision builds for your JetPack version (from NVIDIA),
   then `pip install ultralytics`.
2. Export once to TensorRT: `yolo export model=yolo11n.pt format=engine half=True`
3. Set `detector.model: yolo11n.engine` in `config.yaml`.
4. Speech: ElevenLabs if `ELEVENLABS_API_KEY` is set (see below). For the
   offline voice/fallback, install Piper and a voice and set
   `speech.piper_model`; otherwise `espeak-ng` is used.

## Voice (ElevenLabs)

Set your key and the pipeline uses ElevenLabs automatically:

```bash
export ELEVENLABS_API_KEY=sk_...
.venv/bin/python -m cane_vision
```

- Each phrase is synthesized once and cached as a WAV in
  `~/.cache/cane-vision/elevenlabs/`. Repeat announcements play instantly and
  work offline. Set `speech.elevenlabs.prewarm: true` to cache every class
  name at startup.
- If ElevenLabs fails (no key, no network, quota, or more than `timeout_s`),
  the local voice speaks instead: `say` on macOS, Piper or espeak-ng on Linux.
- Voice, model and phrasing are under `speech:` in `config.yaml`. The default
  model is `eleven_flash_v2_5` (fastest); `eleven_v4_turbo` is more expressive.
- Playback uses `afplay` on macOS and `aplay` on the Jetson.

## Beyond COCO

COCO has no door, stairs, wall, pole, curb or trash can. To add them without
training, set `detector.model` to a YOLO-World checkpoint (e.g.
`yolov8s-worldv2.pt`) and list the objects under `detector.vocabulary`.
