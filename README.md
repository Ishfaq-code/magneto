# Magneto

A simple local 3D parts viewer for a Braille prototype. View components, assemblies and ideal motion, or save designs in your browser. No Autodesk, web framework or cloud service is required.

## Run on localhost

Install Python 3, clone this repository and run:

```sh
git clone https://github.com/wcia013twe/magneto.git
cd magneto
python3 scripts/serve.py
```

Open **http://127.0.0.1:8080/**. Stop the server with **Ctrl+C**.

If port 8080 is already in use:

```sh
python3 scripts/serve.py --port 8081
```

Then open **http://127.0.0.1:8081/**. On Windows, use `py` in place of `python3` if needed. The included viewer runs offline after cloning; Node and npm are only needed to rebuild CAD.

## Project structure

```text
web/                     Local viewer, controls and bundled Three.js
  models/                Generated meshes and built-in design data
  documents/             Readable manuscript and measurement references
  vendor/                Third-party code and its license
cad/
  drive/                 Four-part drive source, dimensions and manifest
  servo-reset/           Solid servo/reset CAD source and dimensions
  readable/              Research reconstruction notes
exports/
  drive/                 Four individual draft 3MFs and STLs
  servo-reset/           Five individual draft 3MFs and concept assembly
  readable/              Research concept assembly 3MF
scripts/                 Local server, CAD builders, 3MF export and checks
docs/                    Design assumptions and provenance
AGENTS.md                Brief guidance for coding agents
```

## Use the viewer

Open **Designs → Servo + reset → Open** to inspect the solid servo concept. Select dots, click **Write selected**, then **Pull reset tab**. The view selector and checkboxes isolate groups; Explode separates them. Drag to orbit, scroll to zoom and right-drag to pan.

The Designs library includes **Motor arm — four-part drive**, Servo + reset, and the Readable reconstruction. Their source geometry ships with this repository, including `web/models/drive-design.json`, so a fresh browser can install the motor-arm entry. The yellow **8-cell track** button appears only in Servo + reset. **Assemble** restores assembled positions; **Center view** frames the current view. Import STL files to start a design, then name and save it. Saved designs live in localStorage: changing the browser or localhost port creates a separate library, and clearing browser data removes saves. They are not written into this Git repository.

The eight-cell track page is an additional visual concept. Its geometry is not included among the printable exports.

## Rebuild the CAD and 3MF files

Requires Node.js, npm and Python 3:

```sh
npm ci
npm run build:cad
npm run check
```

CAD uses Manifold for joined solid bodies and subtracted holes. Generated 3MFs use millimeters and contain geometry only, without slicer profiles. Open individual `*_DRAFT.3mf` files in a slicer to choose print orientation and settings. Assembly files preserve the assembled positions and include bought hardware envelopes; they are for inspection.

Servo/reset has five printed bodies: housing with support posts, reading plate, lower guide, upper guide and the catch carrier with pull tab. Pins/collars, horns and SG90 bodies are separate hardware representations. All 23 bodies are connected solids; the five printed meshes pass closed-edge checks. Geometry validation does not validate mechanical performance.

Dimensions and tolerances are provisional. Test a single catch and pin before printing the full mechanism. The flex animation illustrates intent, and the model has no force, fatigue or collision simulation. Verify SG90 dimensions, mounting, catch material, friction and gravity return. The four-part drive bearing width and shaft fit also need confirmation. See [design notes](docs/design-notes.md).

## References and licenses

The Readable reconstruction includes the author manuscript, documented measurements and approximation notes under `web/documents/`. It is independently reconstructed geometry, not the authors' original CAD. Third-party manuscript rights remain with the authors/publisher. The servo/reset catch mechanism is a new concept inspired by six-servo actuation and guided pins.

Three.js is vendored under its MIT license in `web/vendor/THREE-LICENSE.txt`. Manifold is an npm dependency under its own license. This repository does not grant additional rights to reference documents.
