import assert from 'node:assert/strict';
import {makeEightCellParts} from '../cad/eight-cell/casing-source.mjs';
const parts=makeEightCellParts(),get=id=>parts.find(p=>p.id===id).g;
const body=get('casing'),panel=get('casing-panel');
const clear=(a,b,message)=>assert(a.intersect(b).volume()<1e-5,message);
clear(panel,body,'Panel overlaps casing when seated');
assert(panel.translate([0,0,.6]).intersect(body).volume()>.01,'Finger joints do not constrain vertical misalignment');
for(let d=0;d<=50;d+=2)clear(panel.translate([0,-d,0]),body,'Panel removal path blocked at '+d+' mm');
for(let i=0;i<8;i++)for(const id of ['cell-base','reading-plate','catch-carrier','plunger-keeper-left','plunger-keeper-right'])for(let d=0;d<=110;d+=5){
 clear(get(id).translate([-i*50,-d,0]),body,'Front loading blocked for cell '+(i+1)+' '+id+' at '+d+' mm');
}
for(let i=0;i<8;i++)for(const id of ['cell-base','reading-plate','catch-carrier','plunger-keeper-left','plunger-keeper-right']){
 const seated=get(id).translate([-i*50,0,0]);
 clear(seated,panel,'Closed panel overlaps cell '+(i+1)+' '+id);
}
console.log('Tray panel seating, finger alignment, panel removal and eight front-loading paths verified geometrically. Friction retention and printed fit remain provisional.');
