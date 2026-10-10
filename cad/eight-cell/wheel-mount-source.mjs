// Replaceable holders on short tray pads. Millimeters; axle/wheel fits provisional.
export const wheelMount={ends:[-378,28],axleXs:[-410,70],rootY:32,axleY:78,axleZ:38,axleBore:6.4,boltDiameter:3.4,boltX:[5,15],boltY:6,padTop:67};
function transform(g,end,side){if(end===0)g=g.mirror([1,0,0]);if(side<0)g=g.mirror([0,1,0]);return g.translate([wheelMount.ends[end],side*wheelMount.rootY,0]);}
export function addWheelMountPads(M,casing){
 const box=(s,c)=>M.cube(s,true).translate(c),p=wheelMount;
 for(const end of [0,1])for(const side of [-1,1]){
  let pad=box([21.9,22,6],[8.05,3,64]);
  for(const x of p.boltX)pad=pad.subtract(M.cylinder(10,p.boltDiameter/2,p.boltDiameter/2,48,true).translate([x,p.boltY,64]));
  // Root relief keeps the removable front-panel fingers unobstructed.
  pad=pad.subtract(box([5,20,12],[-2.3,11,64]));
  for(const x of p.boltX)pad=pad.subtract(M.cylinder(3.3,3.1,3.1,48,false).translate([x,p.boltY,63.8]));
  casing=M.union([casing,transform(pad,end,side)]);
 }
 return casing;
}
export function makeWheelMountParts(M){
 const box=(s,c)=>M.cube(s,true).translate(c),p=wheelMount,result=[];
 for(const end of [0,1])for(const side of [-1,1]){
  const dx=Math.abs(p.axleXs[end]-p.ends[end]);
  // 4 mm mounting flange bolts vertically underneath the short 6 mm tray pad.
  // Fasteners lie outside the tray walls and remain accessible from below.
  const flange=box([20,22,4],[10,3,59]);
  const bridge=box([dx-11,18,6],[(20+dx+9)/2,0,60]);
  const cross=box([18,p.axleY-p.rootY+9,6],[dx,(p.axleY-p.rootY)/2,60]);
  const cheek=box([18,10,33],[dx,p.axleY-p.rootY,46.5]);
  let g=M.union([flange,bridge,cross,cheek]);
  // Side ribs reinforce the elbow without blocking the two mounting screws.
  for(const y of [-7,7])g=M.union([g,M.hull([box([2,4,4],[21,y,59]),box([6,4,6],[dx,y,60])])]);
  for(const x of p.boltX)g=g.subtract(M.cylinder(12,p.boltDiameter/2,p.boltDiameter/2,48,true).translate([x,p.boltY,59]));
  g=g.subtract(M.cylinder(16,p.axleBore/2,p.axleBore/2,64,true).rotate([90,0,0]).translate([dx,p.axleY-p.rootY,p.axleZ]));
  result.push({id:`wheel-holder-${end+1}-${side<0?'front':'rear'}`,name:`Removable axle holder ${end+1} ${side<0?'front':'rear'} · Ø6.4 mm bore · provisional`,g:transform(g,end,side)});
 }
 return result;
}
