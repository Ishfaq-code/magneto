"""Check local asset links and 3MF package mesh integrity."""
from pathlib import Path
import re, zipfile, xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
web=ROOT/'web'
for path in web.glob('*.html'):
    for link in re.findall(r'(?:src|href)="([^"#]+)"',path.read_text()):
        if '://' not in link: assert (path.parent/link.split('#')[0]).exists(), (path,link)
ns={'m':'http://schemas.microsoft.com/3dmanufacturing/core/2015/02'}
files=list((ROOT/'exports').rglob('*.3mf'))
assert len(files)==11
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
        if path.parent.name=='drive' or (path.parent.name=='servo-reset' and path.name!='assembly_CONCEPT.3mf'):
            edges={}
            for t in triangles:
                a,b,c=(int(t.attrib[k]) for k in ['v1','v2','v3'])
                for x,y in [(a,b),(b,c),(c,a)]:
                    key=tuple(sorted((x,y)));edges[key]=edges.get(key,0)+1
            assert all(n==2 for n in edges.values()), 'Solid mesh is not closed: '+str(path)
print('Asset links and eleven 3MF packages verified; nine printed part meshes have closed edges.')
