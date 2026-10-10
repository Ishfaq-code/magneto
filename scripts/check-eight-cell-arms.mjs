// Dimensional/solid checks, not structural or physical validation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeArmParts,armPose,armParameters as p,armLayout} from '../cad/eight-cell/arms-source.mjs';
const parts=makeArmParts(),[long,short]=parts.map(p=>p.g),d=armLayout();
assert.equal(p.travelMax-p.travelMin,400);
assert.equal(d.theoreticalStroke,450);
assert.equal(d.minSeparation-(p.rodLength-p.crankRadius),25);
assert.equal(p.rodLength+p.crankRadius-(d.minSeparation+400),25);
assert.ok(p.boltLength-d.grip>=1,'Need at least two M3 thread pitches beyond nut');
assert.ok(p.bearingID>3&&p.bearingID<p.screwClearance);
assert.ok(p.bearingSeatDiameter>p.bearingOD);
assert.ok(p.shoulder+p.bearingWidth<p.armThickness);
assert.ok(p.raceBossDiameter<6.5);
for(const part of parts){assert.equal(part.g.status(),'NoError');assert.equal(part.g.decompose().length,1);}
const bearing=parts.find(p=>p.id==='drive-bearing').g.translate([p.crankRadius,0,0]);
assert.ok(short.intersect(bearing).volume()<1e-4,'Fork must not intersect bearing');
for(let x=p.travelMin;x<=p.travelMax;x+=5){
 const {a,b,c,crankAngle,rodAngle}=armPose(x);
 assert.ok(Math.abs(Math.hypot(b[0]-a[0],b[1]-a[1])-p.crankRadius)<1e-8);
 assert.ok(Math.abs(Math.hypot(c[0]-b[0],c[1]-b[1])-p.rodLength)<1e-8);
 const posedShort=short.rotate([0,0,crankAngle*180/Math.PI]).translate(a);
 const posedLong=long.rotate([0,0,rodAngle*180/Math.PI]).translate([b[0],b[1],b[2]+d.rodZ]);
 assert.ok(posedShort.intersect(posedLong).volume()<1e-4,'Arm collision at tray '+x);
 const localLong=long.rotate([0,0,(rodAngle-crankAngle)*180/Math.PI]).translate([p.crankRadius,0,d.rodZ]);
 assert.ok(localLong.intersect(bearing).volume()<1e-4,'Bearing must fit long-arm seat');
}
const exported=JSON.parse(fs.readFileSync(new URL('../web/models/eight-cell-design.json',import.meta.url)));
for(const part of parts){
 const mesh=part.g.getMesh(),positions=[];
 for(const i of mesh.triVerts)positions.push(...mesh.vertProperties.slice(i*mesh.numProp,i*mesh.numProp+3));
 assert.deepEqual(exported.parts.find(p=>p.id===part.id).positions,positions.map(v=>v===0?0:v),'Browser mesh differs from CAD: '+part.id);
}
assert.equal(exported.parts.filter(p=>p.id.startsWith('drive-')&&p.printed).length,2);
console.log('Two solid arms, shared browser meshes, 400 mm reach, bolt stack and 81 arm/bearing clearance poses verified. Fits, assembly flex, mounts, torque and mechanical reliability remain unvalidated.');
