// Parametric CAD source, units mm. npm install, then npm run build.
import Module from 'manifold-3d';
const wasm=await Module();wasm.setup();const {Manifold}=wasm;
const cuboid=({size,center})=>Manifold.cube(size,true).translate(center);
const cylinder=({radius,height,segments=96})=>Manifold.cylinder(height,radius,radius,segments,true);
const translate=(v,g)=>g.translate(v);
const rotateY=(r,g)=>g.rotate([0,r*180/Math.PI,0]);
const union=(...items)=>Manifold.union(items.flat());
const subtract=(first,...items)=>items.flat().reduce((g,c)=>g.subtract(c),first);
const defaults={carriageLength:100,carriageWidth:80,carriageThickness:5,mountSpacingX:70,mountSpacingY:50,rodLength:90,crankRadius:35,bearingOD:9.525,bearingWidth:3.175,bearingClearance:0.15,shaftDiameter:5,shaftFlatDistance:4.5,shaftClearance:0.15,screwClearance:3.3};
function makeParts(overrides={}){
 const p={...defaults,...overrides};const hole=(d,h,x=0,y=0,z=h/2)=>translate([x,y,z],cylinder({radius:d/2,height:h,segments:96}));
 const box=(size,center)=>cuboid({size,center});
 const capsule=(length,width,height)=>union(box([length,width,height],[length/2,0,height/2]),hole(width,height),hole(width,height,length));
 const t=Math.max(5,p.bearingWidth+1); // 1mm supporting shoulder
 const bearingCut=x=>union(hole(p.bearingOD+p.bearingClearance,p.bearingWidth+0.1,x,0,t-p.bearingWidth/2+.05),hole(6.2,t+2,x,0,t/2));
 let base=box([p.carriageLength,p.carriageWidth,p.carriageThickness],[0,0,p.carriageThickness/2]);
 base=subtract(base,hole(p.screwClearance,p.carriageThickness+2,-p.carriageLength/2+10,0,p.carriageThickness/2),...[-1,1].flatMap(x=>[-1,1].map(y=>hole(p.screwClearance,p.carriageThickness+2,x*p.mountSpacingX/2,y*p.mountSpacingY/2,p.carriageThickness/2))));
 const longArm=subtract(capsule(p.rodLength,18,t),bearingCut(0),bearingCut(p.rodLength));
 let crank=union(capsule(p.crankRadius,18,t),hole(32,t));
 crank=subtract(crank,box([10.25,10.25,t+2],[0,0,t/2]),hole(p.screwClearance,t+2,-11,0,t/2),hole(p.screwClearance,t+2,11,0,t/2),bearingCut(p.crankRadius));
 // Split clamp below a flange; square register transfers torque to crank.
 let hub=union(hole(18,10),box([16,7,8],[0,9.5,5]),hole(32,3,0,0,11.5),box([10,10,3],[0,0,14.5]));
 const shaftCylinder=hole(p.shaftDiameter+p.shaftClearance,18,0,0,8);
 const flatY=p.shaftFlatDistance-p.shaftDiameter/2+p.shaftClearance/2;
 const bore=subtract(shaftCylinder,box([20,20,20],[0,flatY+10,8]));
 hub=subtract(hub,bore,box([1,18,12],[0,9,5]),translate([0,9.5,5],rotateY(Math.PI/2,cylinder({radius:p.screwClearance/2,height:20,segments:48}))),hole(p.screwClearance,5,-11,0,11.5),hole(p.screwClearance,5,11,0,11.5));
 return {parameters:p,parts:[base,longArm,crank,hub],names:['01_flat_carriage_bottom','02_long_connecting_arm','03_short_crank_arm','04_motor_shaft_adapter']};
}

export {makeParts,defaults};
