// Millimeters. Printed reset with a user-supplied nail pivot, unvalidated prototype.
// Local station origin is its horizontal Y-axis pivot; carriers use cell coordinates.
export const resetParameters={travel:6,pivot:[-25,-60,87],camHalfWidth:12,camCrestHalfWidth:2,camBaseY:3,camCrestY:14,tabTipY:-52,tabTipHalfWidth:1,tabHalfWidth:2,pivotDiameter:3,pivotClearance:.4,nailLength:16,nailHeadDiameter:6,nailHeadThickness:1.2,nailTipLength:2,entryBoreDiameter:3.3,retainingBoreDiameter:2.9,springThickness:.8,gravityReturn:true,flapOpenAngle:80,supportPlate:{frontY:-45,bottomZ:18.5,thickness:4}};
export function makeResetParts(M){
 const box=(s,p)=>M.cube(s,true).translate(p);
 const cyl=(r,h,p)=>M.cylinder(h,r,r,40,true).translate(p);
 const union=(...parts)=>M.union(parts.flat());
 const bar=(a,b,width,height,z)=>{const dx=b[0]-a[0],dy=b[1]-a[1];return box([Math.hypot(dx,dy)+width,width,height],[0,0,z]).rotate([0,0,Math.atan2(dy,dx)*180/Math.PI]).translate([(a[0]+b[0])/2,(a[1]+b[1])/2,0]);};
 const prism=(points,height,z)=>{const area=points.reduce((a,p,i)=>{const q=points[(i+1)%points.length];return a+p[0]*q[1]-q[0]*p[1];},0);return M.extrude([area<0?[...points].reverse():points],height).translate([0,0,z-height/2]);};
 // Rigid fork with closed bores, no snap ring or flexible station spring.
 const axleCylinder=(r,length,y)=>cyl(r,length,[0,0,0]).rotate([90,0,0]).translate([0,y,0]);
 const r=resetParameters;
 // Narrow hub and fork; far cheek encloses the point in a blind retaining socket.
 const cheeks=[box([16,2.5,10],[0,0,0]).subtract(axleCylinder(r.entryBoreDiameter/2,4,0)),
  box([16,7,10],[0,12.25,0]).subtract(axleCylinder(r.retainingBoreDiameter/2,6.35,11.825))];
 const support=resetParameters.supportPlate,front=support.frontY-resetParameters.pivot[1],z=worldZ=>worldZ-resetParameters.pivot[2];
 const pillarBottom=support.bottomZ-2.4,pillarTop=resetParameters.pivot[2]-1;
 const bracket=union(cheeks,box([6,19,10.4],[-10,6.25,0]),box([12,8,pillarTop-pillarBottom],[-12,-5,z((pillarTop+pillarBottom)/2)]),
  box([28,40,2],[-4,9,z(support.bottomZ-1.4)]),
  // Shoe around the front edge of the fixed 4 mm servo-support plate.
  box([20,2.6,support.thickness+4.8],[-4,front-1.7,z(support.bottomZ+support.thickness/2)]),box([20,10,2],[-4,front+3,z(support.bottomZ+support.thickness+1.4)]),
  // Broad stop contacts the hanging web above the cam, carrying reverse loads.
  box([4,8,10],[-5,4,-10]));
 // Gravity hangs the center of mass below the pivot. Cam is entirely outside the casing.
 const web=union(box([6,6,19],[0,5,-9]),axleCylinder(4.5,6,5)).subtract(axleCylinder((r.pivotDiameter+r.pivotClearance)/2,8,5));
 const flap=union(web,prism([[-12,3],[12,3],[2,14],[-2,14]],5,-18.4));
 // Hardware envelope: assumes 16 mm measured under the head, including a 2 mm point.
 // Nail head/point are provisional; measure the user's actual nail before printing.
 const shankStart=-1.25,straightLength=r.nailLength-r.nailTipLength;
 const point=M.cylinder(r.nailTipLength,r.pivotDiameter/2,0,40,true).rotate([-90,0,0]).translate([0,shankStart+straightLength+r.nailTipLength/2,0]);
 const axle=union(axleCylinder(r.pivotDiameter/2,straightLength,shankStart+straightLength/2),
  axleCylinder(r.nailHeadDiameter/2,r.nailHeadThickness,shankStart-r.nailHeadThickness/2),point);
 const carrierPieces=[box([3,52,2],[-18,3,62]),box([3,52,2],[18,3,62]),box([39,3,2],[0,-22,62])];
 for(const y of [-20,0,20]){
  carrierPieces.push(box([39,2,2.2],[0,y+7,62]));
  for(const x of [-10,10]){
   carrierPieces.push(box([4,.8,12],[x,y+7,62.7]));
   // Sloped underside cams the finger aside as a collar rises; the flat top supports it.
   carrierPieces.push(M.extrude([[[y+1.25,67.3],[y+7.4,65.5],[y+7.4,67.8],[y+1.25,67.8]]],4).rotate([90,0,90]).translate([x-2,0,0]));
  }
 }
 // Narrow follower with a chamfered tip; tab remains attached to the common carrier.
 carrierPieces.push(box([4,12,2],[0,-29,62]),box([4,4,7.6],[0,-33,65.3]),
  prism([[-2,-33],[2,-33],[2,-50], [1,-52],[-1,-52],[-2,-50]],2,68.6));
 // Two long integral return leaves bear on base pegs. Motion shown is illustrative flexure.
 carrierPieces.push(bar([-18,-22],[-18,-29],1.2,2,62),bar([-18,-29],[14,-29],.8,2,62),
  bar([18,-22],[18,-34],1.2,2,62),bar([18,-34],[-14,-34],.8,2,62));
 const carrier=union(carrierPieces);
 const guides=[];
 for(const x of [-18,18])for(const y of [-15,18]){
  guides.push(box([1.5,6,5],[x-2.65,y,61.5]),box([1.5,6,5],[x+2.65,y,61.5]),box([6.8,6,1.5],[x,y,64.25]));
 }
 guides.push(box([3,2,5],[14,-27.4,61.5]),box([3,2,5],[-14,-32.4,61.5]),
  box([6,2,5],[-18,36,61.5]),box([6,2,5],[18,36,61.5]));
 return {parts:[{id:'reset-bracket',name:'Printed gravity reset bracket · closed fork + broad stop',g:bracket},
  {id:'reset-flap',name:'Printed gravity-return cam flap · rigid hanging web',g:flap},
  {id:'reset-axle',name:'Bought nail pivot · nominal 3 × 16 mm (measure head and length)',printed:false,g:axle},
  {id:'catch-carrier',name:'Printed transverse catch carrier · tab + return leaves',g:carrier}],guides:union(guides)};
}
