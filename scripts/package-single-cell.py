"""Package current standalone solid CAD exports; exclude hardware and rail parts."""
from pathlib import Path
import csv, io, json, math, struct, zipfile
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'web/models/servo-design.json').read_text())
parts=[p for p in data['parts'] if p['printed']]
assert len(parts)==11, 'Review quantities if the standalone design changes'
ns={'m':'http://schemas.microsoft.com/3dmanufacturing/core/2015/02'}
ET.register_namespace('',ns['m'])
manifest=io.StringIO();writer=csv.writer(manifest)
writer.writerow(['File stem','Printed part','Quantity','X mm','Y mm','Z mm'])
output=ROOT/'exports/magneto-single-cell-print-parts.zip'
readme='''MAGNETO SINGLE CELL — DRAFT PRINT PARTS

Latest single-cell design: direct insertion cuts in both guide plates,
collar and ball-seat shoulders seated on the guide layers, original right-pull
catch and bottom housing. No guide closing strips or 8-cell rail parts.

Print 11 components: one housing, one reading plate, one lower guide,
one upper guide, one catch carrier, and six ball-seat plungers.
Print each listed file once. The six plungers are equivalent after centering;
you may instead print pin-1 six times.

Choose either the 3MF folder OR the STL folder, not both. They contain the
same parts. All dimensions are millimeters. Files are centered in X/Y and
placed with their lowest point at Z=0. This preserves the modeled Z-up
orientation, not a tested optimal printing orientation. These 3MFs contain
meshes only, with no printer profile, support, material or slicing settings.
Check orientation and supports in your slicer, especially housing overhangs,
plunger cups/collars and catch fingers. PARTS.csv lists dimensions/quantities.

BOUGHT HARDWARE — NOT PRINT FILES
Six SG90 servos and compatible horns, six 5 mm steel balls, ball-seat adhesive,
and suitable housing/lid fasteners. Guide mounting/retention and servo wiring
are not finalized in this prototype. No cardboard shell is included.

ASSEMBLY
With lid and catch removed, slide each plunger sideways through the aligned
cuts in both guides (left stems from the left, right stems from the right).
The collar seats on the lower guide top at 45.4 mm; the ball-seat shoulder
seats on the upper guide top at 55 mm. Install the catch and lid. Model lift
is 2.4 mm; tab travel is 5 mm. Balls are separate bought hardware for gluing.
Gravity reset animation assumes no sticking. Both rest surfaces require
matching printed heights; verify fit and adjust bearing surfaces if needed.

PROTOTYPE STATUS
These are enlarged, provisional fit-test parts, not validated production CAD
or standard-size Braille. Mesh closure and sampled insertion/lift checks pass;
physical assembly, guide retention, printing tolerance, catch flex, gravity
return and servo performance are unvalidated. Check one plunger/guide fit
before committing to a full build.
'''
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
    for part in parts:
        source=ROOT/'exports/servo-reset'/(part['id']+'_DRAFT.3mf')
        with zipfile.ZipFile(source) as package:
            model=ET.fromstring(package.read('3D/3dmodel.model'))
            vertices=model.findall('.//m:vertex',ns)
            xyz=[tuple(float(v.attrib[k]) for k in ['x','y','z']) for v in vertices]
            low=[min(v[k] for v in xyz) for k in range(3)]
            high=[max(v[k] for v in xyz) for k in range(3)]
            shift=[-(low[0]+high[0])/2,-(low[1]+high[1])/2,-low[2]]
            for vertex,position in zip(vertices,xyz):
                for k,axis in enumerate(['x','y','z']):vertex.set(axis,f'{position[k]+shift[k]:.6f}')
            buffer=io.BytesIO()
            with zipfile.ZipFile(buffer,'w',zipfile.ZIP_DEFLATED) as normalized:
                for name in package.namelist():
                    normalized.writestr(name,ET.tostring(model,encoding='utf-8',xml_declaration=True) if name=='3D/3dmodel.model' else package.read(name))
        stem=part['id']+'_DRAFT'
        archive.writestr('3MF/'+stem+'.3mf',buffer.getvalue())
        positions=part['positions'];triangles=len(positions)//9
        stl=io.BytesIO();stl.write(b'Magneto single-cell solid CAD; millimeters'.ljust(80,b'\0'));stl.write(struct.pack('<I',triangles))
        for i in range(0,len(positions),9):
            v=[[positions[i+j*3+k]+shift[k] for k in range(3)] for j in range(3)]
            a=[v[1][k]-v[0][k] for k in range(3)];b=[v[2][k]-v[0][k] for k in range(3)]
            normal=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
            length=math.sqrt(sum(n*n for n in normal));normal=[n/length if length else 0 for n in normal]
            stl.write(struct.pack('<12fH',*normal,*v[0],*v[1],*v[2],0))
        archive.writestr('STL/'+stem+'.stl',stl.getvalue())
        writer.writerow([stem,part['name'],1,*[round(high[k]-low[k],4) for k in range(3)]])
    archive.writestr('README.txt',readme)
    archive.writestr('PARTS.csv',manifest.getvalue())
    archive.writestr('prototype-parameters.json',json.dumps(data['parameters'],indent=2))
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    assert len([n for n in archive.namelist() if n.endswith('.3mf')])==11
    assert len([n for n in archive.namelist() if n.endswith('.stl')])==11
    for name in archive.namelist():
        if name.endswith('.stl'):
            raw=archive.read(name);assert len(raw)==84+50*struct.unpack_from('<I',raw,80)[0]
        elif name.endswith('.3mf'):
            with zipfile.ZipFile(io.BytesIO(archive.read(name))) as package:assert package.testzip() is None
print(f'{output}: 11 printed components in both 3MF and STL, plus parts list and notes; {output.stat().st_size:,} bytes')
