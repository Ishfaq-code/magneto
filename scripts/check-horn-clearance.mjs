// Model-envelope checks only: actual servo horns and fasteners must be measured.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import Module from 'manifold-3d';
const w=await Module();w.setup();const M=w.Manifold;
const solid=p=>{const mesh=new w.Mesh({numProp:3,vertProperties:new Float32Array(p.positions),triVerts:Uint32Array.from({length:p.positions.length/3},(_,i)=>i)});mesh.merge();return new M(mesh);};
for(const name of ['servo','rail-servo']){
 const data=JSON.parse(fs.readFileSync(new URL(`../web/models/${name}-design.json`,import.meta.url)));
 const frame=data.parts.filter(p=>p.printed&&!p.id.startsWith('pin-')).map(p=>({...p,g:solid(p)}));
 // Plunger contact is intentional. Check all other printed parts, including keepers.
 // Expand the modeled 16 x 3 x 1.5 horn and radius-1.7 contact tip by 0.5 mm.
 const tipRise=(name==='servo'?2.35:1.35)+data.parameters.dotLift;
 for(const horn of data.parts.filter(p=>p.horn)){
  const envelope=M.union([M.cube([17,4,2.5],true).translate([horn.sign*8,0,0]),M.sphere(2.2,32).translate([horn.sign*16,0,0])]);
  for(let sample=0;sample<=60;sample++){
   const angle=-horn.sign*Math.asin(tipRise/16)*180/Math.PI*sample/60;
   const moved=envelope.rotate([0,angle,0]).translate(horn.pivot);
   for(const part of frame)assert(moved.intersect(part.g).volume()<1e-5,`${name}: expanded ${horn.id} collides with ${part.id} at ${angle} degrees`);
  }
 }
}
console.log('Both servo variants: six horn sweeps at 61 angles clear printed frames/keepers with a 0.5 mm expanded envelope. Intentional plunger contact excluded; actual hardware, mounting and reliability remain unvalidated.');
