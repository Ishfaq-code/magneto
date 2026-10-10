# Agent guide

- Keep this a simple local static viewer; avoid frameworks or cloud services unless requested.
- Run `python3 scripts/serve.py`; the site root is `web/`.
- Edit CAD sources in `cad/` and builders in `scripts/`. Rebuild with `npm run build:cad`; do not hand-edit generated meshes or 3MFs.
- Use millimeters. Keep printed parts separate from bought hardware, and identify provisional measurements and concept-only geometry.
- Servo/reset browser geometry comes from the same solid CAD export as its 3MFs. Preserve this shared source.
- Run `npm run check`, then check affected views and animations in the browser. Never imply that mesh checks prove mechanical reliability.
- Preserve browser-local saved designs, the localhost workflow, reference documents and third-party licenses.
