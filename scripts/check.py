"""Check local asset links and 3MF package mesh integrity."""
from pathlib import Path
import json, re, zipfile, xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
web=ROOT/'web'
for path in web.glob('*.html'):
    for link in re.findall(r'(?:src|href)="([^"#]+)"',path.read_text()):
        if '://' not in link: assert (path.parent/link.split('#')[0].split('?')[0]).exists(), (path,link)
ns={'m':'http://schemas.microsoft.com/3dmanufacturing/core/2015/02'}
files=list((ROOT/'exports').rglob('*.3mf'))
# Derive required exports from the CAD manifests as part counts evolve.
expected={ROOT/'exports/readable/assembly_CONCEPT.3mf',ROOT/'exports/servo-reset/assembly_CONCEPT.3mf'}
for model,folder,suffix in [('servo','servo-reset','_DRAFT.3mf'),('eight-cell','eight-cell','_CONCEPT.3mf')]:
    for part in json.loads((web/'models'/f'{model}-design.json').read_text())['parts']:
        if part['printed']: expected.add(ROOT/'exports'/folder/(part['id']+suffix))
expected.update(ROOT/'exports/drive'/(p.name.replace('.mesh.json','_DRAFT.3mf')) for p in (web/'models').glob('0*.mesh.json'))
assert expected.issubset(set(files)), 'Missing CAD exports: '+str(expected-set(files))
for path in files:
    with zipfile.ZipFile(path) as z:
        assert z.testzip() is None
        assert '[Content_Types].xml' in z.namelist() and '_rels/.rels' in z.namelist()
        model=ET.fromstring(z.read('3D/3dmodel.model'))
    assert model.attrib['unit']=='millimeter'
    objects=model.findall('m:resources/m:object',ns)
    assert objects
    for obj in objects:
        vertices=obj.findall('m:mesh/m:vertices/m:vertex',ns)
        triangles=obj.findall('m:mesh/m:triangles/m:triangle',ns)
        assert vertices and triangles
        for t in triangles:
            assert all(0<=int(t.attrib[k])<len(vertices) for k in ['v1','v2','v3'])
            assert len({t.attrib[k] for k in ['v1','v2','v3']})==3
        if path.parent.name in ['drive','eight-cell','split-cart-arms'] or (path.parent.name=='servo-reset' and path.name!='assembly_CONCEPT.3mf'):
            edges={}
            for t in triangles:
                a,b,c=(int(t.attrib[k]) for k in ['v1','v2','v3'])
                for x,y in [(a,b),(b,c),(c,a)]:
                    key=tuple(sorted((x,y)));edges[key]=edges.get(key,0)+1
            assert all(n==2 for n in edges.values()), 'Solid mesh is not closed: '+str(path)
print(f'Asset links and {len(files)} 3MF packages verified; printed part meshes have closed edges. Mechanical operation remains unvalidated.')

# The removable cell must stay identical in standalone and rail exports.
servo=json.loads((web/'models/rail-servo-design.json').read_text())
rail=json.loads((web/'models/eight-cell-design.json').read_text())
for single_id,rail_id in [('cell-base','cell-base'),('reading-plate','reading-plate'),('reset-carrier','catch-carrier'),('plunger-keeper-left','plunger-keeper-left'),('plunger-keeper-right','plunger-keeper-right')]:
    a=next(p for p in servo['parts'] if p['id']==single_id)
    b=next(p for p in rail['parts'] if p['id']==rail_id)
    def vertices(part,offset):
        ps=part['positions']
        return {tuple(round(ps[i+k]+(offset if k==2 else 0),4) for k in range(3)) for i in range(0,len(ps),3)}
    assert vertices(a,20)==vertices(b,0), 'Rail module mismatch: '+single_id
print('Rail renderer and rail cell base, plate and catch exports match after placement offset.')
