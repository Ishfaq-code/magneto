// Compact end-wall towing eye, millimeters. Mounting concept, not print export.
// Drive is raised to this pin height; no drop leg or long cantilever is needed.
export const traySupport={pivot:[45,0,65],pinDiameter:3.3,eyeOD:18,eyeThickness:5,projection:26};
export function makeTraySupportParts(M){
 const box=(s,c)=>M.cube(s,true).translate(c);
 const plate=box([4,24,18],[30,0,70]);
 const neck=box([14,12,5],[38,0,65]);
 const eye=M.cylinder(5,9,9,64,true).translate(traySupport.pivot);
 const pin=M.cylinder(8,1.65,1.65,64,true).translate(traySupport.pivot);
 let g=M.union([plate,neck,eye]).subtract(pin);
 // Provisional mounting holes: end-wall fastening/backing still needs detailing.
 for(const y of [-8,8])g=g.subtract(M.cylinder(8,1.65,1.65,48,true).rotate([0,90,0]).translate([30,y,74]));
 return [{id:'tray-tow-drawbar',name:'Compact end-wall towing eye · Ø3.3 mm pin (mounting concept)',printed:false,concept:true,g}];
}
