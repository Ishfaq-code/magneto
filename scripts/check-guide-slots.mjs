// Sample detachment/retention geometry. This does not validate printed fit or flexure.
import fs from 'node:fs';
import Module from 'manifold-3d';
const w=await Module();w.setup();
const solid=p=>{const mesh=new w.Mesh({numProp:3,vertProperties:new Float32Array(p.positions),triVerts:Uint32Array.from({length:p.positions.length/3},(_,i)=>i)});mesh.merge();return new w.Manifold(mesh);};
const p=JSON.parse(fs.readFileSync(new URL('../cad/servo-reset/parameters.json',import.meta.url)));
const parts=JSON.parse(fs.readFileSync(new URL('../web/models/servo-design.json',import.meta.url))).parts.map(p=>({...p,g:solid(p)})),base=parts.find(p=>p.id==='cell-base'),lid=parts.find(p=>p.id==='reading-plate');
const overlap=(a,b)=>a.intersect(b).volume()>1e-5;
const keepers=parts.filter(p=>p.id.startsWith('plunger-keeper-'));
if(keepers.length!==2)throw new Error('Two keeper strips required');
for(const keeper of keepers){
 const side=keeper.id.endsWith('left')?-1:1;
 for(let offset=0;offset<=25;offset+=.5){
  const moved=keeper.g.translate([side*offset,0,0]);
  for(const other of parts.filter(p=>['cell-base','reading-plate','reset-carrier'].includes(p.id)||p.group==='pins'))
   if(overlap(moved,other.g))throw new Error(keeper.id+' removal blocked by '+other.id+' at '+offset);
 }
}
const fixed=parts.filter(p=>p.id==='housing'||p.group==='servo');
for(const pin of parts.filter(p=>p.id.startsWith('pin-'))){
 // Load from the nearest X edge with carrier/lid removed and module undocked.
 // Check the complete cup, collar and foot, not just a stem-sized test cylinder.
 const xs=pin.positions.filter((_,i)=>i%3===0),side=Math.sign((Math.min(...xs)+Math.max(...xs))/2);
 for(let offset=0;offset<=22;offset+=.25)
  if(overlap(pin.g.translate([side*offset,0,.1]),base.g))throw new Error(pin.id+' side insertion blocked at '+offset+' mm');
 const keeper=keepers.find(p=>p.id.endsWith(side<0?'left':'right'));
 for(const lift of [0,2.4,3])if(!overlap(pin.g.translate([side*.6,0,lift]),keeper.g))throw new Error(pin.id+' can escape keeper at lift '+lift);
 if(overlap(pin.g,base.g))throw new Error(pin.id+' penetrates its base at rest');
 if(!overlap(pin.g.translate([0,0,-.05]),base.g))throw new Error(pin.id+' has no captive gravity stop');
 for(let lift=0;lift<=3.001;lift+=.2)for(const guide of [base,lid,...keepers])
  if(overlap(pin.g.translate([0,0,lift]),guide.g))throw new Error(pin.id+' lift collides with '+guide.id);
}
const moving=parts.filter(p=>p.id!=='housing'&&p.group!=='servo');
for(let z=0;z<=40;z+=2)for(const part of moving)for(const station of fixed){
 if(overlap(part.g.translate([0,0,z]),station.g))throw new Error(part.id+' detachment collides with '+station.id+' at '+z+' mm');
 if(part.group==='pins'&&overlap(part.g.translate([0,0,z+2.4]),station.g))throw new Error(part.id+' raised detachment collides with '+station.id);
}
console.log('All six complete plungers clear sampled side-entry paths (lid/carrier removed, module undocked). Sampled 0–40 mm detachment clears the station; collar stops support all six plungers and 0–3 mm guide travel is clear (operating lift remains 2.4 mm). Keepers block outward shaft motion by 0.6 mm at 0/2.4/3 mm lift and can slide out after screw removal; printed fit, assembly sequence and physical operation remain unvalidated.');
