// Sample geometric interference, not friction, strength or a physics simulation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'manifold-3d';
import {wheelMount} from '../cad/eight-cell/wheel-mount-source.mjs';
import {armPose,armLayout} from '../cad/eight-cell/arms-source.mjs';
const w=await Module();w.setup();const M=w.Manifold;
const read=n=>JSON.parse(fs.readFileSync(new URL('../web/models/'+n+'-design.json',import.meta.url)));
const rail=read('eight-cell'),station=read('rail-servo');
const solid=p=>{const mesh=new w.Mesh({numProp:3,vertProperties:new Float32Array(p.positions),triVerts:Uint32Array.from({length:p.positions.length/3},(_,i)=>i)});mesh.merge();const g=new M(mesh);assert.equal(g.status(),'NoError',p.id);return g;};
const fixed=station.parts.filter(p=>p.id==='housing'||(p.group==='servo'&&!p.horn)).map(p=>({id:p.id,g:solid(p).translate([0,0,p.id==='housing'?18.5:20])}));
for(const p of rail.parts.filter(p=>p.id.startsWith('slide-rail-')||p.id.startsWith('rail-stand-')))fixed.push({id:p.id,g:solid(p)});
for(const id of ['reset-bracket','reset-axle'])fixed.push({id,g:solid(rail.parts.find(p=>p.id===id)).translate(rail.reset.pivot)});
for(const p of station.parts.filter(p=>p.horn))for(const fraction of [0,.5,1]){
 const angle=-p.sign*Math.asin((1.35+station.parameters.dotLift)/16)*180/Math.PI*fraction;
 fixed.push({id:p.id+' lift '+fraction,g:solid(p).translate(p.pivot.map(v=>-v)).rotate([0,angle,0]).translate([p.pivot[0],p.pivot[1],p.pivot[2]+20])});
}
const flap=solid(rail.parts.find(p=>p.id==='reset-flap'));
function flapPoses(x){let angle=0;for(let i=0;i<8;i++){const relative=x-i*50-rail.reset.pivot[0];if(relative>-12&&relative<28)angle=Math.min(angle,-rail.reset.flapOpenAngle*Math.max(0,Math.min(1,(relative+12)/6,(28-relative)/8)));}return [0,angle].map(a=>({id:'reset-flap '+a,g:flap.rotate([0,a,0]).translate(rail.reset.pivot)}));}
const moving=['casing','tray-tow-drawbar',...rail.parts.filter(p=>p.id.startsWith('wheel-holder-')).map(p=>p.id)].map(id=>({id,g:solid(rail.parts.find(p=>p.id===id))}));
// Conservative screw/nut envelopes for the provisional M3 x 12 mount stack.
const holders=moving.filter(p=>p.id.startsWith('wheel-holder-'));
for(const holder of holders){
 assert.ok(holder.g.intersect(moving[0].g).volume()<1e-4,'Holder penetrates mounting pad');
 for(const other of holders)if(other!==holder)assert.ok(holder.g.intersect(other.g).volume()<1e-4,'Holder overlap');
}
for(const [end,rootX] of wheelMount.ends.entries())for(const side of [-1,1])for(const dx of wheelMount.boltX){
 const x=rootX+(end===0?-dx:dx),y=side*(wheelMount.rootY+wheelMount.boltY);
 const cylinder=(r,h,z)=>M.cylinder(h,r,r,48,false).translate([x,y,z]);
 const ring=(r,h,z)=>cylinder(r,h,z).subtract(cylinder(1.6,h+.2,z-.1));
 const g=M.union([cylinder(1.5,12,51.8),cylinder(2.75,3,63.8),ring(3.2,.5,56.5),ring(3.175,2.4,54.1)]);
 for(const target of moving)assert.ok(g.intersect(target.g).volume()<1e-4,'Mount fastener intersects '+target.id);
 moving.push({id:`mount-hardware-${end}-${side}-${dx}`,g});
}
for(let x=-50;x<=350;x+=5)for(const a of moving)for(const b of [...fixed,...flapPoses(x)]){
 const intersection=a.g.translate([x,0,0]).intersect(b.g);const volume=intersection.volume();
 assert.ok(volume<1e-4,`${a.id} intersects ${b.id} at X=${x}: ${volume} mm3 ${JSON.stringify(intersection.boundingBox())}`);
}
assert.equal(moving[1].g.decompose().length,1);
const long=solid(rail.parts.find(p=>p.id==='drive-long-arm')),short=solid(rail.parts.find(p=>p.id==='drive-short-arm'));
const layout=armLayout();
for(let x=-50;x<=350;x+=5){
 const {a,b,crankAngle,rodAngle}=armPose(x);
 const arms=[short.rotate([0,0,crankAngle*180/Math.PI]).translate(a),long.rotate([0,0,rodAngle*180/Math.PI]).translate([b[0],b[1],b[2]+layout.rodZ])];
 const obstacles=[...fixed,...flapPoses(x),...moving.map(p=>({id:p.id,g:p.g.translate([x,0,0])}))];
 for(const arm of arms)for(const obstacle of obstacles)assert.ok(arm.intersect(obstacle.g).volume()<1e-4,'Raised arm intersects '+obstacle.id+' at '+x);
}

console.log('Casing, compact eye and raised arms clear station geometry, sampled horn/reset poses at 81 tray positions. Physical operation remains unvalidated.');

console.log('Mount bodies and provisional screw envelopes clear sampled motion; wheel/platform geometry remains a browser-only concept; rolling fit, guidance and mounting require measurement and physical testing.');
