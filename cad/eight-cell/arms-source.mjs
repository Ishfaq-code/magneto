// Two new printed arms; mm. Hardware envelopes are excluded from arm exports.
// Bearing width, race contact diameter and hardware stack MUST be measured.
import Module from 'manifold-3d';
const wasm=await Module();wasm.setup();const M=wasm.Manifold;
export const armJoint={peg:6,length:16,clearance:.2,bossWidth:16,bossHeight:12,shortZ:-.75,longZ:4.2,longCuts:[175,365],shortCuts:[110]};
export const armParameters={
 crankRadius:225,rodLength:550,travelMin:-50,travelMax:350,deadCenterMargin:25,
 bearingID:3.175,bearingOD:9.525,bearingWidth:3.96875,bearingSeatDiameter:9.625,
 shoulder:1,armThickness:5.4,armWidth:20,cheekThickness:2.5,sideClearance:.2,
 raceBossDiameter:4.5,screwClearance:3.3,boltLength:16,washerThickness:.5,
 washerOD:7,nutThickness:2.4,motorShaftDiameter:5,motorShaftFlat:4.5,
 motorBoreClearance:.15,motorHubHeight:12,motorClampBoltLength:20,
 motorY:0,baseZ:65,sliderX:45
};
export function armLayout(p=armParameters){
 const forkGap=p.armThickness+2*p.sideClearance;
 const forkHeight=2*p.cheekThickness+forkGap;
 const rodZ=p.cheekThickness+p.sideClearance;
 const bearingZ=rodZ+p.shoulder;
 const minSeparation=p.rodLength-p.crankRadius+p.deadCenterMargin;
 return {forkGap,forkHeight,rodZ,bearingZ,minSeparation,
  motorX:p.sliderX+p.travelMax+minSeparation,
  grip:forkHeight+2*p.washerThickness+p.nutThickness,
  theoreticalStroke:2*p.crankRadius};
}
export function armPose(x,p=armParameters){
 const d=armLayout(p),s=d.motorX-(x+p.sliderX);
 const cos=(s*s+p.crankRadius**2-p.rodLength**2)/(2*p.crankRadius*s);
 if(Math.abs(cos)>1)throw new Error('Tray position outside linkage reach');
 const theta=Math.acos(cos),a=[d.motorX,p.motorY,p.baseZ];
 const b=[a[0]-p.crankRadius*cos,a[1]+p.crankRadius*Math.sin(theta),a[2]];
 const c=[x+p.sliderX,p.motorY,p.baseZ+d.rodZ];
 return {a,b,c,theta,crankAngle:Math.PI-theta,rodAngle:Math.atan2(c[1]-b[1],c[0]-b[0])};
}
export function makeArmParts(p=armParameters){
 const d=armLayout(p),R=p.crankRadius,L=p.rodLength;
 const box=(s,c)=>M.cube(s,true).translate(c);
 const cyl=(dia,h,x=0,y=0,z=0,n=96)=>M.cylinder(h,dia/2,dia/2,n,false).translate([x,y,z]);
 const capsule=(a,b,w,h,z=0)=>M.union([box([b-a,w,h],[(a+b)/2,0,z+h/2]),cyl(w,h,a,0,z),cyl(w,h,b,0,z)]);
 const ring=(od,id,h,x,y,z)=>cyl(od,h,x,y,z).subtract(cyl(id,h+2,x,y,z-1));
 let long= capsule(0,L,p.armWidth,p.armThickness);
 // A shoulder retains the outer race; the 6.5 mm opening clears the lower boss.
 long=long.subtract(cyl(p.bearingSeatDiameter,p.armThickness,0,0,p.shoulder))
  .subtract(cyl(6.5,p.armThickness+2,0,0,-1))
  .subtract(cyl(p.screwClearance,p.armThickness+2,L,0,-1));
 // Thick middle rib stays outside the elbow fork and tray pivot mounting area.
 long=M.union([long,capsule(22,L-22,10,3,p.armThickness)]);
 // Lower cheek is part of the crank. Offset web leaves the moving rod's
 // positive-Y sweep open, including its almost folded return position.
 const cheek=z=>M.union([cyl(22,p.cheekThickness,R,0,z),box([16,32,p.cheekThickness],[R,-16,z+p.cheekThickness/2])]);
 const upperZ=p.cheekThickness+d.forkGap;
 const lowerBossTop=d.bearingZ,upperBossBottom=d.bearingZ+p.bearingWidth;
 let short=M.union([capsule(0,R,20,p.cheekThickness),cyl(20,p.motorHubHeight),
  box([12,14,p.motorHubHeight],[-10,0,p.motorHubHeight/2]),capsule(22,R-24,10,4,-4),
  cheek(0),cheek(upperZ),box([16,6,d.forkHeight],[R,-32,d.forkHeight/2]),
  cyl(p.raceBossDiameter,lowerBossTop-p.cheekThickness+.01,R,0,p.cheekThickness-.01),
  cyl(p.raceBossDiameter,upperZ-upperBossBottom+.01,R,0,upperBossBottom)]);
 // PK244M-03BA drawing C-208: 5 mm shaft, 4.5 mm across flat,
 // 20 mm front extension and 15 mm machined length. Integrated split clamp.
 const shaftBore=cyl(p.motorShaftDiameter+p.motorBoreClearance,30,0,0,-10)
  .subtract(box([20,20,40],[0,10+p.motorShaftFlat-p.motorShaftDiameter/2+p.motorBoreClearance/2,5]));
 short=short.subtract(cyl(p.screwClearance,d.forkHeight+2,R,0,-1))
  .subtract(shaftBore).subtract(box([18,1,30],[-10,0,5]))
  .subtract(cyl(p.screwClearance,30).rotate([90,0,0]).translate([-11,15,6]));
 // Thickened enclosed-socket lands; same reinforced envelopes in the viewer
 // and the split export. Peg cuts are derived by split-source.mjs.
 function reinforce(g,cuts,z){for(const x of cuts){
  const core=box([26,armJoint.bossWidth,armJoint.bossHeight],[x+7,0,z]);
  const taper=M.hull([core,box([44,10,4],[x+7,0,z])]);g=M.union([g,taper]);
 }return g;}
 long=reinforce(long,armJoint.longCuts,armJoint.longZ);
 short=reinforce(short,armJoint.shortCuts,armJoint.shortZ);
 const parts=[
  {id:'drive-long-arm',name:'Long arm · 550 mm centers · recessed bearing seat',g:long},
  {id:'drive-short-arm',name:'Short arm · 225 mm centers · fork + PK244M shaft clamp',g:short},
  {id:'drive-bearing',name:'Bought R2ZZ bearing · 3.175 × 9.525 × 3.969 mm (verify actual)',printed:false,g:ring(p.bearingOD,p.bearingID,p.bearingWidth,0,0,d.bearingZ)},
  {id:'drive-bolt',name:'Bought M3 × 16 bolt (head provisional)',printed:false,g:M.union([cyl(3,p.boltLength,0,0,-p.washerThickness),cyl(5.5,2,0,0,-p.washerThickness-2)])},
  ...[0,1].map(i=>({id:'drive-washer-'+i,name:'Bought M3 washer '+(i+1)+' (size provisional)',printed:false,g:ring(p.washerOD,3.2,p.washerThickness,0,0,i?d.forkHeight:-p.washerThickness)})),
  {id:'drive-nut',name:'Bought M3 nut (size provisional)',printed:false,g:ring(6.35,3,p.nutThickness,0,0,d.forkHeight+p.washerThickness)}
 ];
 return parts;
}
