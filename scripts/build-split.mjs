import fs from 'node:fs';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
import {makeSplitParts,splitParameters as p} from '../cad/eight-cell/split-source.mjs';
const {parts,checks}=makeSplitParts();
const wasm=await Module();wasm.setup();const M=wasm.Manifold;
const local=g=>new M(g.getMesh());
for(const {source,members,id,cuts,z,type} of checks){
 if(type==='socket')for(const [index,x] of cuts.entries()){
  const female=local(members.find(p=>p.section===index+2).g);
  const box=(size,c)=>M.cube(size,true).translate(c);
  assert.ok(female.intersect(box([15,6.3,6.3],[x+8.1,0,z])).volume()<1e-5,'Socket is not open');
  for(const [size,c] of [
   [[12,5,2.6],[x+8,0,z+4.6]],[[12,5,2.6],[x+8,0,z-4.6]],
   [[12,4.6,5],[x+8,5.6,z]],[[12,4.6,5],[x+8,-5.6,z]],
   [[3,6,6],[x+18,0,z]]]){
   const sample=box(size,c);assert.ok(sample.subtract(female).volume()<1e-5,'Missing socket wall or blind end');
  }
 }

 let total=0;
 for(let i=0;i<members.length;i++){
  const a=members[i].g;total+=a.volume();
  assert.ok(a.subtract(source).volume()<1e-5,`${id}: changed outer envelope`);
  for(const b of members.slice(i+1)){
   assert.ok(a.intersect(b.g).volume()<1e-5,`${id}: joint collision`);
   if(b.section!==members[i].section)for(let step=1;step<=20;step++){
    const offset=[step,0,0];
    assert.ok(a.intersect(b.g.translate(offset)).volume()<1e-5,`${id}: blocked insertion path`);
   }
  }
 }
 assert.ok(total/source.volume()>.94,`${id}: excessive joint material loss`);
}
const mesh=g=>{const m=g.getMesh(),positions=[];for(const i of m.triVerts)positions.push(...m.vertProperties.slice(i*m.numProp,i*m.numProp+3));return positions;};
const objects=parts.map(({g,...part})=>{
 assert.equal(g.status(),'NoError');assert.equal(g.decompose().length,1);
 const {min,max}=g.boundingBox();return {...part,name:part.id,printed:true,positions:mesh(g),low:min,size:max.map((v,i)=>v-min[i])};
});
// Saved one-bed nesting, generated from conservative projected silhouettes.
// Exact CAD projections below independently verify all margins and separations.
const layout=JSON.parse(fs.readFileSync('cad/eight-cell/single-bed-layout.json'));
assert.equal(layout.length,objects.length);assert.equal(new Set(layout.map(p=>p.id)).size,objects.length);
const placed=[],footprints=[];
for(const entry of layout){
 const obj=objects.find(p=>p.id===entry.id);assert.ok(obj,'Unknown nested part');
 const g=local(parts.find(p=>p.id===entry.id).g).rotate([0,0,entry.angle]).translate([entry.x,entry.y,-obj.low[2]]);
 const bounds=g.boundingBox(),footprint=g.project().offset(p.gap/2);
 assert.ok(bounds.min[0]>=p.margin&&bounds.min[1]>=p.margin&&bounds.max[0]<=p.bed-p.margin&&bounds.max[1]<=p.bed-p.margin,'Part outside bed margins');
 assert.ok(Math.abs(bounds.min[2])<1e-5,'Part not seated on bed');
 for(const other of footprints)assert.ok(footprint.intersect(other).area()<1e-6,'Insufficient silhouette gap');
 footprints.push(footprint);
 placed.push({...obj,positions:mesh(g),placement:{x:bounds.min[0],y:bounds.min[1],w:bounds.max[0]-bounds.min[0],h:bounds.max[1]-bounds.min[1],angle:entry.angle}});
}
const beds=[{parts:placed}];
fs.writeFileSync('web/models/split-print-design.json',JSON.stringify({parameters:p,parts:objects,beds:beds.map(({parts})=>({parts})),note:'Enclosed square-socket arm joints and removable axle brackets; fit and strength unvalidated. No hardware or printer presets.'}));
console.log(`Split CAD checked: ${objects.length} solids on ${beds.length} plates.`);
for(const [i,b] of beds.entries())console.log(`Plate ${i+1}: ${b.parts.map(p=>p.id).join(', ')}`);
