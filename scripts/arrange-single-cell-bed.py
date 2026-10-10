"""Arrange current printed standalone parts in one millimeter 3MF bed layout."""
from pathlib import Path
import argparse, copy, json, math, struct, zipfile
import xml.etree.ElementTree as ET
parser=argparse.ArgumentParser();parser.add_argument('--width',type=float,required=True);parser.add_argument('--depth',type=float,required=True);parser.add_argument('--top-module',action='store_true');args=parser.parse_args()
ROOT=Path(__file__).resolve().parents[1];margin=20;gap=5
NS='http://schemas.microsoft.com/3dmanufacturing/core/2015/02';ns={'m':NS};ET.register_namespace('',NS);tag=lambda s:'{'+NS+'}'+s
parts=[p for p in json.loads((ROOT/'web/models/servo-design.json').read_text())['parts'] if p['printed']]
if args.top_module:
 parts=[p for p in parts if p['id']!='housing']
 assert len(parts)==11
items=[]
for part in parts:
 source=ROOT/'exports/servo-reset'/(part['id']+'_DRAFT.3mf')
 with zipfile.ZipFile(source) as package:model=ET.fromstring(package.read('3D/3dmodel.model'))
 obj=model.find('m:resources/m:object',ns);vertices=obj.findall('m:mesh/m:vertices/m:vertex',ns)
 xyz=[tuple(float(v.attrib[k]) for k in ['x','y','z']) for v in vertices]
 low=[min(p[k] for p in xyz) for k in range(3)];high=[max(p[k] for p in xyz) for k in range(3)]
 items.append(dict(part=part,obj=obj,xyz=xyz,low=low,size=[high[k]-low[k] for k in range(3)]))
# Guillotine packing with both XY orientations; preserve original Z-up orientation.
free=[(margin,margin,args.width-2*margin,args.depth-2*margin)];placed=[]
for item in sorted(items,key=lambda p:p['size'][0]*p['size'][1],reverse=True):
 choices=[]
 for index,(x,y,w,h) in enumerate(free):
  for rotated in [False,True]:
   sw,sh=item['size'][:2][::-1] if rotated else item['size'][:2]
   if sw<=w and sh<=h:choices.append((min(w-sw,h-sh),w*h-sw*sh,index,rotated,sw,sh))
 if not choices:raise SystemExit(f'Parts do not fit on one {args.width:g} × {args.depth:g} mm bed with {margin} mm margins and {gap} mm gaps.')
 _,_,index,rotated,sw,sh=min(choices);x,y,w,h=free.pop(index)
 item.update(x=x,y=y,w=sw,h=sh,rotated=rotated);placed.append(item)
 # Leave a full-width region above and a row-height region to the right.
 if w-sw-gap>0:free.append((x+sw+gap,y,w-sw-gap,sh))
 if h-sh-gap>0:free.append((x,y+sh+gap,w,h-sh-gap))
model=ET.Element(tag('model'),unit='millimeter');ET.SubElement(model,tag('metadata'),name='Title').text=f'Magneto single cell — {args.width:g} × {args.depth:g} mm bed'
resources=ET.SubElement(model,tag('resources'));build=ET.SubElement(model,tag('build'))
for number,item in enumerate(placed,1):
 obj=copy.deepcopy(item['obj']);obj.set('id',str(number));obj.set('name',item['part']['name'])
 for vertex,position in zip(obj.findall('m:mesh/m:vertices/m:vertex',ns),item['xyz']):
  x,y,z=[position[k]-item['low'][k] for k in range(3)]
  if item['rotated']:x,y=item['size'][1]-y,x
  for axis,value in zip(['x','y','z'],[x+item['x'],y+item['y'],z]):vertex.set(axis,f'{value:.6f}')
 resources.append(obj);ET.SubElement(build,tag('item'),objectid=str(number))
for i,a in enumerate(placed):
 assert a['x']>=margin and a['y']>=margin and a['x']+a['w']<=args.width-margin+1e-6 and a['y']+a['h']<=args.depth-margin+1e-6
 for b in placed[i+1:]:assert a['x']+a['w']+gap<=b['x']+1e-6 or b['x']+b['w']+gap<=a['x']+1e-6 or a['y']+a['h']+gap<=b['y']+1e-6 or b['y']+b['h']+gap<=a['y']+1e-6
label='top-module' if args.top_module else 'single-cell'
output=ROOT/'exports'/f'{label}-bed-{args.width:g}x{args.depth:g}.3mf'
with zipfile.ZipFile(ROOT/'exports/servo-reset/housing_DRAFT.3mf') as template,zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as package:
 for name in template.namelist():package.writestr(name,ET.tostring(model,encoding='utf-8',xml_declaration=True) if name=='3D/3dmodel.model' else template.read(name))
with zipfile.ZipFile(output) as package:assert package.testzip() is None
print(output)
print(f'{len(placed)} components; {margin} mm edge margin, {gap} mm between bounding footprints; no printer or support presets.')

if args.top_module:
 # STL has multiple separate shells in the same layout; 3MF preserves object names.
 records=[]
 for obj in resources:
  vertices=[tuple(float(v.attrib[k]) for k in ['x','y','z']) for v in obj.findall('m:mesh/m:vertices/m:vertex',ns)]
  for tri in obj.findall('m:mesh/m:triangles/m:triangle',ns):
   a,b,c=[vertices[int(tri.attrib[k])] for k in ['v1','v2','v3']]
   u=[b[k]-a[k] for k in range(3)];v=[c[k]-a[k] for k in range(3)]
   n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
   length=math.sqrt(sum(x*x for x in n))
   if not length:continue
   records.append(struct.pack('<12fH',*[x/length for x in n],*a,*b,*c,0))
 stl=output.with_suffix('.stl')
 stl.write_bytes(b'Magneto top module bed; import in mm; supports NOT included'.ljust(80,b'\0')+struct.pack('<I',len(records))+b''.join(records))
 assert stl.stat().st_size==84+50*len(records)
 extent=[max(item['x']+item['w'] for item in placed),max(item['y']+item['h'] for item in placed)]
 instructions=f"""ONE TOP MODULE ON A {args.width:g} x {args.depth:g} mm BED

All 11 pieces are already duplicated and positioned. Import ONE layout file:
prefer the 3MF for named, separate objects, or use the STL with separate shells.
Do not import both. Import STL in millimeters at 100 percent scale.
Layout: 20 mm edge margin, at least 5 mm between bare bounding footprints.
Occupied coordinates: X {margin:g} to {extent[0]:.3f}, Y {margin:g} to {extent[1]:.3f} mm.
All parts rest at Z=0, preserving CAD Z orientation (XY rotations only).

This is an arranged model layout, NOT sliced printer instructions. No supports,
rafts, brims, resin/exposure, layer-height or printer settings are embedded.
Review orientation and supports in your slicer; their extra footprint can require
rearranging the plate. Inspect layer preview before printing. Do not scale to fit.
The integrated guide's overhangs, keeper fingers and thin carrier leaves require
particular attention to support placement and cleanup. Test one module first.
Prints: base, lid, carrier, left/right keepers and six plungers. No servo base.
Bought hardware: six 5 mm steel balls plus adhesive; eight M3 x 8 screws.
Tap the 2.5 mm pillar pilots M3 x 0.5 before fastening. See the separate-part
one-top-module ZIP for full assembly and existing-base compatibility notes.
"""
 output.with_suffix('.txt').write_text(instructions)
 with zipfile.ZipFile(output.with_suffix('.zip'),'w',zipfile.ZIP_DEFLATED) as package:
  for file in [output,stl,output.with_suffix('.txt')]:package.write(file,file.name)
 with zipfile.ZipFile(output.with_suffix('.zip')) as package:assert package.testzip() is None
 print(stl)
 print(f'Bare-part bounding coordinates verified: X {margin}..{extent[0]:.3f}, Y {margin}..{extent[1]:.3f} mm.')
