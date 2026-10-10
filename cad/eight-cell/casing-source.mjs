// Millimeters. Provisional eight-slot casing and separate cell plates.
import Module from 'manifold-3d';
import {makeResetParts} from './reset-source.mjs';
import {makeWheelMountParts,addWheelMountPads} from './wheel-mount-source.mjs';
import {makeTraySupportParts} from './tray-support-source.mjs';
const wasm=await Module();wasm.setup();const M=wasm.Manifold;
const box=(size,position)=>M.cube(size,true).translate(position);
// Bought M3 × 8 screws, four per cell. Cut M3 × 0.5 threads after printing.
export const cellLidFasteners={count:4,screwDiameter:3,pitch:.5,screwLength:8,clearanceDiameter:3.3,tapPilotDiameter:2.5,pilotDepth:9,plateThickness:2,postTopZ:80};
// Side loading of complete plungers, with the lid/carrier removed and module undocked.
// Millimeters; allowances and remaining slotted support stiffness need print trials.
export const plungerEntry={stemWidth:2.5,footWidth:6.6,outerX:26};
// Additional guide headroom; operating lift and catch/stop levels remain unchanged.
export const upperGuideCenterZ=72.6;
export function makeEightCellParts(){
 let casing=box([406,84,28],[-175,0,68]).subtract(box([400,78,31],[-175,0,71.5]));
 // Continuous underside clearance: discrete holes struck servo tops/pegs
 // between cells and at the end walls. Side ledges retain the cell bases.
 casing=casing.subtract(box([410,68,12],[-175,0,55]));
 for(let i=0;i<8;i++)casing=casing.subtract(box([6,8,5],[-i*50,-41,68.6]));
 // Removable front wall: locating tongues below, chunky finger joints at the ends.
 // Front loading lets cell tabs stay outside, unlike insertion from a closed end.
 casing=casing.subtract(box([408,3.4,25.6],[-175,-40.5,69.3]));
 let panel=box([406,3,25.5],[-175,-40.5,69.25]);
 for(let i=0;i<8;i++)panel=panel.subtract(box([6,5,5],[-i*50,-40.5,68.6]));
 const tongueXs=[-350,-175,0];
 for(const x of tongueXs){
  panel=M.union([panel,box([10,3,2.2],[x,-40.5,56.4])]);
  casing=casing.subtract(box([10.5,3.5,3], [x,-40.5,55.6]));
 }
 // Straight finger joints withdraw toward the front; no snap flexure or loose pins.
 // 0.15 mm clearance per mating face is provisional and needs a fit coupon.
 const jointClearance=.15;
 for(const x of [26.5,-376.5]){
  for(const z of [64.5,77]){
   casing=casing.subtract(box([3+2*jointClearance,6.4+2*jointClearance,5+2*jointClearance],[x,-36.2,z]));
   panel=M.union([panel,box([3,6.4,5],[x,-36.2,z])]);
  }
  const bodyFinger=box([3,9,5],[x,-37.5,71]);
  casing=M.union([casing,bodyFinger]);
  panel=panel.subtract(box([3+2*jointClearance,9.4,5+2*jointClearance],[x,-37.5,71]));
 }
 // Only compact bolt pads stay on the tray; long axle holders are replaceable.
 casing=addWheelMountPads(M,casing);
 const trackParts=[];
 const keepers=[];
 // Clear the reused 7 × 6 mm plunger foot through its full lift (provisional).
 let base=box([49.5,70,3],[0,0,58]);
 for(const x of [-10,10])for(const y of [-20,0,20])base=base.subtract(M.cylinder(6,4.9,4.9,48,true).translate([x,y,58]));
 const reset=makeResetParts(M);
 // Each cell carries its own supports and stem guide, so it works outside the casing.
 const posts=[];
 for(const x of [-22,22])for(const y of [-30,30]){
  const post=box([4.5,4.5,20.5],[x,y,69.75]);
  posts.push(post);
  // Shallow underside sockets locate the module on the standalone docking pegs.
  base=base.subtract(M.cylinder(1.6,1.65,1.65,32,true).translate([x,y,57.25]));
 }
 let stemGuide=box([49.5,70,2],[0,0,upperGuideCenterZ]);
 for(const x of [-10,10])for(const y of [-20,0,20])stemGuide=stemGuide.subtract(M.cylinder(4,1.25,1.25,48,true).translate([x,y,upperGuideCenterZ]));
 // Collar stops keep loose-cell plungers at their blank height under gravity.
 // Side pillars clear the 7 × 6 mm feet; the bridge is above their full stroke.
 const collarStops=[];
 for(const x of [-10,10])for(const y of [-20,0,20]){
  collarStops.push(M.cylinder(.8,4.8,4.8,48,true).translate([x,y,65]).subtract(M.cylinder(2,1.25,1.25,48,true).translate([x,y,65])),
   // Widen the outside pillar so two shoulders remain beside its entry slit.
   ...[-4.5,4.5].map(dx=>box([1.5,Math.sign(dx)===Math.sign(x)?5:2,5.9],[x+dx,y,62.45])));
 }
 // Four dedicated keeper pillars: M3 tap pilots will be cut after union.
 for(const x of [-22,22])for(const y of [-10,10])posts.push(box([4.5,5,14.1],[x,y,66.55]));
 base=M.union([base,reset.guides,...posts,stemGuide,...collarStops]);
 // Restore the six open-ended stem slots. Cut after union so stops and carrier
 // guide ribs cannot block side entry. Lower slots also clear the plunger feet.
 for(const x of [-10,10])for(const y of [-20,0,20]){
  const end=Math.sign(x)*plungerEntry.outerX;
  const length=Math.abs(end-x),center=(end+x)/2;
  base=base.subtract(box([length,plungerEntry.stemWidth,15],[center,y,66.5]));
  base=base.subtract(box([length,plungerEntry.footWidth,3.2],[center,y,58]));
 }
 // Cut after union so the integrated stem guide cannot refill the pilot bores.
 const f=cellLidFasteners;
 for(const x of [-22,22])for(const y of [-30,30])base=base.subtract(M.cylinder(f.pilotDepth+1,f.tapPilotDiameter/2,f.tapPilotDiameter/2,32,true).translate([x,y,f.postTopZ-f.pilotDepth/2+.5]));
 // Separate screw-fastened comb keepers close each stem slot near the shaft.
 // Remove screws and slide outward with the cell outside its tray; no snap flex.
 for(const side of [-1,1]){
  const x=side*22;
  let keeper=box([4.5,54,2],[x,0,74.6]);
  for(const y of [-20,0,20])keeper=M.union([keeper,
   box([10.55,2.1,1.6],[side*16.725,y,upperGuideCenterZ]),
   box([2.5,2.1,1],[x,y,73.6])]);
  for(const y of [-10,10]){
   keeper=keeper.subtract(M.cylinder(4,1.65,1.65,32,true).translate([x,y,74.6]));
   base=base.subtract(M.cylinder(9,1.25,1.25,32,true).translate([x,y,70.1]));
  }
  keepers.push({id:side<0?'plunger-keeper-left':'plunger-keeper-right',name:side<0?'Left screw-fastened plunger keeper':'Right screw-fastened plunger keeper',g:keeper});
 }
 let plate=box([49.5,70,f.plateThickness],[0,0,81]);
 for(const x of [-10,10])for(const y of [-20,0,20])plate=plate.subtract(M.cylinder(4,3.3,3.3,48,true).translate([x,y,81]));
 for(const x of [-22,22])for(const y of [-30,30])plate=plate.subtract(M.cylinder(4,f.clearanceDiameter/2,f.clearanceDiameter/2,32,true).translate([x,y,81]));
 return [...reset.parts,...makeWheelMountParts(M),...makeTraySupportParts(M),...trackParts,...keepers,{id:'casing',name:'8-position tray with open front joint',g:casing},{id:'casing-panel',name:'Removable front panel · finger joints + locating tongues',g:panel},{id:'cell-base',name:'Separate cell base',g:base},{id:'reading-plate',name:'Separate reading plate',g:plate}];
}
