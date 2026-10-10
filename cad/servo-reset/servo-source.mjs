// Millimeters. Coherent solid bodies; fit and flexure performance remain provisional.
import Module from 'manifold-3d';
import {makeEightCellParts} from '../eight-cell/casing-source.mjs';
const wasm=await Module();wasm.setup();const M=wasm.Manifold;
const box=(s,p)=>M.cube(s,true).translate(p);
const cyl=(r,h,p)=>M.cylinder(h,r,r,48,true).translate(p);
const sphere=(r,p)=>M.sphere(r,32).translate(p);
const union=(...p)=>M.union(p.flat());
const cut=(p,...holes)=>holes.flat().reduce((g,h)=>g.subtract(h),p);
export function makeRailServoParts(p){
 const coords=[[-p.dotPitch/2,-p.dotPitch],[-p.dotPitch/2,0],[-p.dotPitch/2,p.dotPitch],[p.dotPitch/2,-p.dotPitch],[p.dotPitch/2,0],[p.dotPitch/2,p.dotPitch]];
 const parts=[];
 const add=(id,name,group,g,printed=true,extra={})=>{if(g.status()!=='NoError')throw new Error(id+': '+g.status());parts.push({id,name,group,g,printed,...extra});};
 // The removable module is identical to a rail cell, translated down 20 mm.
 const railParts=makeEightCellParts();
 const modulePart=id=>railParts.find(part=>part.id===id).g.translate([0,0,-20]);
 const supportParts=[box([p.baseLength,p.baseWidth,p.baseThickness],[0,0,p.baseThickness/2])];
 for(const x of [-22,22])for(const y of [-30,30])supportParts.push(
  box([4.5,4.5,32.5],[x,y,20.25]),cyl(1.4,1.2,[x,y,37.1]));
 add('housing','Standalone servo base with cell docking posts','frame',union(supportParts));
 add('cell-base','Removable cell base with supports and stem guide','frame',modulePart('cell-base'));
 for(const id of ['plunger-keeper-left','plunger-keeper-right'])add(id,id==='plunger-keeper-left'?'Left screw-fastened plunger keeper':'Right screw-fastened plunger keeper','frame',modulePart(id));
 add('reading-plate','Removable cell reading plate','frame',modulePart('reading-plate'),true,{lid:true});
 add('reset-carrier','Shared transverse catch carrier and reset tab','catches',modulePart('catch-carrier'),true,{carrier:true});
 for(let i=0;i<6;i++){
  const [x,y]=coords[i],left=x<0,sign=left?1:-1,pivot=left?-26:26;
  // Printed plunger retains its catch shoulder and servo contact foot.
  // A shallow spherical seat locates a separately purchased 5 mm ball for gluing.
  const seatHeight=p.ballSeatTopZ-p.ballSeatBottomZ;
  const stemTop=p.ballSeatBottomZ+1;
  const plunger=union(cyl(p.pinRadius,stemTop-38,[x,y,(stemTop+38)/2]),
   cyl(p.ballSeatRadius,seatHeight,[x,y,p.ballSeatBottomZ+seatHeight/2]),
   cyl(3.3,1.2,[x,y,46]),box([7,6,1.5],[x,y,37.8]));
  add('pin-'+(i+1),'Printed ball-seat plunger '+(i+1),'pins',
   cut(plunger,sphere(p.ballRadius+p.ballSeatClearance,[x,y,p.ballCenterZ])),true,{channel:i});
  add('ball-'+(i+1),'Bought 5 mm steel ball '+(i+1),'pins',
   sphere(p.ballRadius,[x,y,p.ballCenterZ]),false,{channel:i,ball:true});
  const body=union(box([23,12,29],[left?-35:35,y,20]),box([28,4,3],[left?-35:35,y,30]),cyl(3.2,5,[0,0,0]).rotate([90,0,0]).translate([pivot,y,34]));
  add('servo-'+(i+1),'SG90 envelope '+(i+1),'servo',body,false);
  // Horn coordinates are local to the shaft, so the browser can animate them.
  add('horn-'+(i+1),'Servo horn '+(i+1),'servo',union(box([16,3,1.5],[sign*8,0,0]),sphere(1.7,[sign*16,0,0])),false,{horn:true,pivot:[pivot,y,34],sign});
 }
 return parts;
}

// Standalone detachment demonstrator: compact base with locating posts.
export function makeServoParts(p){
 const parts=makeRailServoParts(p);
 // Keep shaft bosses clear of the passive module's underside.
 for(const part of parts.filter(part=>part.group==='servo')){
  if(part.horn)part.pivot=[part.pivot[0],part.pivot[1],part.pivot[2]-1];
  else part.g=part.g.translate([0,0,-1]);
 }
 return parts;
}
