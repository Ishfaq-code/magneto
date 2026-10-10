"""Build unit-scale resin STL batches from the current shared CAD mesh exports."""
from pathlib import Path
import csv
import json
import math
import struct
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'exports/resin-stl'


def parts(model):
    return {p['id']: p for p in json.loads((ROOT / f'web/models/{model}-design.json').read_text())['parts']}


def stl(part):
    assert part['printed'], 'Bought hardware must not be exported'
    ps = part['positions']
    assert len(ps) % 9 == 0 and all(math.isfinite(x) for x in ps)
    low = [min(ps[k::3]) for k in range(3)]
    size = [max(ps[k::3]) - low[k] for k in range(3)]
    # Translation only: bring each separate part to the origin, preserving mm scale.
    data = bytearray(b'Magneto CONCEPT; import as millimeters; unsupported'.ljust(80, b'\0'))
    data.extend(struct.pack('<I', 0))
    retained = []
    for i in range(0, len(ps), 9):
        v = [ps[i+j] - low[j % 3] for j in range(9)]
        a = [v[j+3] - v[j] for j in range(3)]
        b = [v[j+6] - v[j] for j in range(3)]
        n = [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
        length = math.sqrt(sum(x*x for x in n))
        if length == 0:
            continue
        retained.append(i)
        data.extend(struct.pack('<12fH', *[x/length for x in n], *v, 0))
    struct.pack_into('<I', data, 80, len(retained))
    assert len(data) == 84 + 50 * len(retained)
    # Read back every vertex; conversion may only introduce float32 rounding.
    for t, record in enumerate(struct.iter_unpack('<12fH', data[84:])):
        for j, x in enumerate(record[3:12]):
            assert abs(x - (ps[retained[t]+j] - low[j % 3])) < 0.0001
    return data, size


rail = parts('eight-cell')
station = parts('rail-servo')
selected = {key: rail[key] for key in ['cell-base', 'reading-plate', 'catch-carrier', 'reset-bracket', 'reset-flap', 'plunger-keeper-left', 'plunger-keeper-right']}
selected.update({'ball-seat-plunger': station['pin-1'], 'servo-docking-base': station['housing']})
payloads = {key: stl(part) for key, part in selected.items()}
# Distinct filename for the requested guide-clearance revision.
(ROOT / 'exports/cell-base_slotted_extra-0p6mm-headroom_CONCEPT.stl').write_bytes(payloads['cell-base'][0])
for key in ['cell-base', 'plunger-keeper-left', 'plunger-keeper-right']:
    (ROOT / 'exports' / (key + '_screw-keeper_CONCEPT.stl')).write_bytes(payloads[key][0])
# These are quantity folders, not arranged or supported build plates.
batches = {
    'bed-A-quantity-plan': {'cell-base': 4, 'reading-plate': 4, 'catch-carrier': 4, 'ball-seat-plunger': 24, 'reset-bracket': 1, 'plunger-keeper-left': 4, 'plunger-keeper-right': 4},
    'bed-B-quantity-plan': {'cell-base': 4, 'reading-plate': 4, 'catch-carrier': 4, 'ball-seat-plunger': 24, 'reset-flap': 1, 'plunger-keeper-left': 4, 'plunger-keeper-right': 4},
    'optional-extras': {'ball-seat-plunger': 12, 'catch-carrier': 2, 'reading-plate': 1, 'servo-docking-base': 1},
}
guide = '''MAGNETO — EIGHT-CELL RESIN STL PACK (CONCEPT)

Import STLs in MILLIMETERS at 100% scale. STL does not encode units.
Each file contains ONE part. Duplicate it to the quantity in its filename.
Bed A and Bed B are suggested quantity allocations, NOT arranged print beds.
Printer models/build volumes are unknown. They may require multiple runs.
No supports, rafts, exposure, orientation or resin profile are supplied.
Parts are translated to the origin only, retaining the original CAD axes.
Use the compatible resin manufacturer's print/wash/cure profile in your slicer.
Support and orientation footprints must be included when checking bed fit.

Each batch: 4 bases, 4 plates, 4 carriers, 24 plungers, 4 left and 4 right keepers.
Bed A additionally has 1 reset bracket; Bed B has 1 reset flap.
Total required: 8 bases + 8 plates + 8 carriers + 48 plungers + 1 bracket + 1 flap + 8 left and 8 right keepers.
Optional extras are outside these totals and are not promised to fit either bed:
12 spare plungers, 2 spare carriers, 1 spare plate, 1 shared servo docking base.
The docking base is needed only if you do not already have it; filament is reasonable.

FIRST TRIAL: print one base, plate, carrier and six plungers before bulk production.
CLEARANCE REVISION: upper stem guide raised 0.6 mm. At least 3 mm guide travel
is checked; normal lift remains 2.4 mm. Collar-to-upper-guide headroom at rest
is now 5.0 mm (previously 4.4 mm), not a 3 mm mechanical travel stop.
REVISION: six side-entry stem slots restored in the shared cell base, with matching
foot entry openings. Stem slots are 2.5 mm wide; lower foot slots are 6.6 mm wide.
Insert plungers from the nearest left/right side with the lid and catch carrier
removed and the module off the servo base. Fit both removable comb keepers after
loading plungers. Each keeper takes two bought M3 x 8 screws through 3.3 mm holes
into 2.5 mm tap pilots in dedicated pillars. Tap M3 x 0.5 threads after printing.
Nominal keeper thickness 2 mm, seated on the guide, thread engagement 6 mm;
pilot depth 8 mm. Verify usable blind thread depth and actual screw length.
Remove screws and slide keepers outward for service with the module out of its tray.
Keeper tongues have 0.2 mm side clearance in entry slots and stop 0.45 mm from the
nominal shaft surface; these fits and printed strength require a physical trial.
Required per cell: one left keeper, one right keeper, FOUR additional M3 x 8 screws.
Eight cells: 16 keepers and 32 keeper screws, additional to the 32 lid screws.
Open slots do not retain plungers until keepers are fitted. Do not force a cured fit.
After full curing, test ball seats, free movement, catch/reset operation and lid threads.
Carrier return leaves are 0.8 mm thick; require resilient material and repeated-cycle
physical trials. Generic brittle resin is a poor choice for these flexures.
Keep support scars away from sliding stems, guide holes, ball cups, cam/pivot faces
and thin spring leaves where feasible. Inspect and clean fits after support removal.
Plates need flatness checks. Base posts have 2.5 mm blind tap pilots: cut M3 x 0.5
threads, check usable depth and test one cured post before assembling all eight.
Do not force the nail into the bracket's provisional retaining socket.

Bought hardware (NOT printed): 48 steel balls of nominal 5 mm diameter, 32 M3 x 8
lid screws, six servos and appropriate station hardware, nominal 3 x 16 mm reset
nail. Drive, cart wheels and electronics require their own hardware separately.
Do not add obsolete rail stands, separate lid standoffs, or illustrative wheel
mounts/motor pedestal/towing eye to this resin run. Those are unnecessary or lack
fabrication detail. Large casing and arms are excluded from these resin batches.

All geometry, fits and dimensions are provisional. Mesh validation and prescribed
viewer motion do not establish strength, fatigue life or mechanical reliability.
The current rail CAD supplies bases/plates/carriers/reset parts; the shared rail
servo CAD supplies plungers and docking base. No old single-cell ZIP is reused.
Rebuild: npm run build:cad
Material background: https://formlabs.com/support/Using-Tough-1500-Resin-V1/
Resin compatibility with your printer must be confirmed; no brand is prescribed.
'''
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'READ-ME.txt').write_text(guide)
rows = []
for folder, quantities in batches.items():
    destination = OUT / folder
    destination.mkdir(exist_ok=True)
    for key, qty in quantities.items():
        data, size = payloads[key]
        name = f'{key}_CONCEPT_qty-{qty:02d}.stl'
        (destination / name).write_bytes(data)
        rows.append([folder, name, qty, *[round(x, 3) for x in size]])
with (OUT / 'quantities.csv').open('w', newline='') as stream:
    writer = csv.writer(stream)
    writer.writerow(['batch', 'file_contains_one_part', 'copies_to_print', 'size_x_mm', 'size_y_mm', 'size_z_mm'])
    writer.writerows(rows)
archive = ROOT / 'exports/magneto-eight-cell-resin-STL.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as package:
    for file in sorted(OUT.rglob('*')):
        if file.is_file():
            package.write(file, file.relative_to(OUT))
with zipfile.ZipFile(archive) as package:
    assert package.testzip() is None
print(f'{archive.relative_to(ROOT)}: {len(rows)} single-part STLs in two quantity plans plus optional extras; vertex round trips verified.')

# Focused revision pack: one revised base and both keeper strips per cell.
with zipfile.ZipFile(ROOT / 'exports/magneto-screw-keeper-update-STL.zip', 'w', zipfile.ZIP_DEFLATED) as package:
    for key in ['cell-base', 'plunger-keeper-left', 'plunger-keeper-right']:
        file = ROOT / 'exports' / (key + '_screw-keeper_CONCEPT.stl')
        package.write(file, file.name)
    package.writestr('ASSEMBLY.txt', 'KEEPER UPDATE: print one of each STL per cell. Import in mm at 100% scale. Use the new base, not an earlier base without keeper pillars.\n\n' + guide)

# Complete passive module only. Each STL is printed once; six pin files avoid
# requiring the recipient to infer slicer duplication quantities.
top_files = {}
for key in ['cell-base', 'reading-plate', 'catch-carrier', 'plunger-keeper-left', 'plunger-keeper-right']:
    top_files[key + '_CONCEPT.stl'] = payloads[key][0]
for number in range(1, 7):
    top_files[f'plunger-{number:02d}_CONCEPT.stl'] = payloads['ball-seat-plunger'][0]
top_guide = '''ONE PASSIVE TOP MODULE — FIT-TEST PRINT

Print each of the 11 STL files ONCE:
1 integrated cell base with slotted guides, stops and keeper pillars
1 reading plate
1 catch carrier with reset tab and return leaves
1 left keeper + 1 right keeper
6 identical ball-seat plungers (six separate files provided)

Import in MILLIMETERS at 100% scale. STLs have no encoded units.
Unsupported solids only: orient, support and slice for your printer/material.
This pack excludes the servo base, servos, horns and shared automatic-reset station.

Bought hardware: 6 nominal 5 mm steel balls and suitable adhesive for their seats;
8 M3 x 8 screws total (4 lid + 4 keeper screws). Nominal stacks omit washers.
Pillar holes are 2.5 mm tap pilots, NOT printed threads. Cut M3 x 0.5 threads,
prepare at least 6 mm usable thread, and verify depth without forcing screws.
Lid pilot depth 9 mm; keeper pilot depth 8 mm. Test a fully cured pillar first.

Fit-test sequence: with the lid, carrier and keepers off and the cell undocked,
check each plunger enters from its nearest side. Check carrier assembly and free
reset movement before fastening the lid. Slide the keepers inward and secure
with two screws each. Fit the balls and reading plate, fastened with four screws.
Check all six plungers can move and reset without rubbing. The complete physical
assembly sequence, catch flexure and printed tolerances still require a trial.
For service, remove keeper screws and slide the strips outward; remove the cell
from any surrounding tray first. Keep support scars away from sliding surfaces.

Operating lift remains 2.4 mm. Geometry checks cover 0–3 mm guide travel and
modeled horn clearance. Thin 0.8 mm carrier leaves need a resilient material.
Checks do not establish printed strength, fatigue life or mechanical reliability.

Existing bottom-module compatibility: current locating sockets are centered at
X +/-22 mm and Y +/-30 mm (44 x 60 mm center spacing), nominal diameter 3.3 mm
and 1.55 mm modeled depth. Compare your existing base before printing; older
bases may differ. These sockets locate the cell and are not a screw connection.
Do not reprint your servo base simply to use this pack.
'''
top_archive = ROOT / 'exports/magneto-one-top-module-STL.zip'
with zipfile.ZipFile(top_archive, 'w', zipfile.ZIP_DEFLATED) as package:
    for name, data in top_files.items():
        package.writestr(name, data)
    package.writestr('READ-ME-FIRST.txt', top_guide)
with zipfile.ZipFile(top_archive) as package:
    assert package.testzip() is None
    assert len([n for n in package.namelist() if n.endswith('.stl')]) == 11
print(f'{top_archive.relative_to(ROOT)}: complete passive top module, 11 single-part STLs; print each once.')
