// Millimeters. Coherent solid bodies; fit and flexure performance remain provisional.
import Module from 'manifold-3d';
const wasm=await Module();wasm.setup();const M=wasm.Manifold;
const box=(s,p)=>M.cube(s,true).translate(p);
const cyl=(r,h,p)=>M.cylinder(h,r,r,48,true).translate(p);
const sphere=(r,p)=>M.sphere(r,32).translate(p);
const union=(...p)=>M.union(p.flat());
const cut=(p,...holes)=>holes.flat().reduce((g,h)=>g.subtract(h),p);
export function makeServoParts(p){
 const coords=[[-p.dotPitch/2,-p.dotPitch],[-p.dotPitch/2,0],[-p.dotPitch/2,p.dotPitch],[p.dotPitch/2,-p.dotPitch],[p.dotPitch/2,0],[p.dotPitch/2,p.dotPitch]];
 const parts=[];
 const add=(id,name,group,g,printed=true,extra={})=>{if(g.status()!=='NoError')throw new Error(id+': '+g.status());parts.push({id,name,group,g,printed,...extra});};
 const plate=(w,h,t,z,holes)=>cut(box([w,h,t],[0,0,z+t/2]),holes.map(([x,y,r])=>cyl(r,t+2,[x,y,z+t/2])));
 // Posts reach the lid. Pilot mounting holes allow the separate lid to fasten down.
 let base=union(box([p.baseLength,p.baseWidth,p.baseThickness],[0,0,p.baseThickness/2]),...[-48,48].flatMap(x=>[-37,37].map(y=>box([5,5,56],[x,y,32]))),...[-29,29].flatMap(y=>[box([15,3,2],[42,y,44.5]),box([2,5,7],[50,y,47]),box([15,3,40.5],[42,y,23.75])]),...[-16,16].flatMap(x=>[-27,27].map(y=>box([4,4,47],[x,y,27.5]))));
 base=cut(base,...[-48,48].flatMap(x=>[-37,37].map(y=>cyl(1.2,10,[x,y,56]))));
 add('housing','Housing base and guide supports','frame',base);
 const screwHoles=[-48,48].flatMap(x=>[-37,37].map(y=>[x,y,1.65]));
 add('reading-plate','Reading plate','frame',plate(104,82,2,60,[...coords.map(([x,y])=>[x,y,p.readingHoleRadius]),...screwHoles]),true,{lid:true});
 for(const [id,z]of [['lower-guide',41],['upper-guide',51]]){
  // Rail-clearance slots let the carrier translate without striking the lower guide.
  let guide=plate(38,62,2,z,coords.map(([x,y])=>[x,y,p.pinGuideRadius]));
  if(z===41)guide=cut(guide,...coords.map(([x,y])=>box([10,4.4,4],[x+9.5,y,z+1])));
  add(id,id==='lower-guide'?'Lower pin guide':'Upper pin guide','frame',guide);
 }
 const carrierParts=[...[-2,18].map(x=>box([3,56,2],[x,0,38])),box([49,3,2],[20.5,-29,38]),box([3,58,2],[44,0,38]),box([3,8,11],[44,0,42.5]),box([14,8,2],[52,0,47]),cut(box([17,16,3],[65.5,0,47]),cyl(4.5,5,[65.5,0,47]))];
 for(const [x,y]of coords)carrierParts.push(box([1.2,4,10],[x+7,y,43]),box([5.5,4,1.2],[x+4,y,47.2]));
 add('reset-carrier','Catch carrier and pull tab','catches',union(carrierParts),true,{carrier:true});
 for(let i=0;i<6;i++){
  const [x,y]=coords[i],left=x<0,sign=left?1:-1,pivot=left?-26:26;
  add('pin-'+(i+1),'Pin and collar '+(i+1),'pins',union(cyl(p.pinRadius,22,[x,y,49]),sphere(p.ballRadius,[x,y,59]),cyl(3.3,1.2,[x,y,46]),box([7,6,1.5],[x,y,37.8])),false,{channel:i});
  const body=union(box([23,12,29],[left?-35:35,y,20]),box([28,4,3],[left?-35:35,y,30]),cyl(3.2,5,[0,0,0]).rotate([90,0,0]).translate([pivot,y,34]));
  add('servo-'+(i+1),'SG90 envelope '+(i+1),'servo',body,false);
  // Horn coordinates are local to the shaft, so the browser can animate them.
  add('horn-'+(i+1),'Servo horn '+(i+1),'servo',union(box([16,3,1.5],[sign*8,0,0]),sphere(1.7,[sign*16,0,0])),false,{horn:true,pivot:[pivot,y,34],sign});
 }
 return parts;
}
