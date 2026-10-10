"""Package standalone printed 3MFs, omitting the catch carrier."""
from pathlib import Path
import csv
import io
import json
import zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / 'web/models/servo-design.json').read_text())
parts = [p for p in data['parts'] if p['printed'] and p['id'] != 'reset-carrier']
assert {p['id'] for p in parts} == {
    'housing', 'reading-plate', 'lower-guide', 'upper-guide',
    *[f'pin-{i}' for i in range(1, 7)],
}
ns = {'m': 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02'}
ET.register_namespace('', ns['m'])
output = ROOT / 'exports/magneto-single-cell-3mf-no-catch.zip'
manifest = io.StringIO()
writer = csv.writer(manifest)
writer.writerow(['File', 'Part', 'Quantity', 'X mm', 'Y mm', 'Z mm'])
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for part in parts:
        filename = part['id'] + '_DRAFT.3mf'
        with zipfile.ZipFile(ROOT / 'exports/servo-reset' / filename) as source:
            model = ET.fromstring(source.read('3D/3dmodel.model'))
            vertices = model.findall('.//m:vertex', ns)
            xyz = [tuple(float(v.attrib[k]) for k in ('x', 'y', 'z')) for v in vertices]
            low = [min(v[k] for v in xyz) for k in range(3)]
            high = [max(v[k] for v in xyz) for k in range(3)]
            shift = [-(low[0] + high[0]) / 2, -(low[1] + high[1]) / 2, -low[2]]
            for vertex, position in zip(vertices, xyz):
                for k, axis in enumerate(('x', 'y', 'z')):
                    vertex.set(axis, f'{position[k] + shift[k]:.6f}')
            buffer = io.BytesIO()
            with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as normalized:
                for name in source.namelist():
                    normalized.writestr(name, ET.tostring(model, encoding='utf-8', xml_declaration=True)
                                        if name == '3D/3dmodel.model' else source.read(name))
        archive.writestr('3MF/' + filename, buffer.getvalue())
        writer.writerow([filename, part['name'], 1, *[round(high[k] - low[k], 4) for k in range(3)]])
    archive.writestr('PARTS.csv', manifest.getvalue())
    archive.writestr('README.txt', '''MAGNETO SINGLE CELL — 3MF PRINT PARTS, NO CATCH

Ten printed components: housing, reading plate, lower guide, upper guide,
and six plungers. Print each 3MF once. Catch carrier and pull tab are omitted.
Bought servos, horns and 5 mm steel balls, cardboard shell and 8-cell rail
are excluded. Existing housing geometry is preserved.

Millimeters; each part is centered in X/Y with its bottom at Z=0.
Import into OrcaSlicer with the Centauri Carbon printer selected. These are
individual mesh files, not a sliced project or an arranged print bed.
Check orientations and enable supports where needed before slicing.
No printer profile, material settings or supports are embedded.

Provisional prototype geometry; physical fit and mechanical operation are
not validated. Without the catch, the plungers will not latch raised.
''')
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    names = [n for n in archive.namelist() if n.endswith('.3mf')]
    assert len(names) == 10 and not any('catch' in n or 'carrier' in n for n in names)
    for name in names:
        with zipfile.ZipFile(io.BytesIO(archive.read(name))) as package:
            assert package.testzip() is None
            assert ET.fromstring(package.read('3D/3dmodel.model')).get('unit') == 'millimeter'
print(f'{output}: 10 printed 3MFs; catch excluded; {output.stat().st_size:,} bytes')
