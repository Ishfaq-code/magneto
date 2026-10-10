"""Export mesh geometry to basic 3MF Core packages (millimeters, no slicer settings)."""
from pathlib import Path
import json, math, zipfile, shutil
import xml.etree.ElementTree as ET
ROOT = Path(__file__).resolve().parents[1]
NS = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02'
ET.register_namespace('', NS)
def write_3mf(path, parts):
    tag = lambda s: '{'+NS+'}'+s
    model = ET.Element(tag('model'), unit='millimeter')
    resources = ET.SubElement(model, tag('resources'))
    build = ET.SubElement(model, tag('build'))
    for number, part in enumerate(parts, 1):
        obj = ET.SubElement(resources, tag('object'), id=str(number), type='model', name=part['name'])
        mesh = ET.SubElement(obj, tag('mesh'))
        vs = ET.SubElement(mesh, tag('vertices'))
        ts = ET.SubElement(mesh, tag('triangles'))
        positions = part['positions']; indices = {}; vertices = []; triangles = []
        for i in range(0, len(positions), 9):
            triangle = []
            for k in range(3):
                v = tuple(round(float(x), 6) for x in positions[i+k*3:i+k*3+3])
                if len(v)!=3 or not all(math.isfinite(x) for x in v): raise ValueError('Invalid vertex')
                if v not in indices: indices[v]=len(vertices); vertices.append(v)
                triangle.append(indices[v])
            if len(set(triangle))==3: triangles.append(triangle)
        for x,y,z in vertices: ET.SubElement(vs, tag('vertex'), x=str(x), y=str(y), z=str(z))
        for a,b,c in triangles: ET.SubElement(ts, tag('triangle'), v1=str(a), v2=str(b), v3=str(c))
        ET.SubElement(build, tag('item'), objectid=str(number))
    path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as out:
        out.writestr('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>')
        out.writestr('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>')
        out.writestr('3D/3dmodel.model', ET.tostring(model, encoding='utf-8', xml_declaration=True))
    print(path.relative_to(ROOT), len(parts), 'objects')
for path in sorted((ROOT/'web/models').glob('0*.mesh.json')):
    triangles=json.loads(path.read_text())
    positions=[x for tri in triangles for v in tri for x in v]
    write_3mf(ROOT/'exports/drive'/(path.name.replace('.mesh.json','_DRAFT.3mf')), [{'name':path.stem, 'positions':positions}])
for name,folder in [('readable','readable'),('servo','servo-reset')]:
    data=json.loads((ROOT/'web/models'/f'{name}-design.json').read_text())
    write_3mf(ROOT/'exports'/folder/'assembly_CONCEPT.3mf',data['parts'])

servo=json.loads((ROOT/'web/models/servo-design.json').read_text())
for part in servo['parts']:
    if part['printed']:
        write_3mf(ROOT/'exports/servo-reset'/(part['id']+'_DRAFT.3mf'),[part])

for part in json.loads((ROOT/"web/models/eight-cell-design.json").read_text())["parts"]:
    if part["printed"]: write_3mf(ROOT/"exports/eight-cell"/(part["id"]+"_CONCEPT.3mf"),[part])

# Serve prototype downloads from the same local viewer root.
for name in ["reset-bracket", "reset-flap", "catch-carrier", "cell-base", "drive-long-arm", "drive-short-arm", "casing", "casing-panel"]:
    shutil.copyfile(ROOT/"exports/eight-cell"/(name+"_CONCEPT.3mf"),ROOT/"web/models"/(name+"_CONCEPT.3mf"))


# The superseded printed axle is now bought hardware, excluded from print exports.
for path in [ROOT/"exports/eight-cell/reset-axle_CONCEPT.3mf", ROOT/"web/models/reset-axle_CONCEPT.3mf"]:
    path.unlink(missing_ok=True)

# Finger joints supersede the removable side's separate printed lock pins.
for name in ['casing-lock-pin-1','casing-lock-pin-2']:
    for folder in [ROOT/'exports/eight-cell',ROOT/'web/models']:
        (folder/(name+'_CONCEPT.3mf')).unlink(missing_ok=True)

# Optional bonded split variant, generated from the original shared solids.
split=json.loads((ROOT/'web/models/split-print-design.json').read_text())
split_dir=ROOT/'exports/split-cart-arms'
for part in split['parts']:
    positions=part['positions']; low=part['low']
    write_3mf(split_dir/(part['id']+'_CONCEPT.3mf'),[{**part,'positions':[v-low[i%3] for i,v in enumerate(positions)]}])
for i,bed in enumerate(split['beds'],1):
    name=f'plate-{i}_256x256_CONCEPT.3mf'
    write_3mf(split_dir/name,bed['parts'])
    shutil.copyfile(split_dir/name,ROOT/'web/models'/name)
shutil.copyfile(ROOT/'cad/eight-cell/SPLIT-PRINT.md',split_dir/'READ-ME.md')
with zipfile.ZipFile(ROOT/'exports/cart-arms-keyed-256mm.zip','w',zipfile.ZIP_DEFLATED) as archive:
    for path in [split_dir/(p['id']+'_CONCEPT.3mf') for p in split['parts']]+[split_dir/f'plate-{i}_256x256_CONCEPT.3mf' for i in range(1,len(split['beds'])+1)]+[split_dir/'READ-ME.md']:archive.write(path,path.name)
shutil.copyfile(ROOT/'exports/cart-arms-keyed-256mm.zip',ROOT/'web/models/cart-arms-keyed-256mm.zip')

# Single-bed deliverable; remove only superseded generated plate layouts.
if len(split['beds'])==1:
    shutil.copyfile(split_dir/'plate-1_256x256_CONCEPT.3mf',ROOT/'exports/cart-arms-single-bed-256x256_CONCEPT.3mf')
for folder in [split_dir,ROOT/'web/models']:
    for path in folder.glob('plate-*_256x256_CONCEPT.3mf'):
        if int(path.name.split('_')[0].split('-')[1])>len(split['beds']):path.unlink()
