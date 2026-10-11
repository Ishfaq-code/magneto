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
- **Braille cell.** With an Arduino running `../cell-firmware` plugged in, the
  word is sent to it over USB (`cell.port: auto`) and the servos spell it.
  Without one, Braille goes to the terminal (`⠓  dots 1,2,5`). Either way it
  is mirrored on a cell drawn in the corner of the preview. See
  [cell-firmware](../cell-firmware/README.md) for wiring and calibration.

## Run

```bash
cd cane-vision
python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt

.venv/bin/python -m cane_vision                         # webcam, SPACE to tap
.venv/bin/python -m cane_vision --mode dwell            # webcam, rest to tap
.venv/bin/python -m cane_vision --source photo.jpg      # single image
.venv/bin/python -m cane_vision --source clip.mp4 --no-display
.venv/bin/python -m cane_vision --cell none             # ignore a connected Arduino
.venv/bin/python -m pytest                              # tests
```

The first run downloads `yolov8s-worldv2.pt` and the CLIP text encoder
(Ultralytics installs it automatically).

## Speed: GPU acceleration

`detector.device: auto` (the default) runs YOLO on the fastest device it
finds. The startup line shows which one it picked (`device: ...`):

| Machine                  | Device   | What you need                                |
| ------------------------ | -------- | -------------------------------------------- |
| Jetson Orin Nano         | `cuda:0` | NVIDIA's PyTorch build for your JetPack (below) |
| PC with an NVIDIA GPU    | `cuda:0` | A CUDA build of PyTorch (below)              |
| Apple Silicon Mac        | `mps`    | Nothing; the normal install already has it   |
| Anything else            | `cpu`    | Slow; lower `image_size`                     |

On CUDA it also runs in FP16. Measured on an Apple Silicon Mac with the full
vocabulary: CPU 76 ms/frame (13 fps) against MPS 18 ms/frame (56 fps) at 640 px.

Live cameras are read on their own thread, and only the newest frame goes to
the detector. So a slow device lowers the frame rate, but the view never falls
behind. Other ways to go faster: `image_size: 480` (about 25% faster), a
baked model (`python -m cane_vision.bake`), and TensorRT on NVIDIA (below).

**Check CUDA is working** after installing:

```bash
.venv/bin/python -c "import torch; print(torch.cuda.is_available(), torch.version.cuda)"
```

It must print `True`. If it prints `False`, pip installed the CPU-only
PyTorch, which is what plain `pip install ultralytics` gets on Linux ARM and
on Windows.

**PC with an NVIDIA GPU:** install the NVIDIA driver, then replace PyTorch with
a CUDA build. Use the command from https://pytorch.org/get-started/locally/ for
your CUDA version, for example:

```bash
.venv/bin/pip install --force-reinstall torch torchvision --index-url https://download.pytorch.org/whl/cu128
```

## Jetson Orin Nano

1. **PyTorch with CUDA.** The PyPI wheels have no CUDA on the Jetson, so use
   one of these:
   - **Docker (easiest):**
     `sudo docker run -it --ipc=host --runtime=nvidia ultralytics/ultralytics:latest-jetson-jetpack6`
     (pick the tag for your JetPack version).
   - **Native:** install NVIDIA's PyTorch and torchvision wheels for your
     JetPack version, as listed in the Ultralytics Jetson guide
     (https://docs.ultralytics.com/guides/nvidia-jetson/). Then run
     `pip install ultralytics` and the rest of `requirements.txt`.

   Then run the CUDA check above.
2. **TensorRT (fastest).** Bake the vocabulary and export it on the Jetson
   itself, because engines are tied to the GPU they were built on:
   `.venv/bin/python -m cane_vision.bake --export engine --half`
3. In `config.yaml`, set `detector.model: models/cane-world.engine` and
   remove `detector.vocabulary`.
4. **Max performance mode.** Select the highest power mode with
   `sudo nvpmodel -m <id>` (the ids for your board are listed in
   `/etc/nvpmodel.conf`), then run `sudo jetson_clocks`.
5. **Speech:** ElevenLabs if `ELEVENLABS_API_KEY` is set (see below). For the
   offline voice and fallback, install Piper and a voice and set
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

## Vocabulary (YOLO-World)

The detector is YOLO-World, an open-vocabulary model: it finds whatever names
are listed in `vocabulary.txt` instead of COCO's fixed 80 classes. The list
covers what a cane runs into: doors, stairs, curbs, poles, bollards, trash
cans, fences, furniture, vehicles and people. The name you list is the word
that gets spoken and spelled.

- **Edit `vocabulary.txt`** to add or remove objects; no training needed.
  Keep names short and distinct. Near-synonyms ("pole", "post", "lamp post")
  compete with each other, and a longer list lowers every score somewhat.
- **Bake it** for faster startup and deployment:
  `python -m cane_vision.bake` writes `models/cane-world.pt` with the names
  built in (add `--export onnx` or `--export engine`). Point
  `detector.model` at it and remove `detector.vocabulary`.
- **COCO only:** set `model: yolo11n.pt`, remove `vocabulary` and raise
  `confidence` to about 0.4. It's faster but can't see doors, stairs, poles or
  curbs.
- Open-vocabulary scores run lower than COCO's, so `confidence` defaults to
  0.25. Raise it if you get false announcements, or raise just the noisy
  names with `labels.min_confidence` (e.g. `{mailbox: 0.45}`).

## Tune on real footage

Record photos or video from the cane camera, then:

```bash
.venv/bin/python -m cane_vision.review photos/ walk.mp4 --out review/
```

It writes an annotated copy of each image (and every 15th video frame),
`review.csv` with what would be announced at the tip, and a per-class
min/median/max score table. Use it to set `cane.tip_x`/`tip_y`, the confidence
thresholds and `vocabulary.txt`.
