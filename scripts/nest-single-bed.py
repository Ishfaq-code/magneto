"""Nest conservative CAD silhouettes with Python integer bitsets (no dependencies)."""
import json, math, random, sys
from pathlib import Path
source=json.loads(Path(sys.argv[1]).read_text());N=246
items=[]
for item in source:
 variants=[]
 for variant in item['variants']:
  polys=variant['polygons'];xs=[x for poly in polys for x,y in poly];ys=[y for poly in polys for x,y in poly]
  ox=math.floor(min(xs));oy=math.floor(min(ys));w=math.ceil(max(xs))-ox;h=math.ceil(max(ys))-oy
  rows=[]
  for yy in range(h):
   y=oy+yy+.5;crossings=[]
   for poly in polys:
    for (ax,ay),(bx,by) in zip(poly,poly[1:]+poly[:1]):
     if (ay>y)!=(by>y):crossings.append(ax+(y-ay)*(bx-ax)/(by-ay))
   crossings.sort();row=0
   for a,b in zip(crossings[::2],crossings[1::2]):
    lo=max(0,math.ceil(a-ox-.5));hi=min(w,math.ceil(b-ox-.5))
    if hi>lo:row|=((1<<(hi-lo))-1)<<lo
   rows.append(row)
  variants.append(dict(angle=variant['angle'],w=w,h=h,rows=rows,ox=ox,oy=oy))
 items.append(dict(id=item['id'],variants=variants,area=sum(r.bit_count() for r in variants[0]['rows'])))
rng=random.Random(417)
# Full assembly first. Coupons are useful and remain included in the search.
for attempt in range(160):
 order=sorted(items,key=lambda p:-(p['area']**.5*max(v['w'] for v in p['variants'])**.5)*rng.uniform(.65,1.35))
 if attempt==0:order=sorted(items,key=lambda p:-max(v['w']*v['h'] for v in p['variants']))
 occupied=[0]*N;placements=[];failed=False
 for item in order:
  best=None
  variants=item['variants'][:];rng.shuffle(variants)
  for v in variants:
   if v['w']>N or v['h']>N:continue
   # Dense rows first make collision rejection cheap.
   active=sorted([(i,r) for i,r in enumerate(v['rows']) if r],key=lambda q:-q[1].bit_count())
   found=False
   for y in range(0,N-v['h']+1,2):
    if best and y>best[0]:break
    for x in range(0,N-v['w']+1,2):
     if all(not(occupied[y+i]&(r<<x)) for i,r in active):
      candidate=(y,x,v)
      if best is None or (y,x)<best[:2]:best=candidate
      found=True;break
    if found:break
  if best is None:failed=True;break
  y,x,v=best
  for i,r in enumerate(v['rows']):occupied[y+i]|=r<<x
  placements.append(dict(id=item['id'],angle=v['angle'],x=x-v['ox']+5,y=y-v['oy']+5))
 if not failed:
  Path(sys.argv[2]).write_text(json.dumps(placements,indent=2)+'\n');print(f'Nested {len(placements)} objects on one bed, attempt {attempt+1}.');break
 if attempt%10==0:print(f'Attempt {attempt+1}: placed {len(placements)}/{len(items)}',flush=True)
else:raise SystemExit('No valid single-bed nesting found')
