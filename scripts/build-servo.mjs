import fs from 'node:fs';
import {makeServoParts,makeRailServoParts} from '../cad/servo-reset/servo-source.mjs';
const p=JSON.parse(fs.readFileSync(new URL('../cad/servo-reset/parameters.json',import.meta.url)));
function exportParts(source){return source.map(({g,...part})=>{
 if(g.decompose().length!==1)throw new Error(part.id+' is disconnected');
 const mesh=g.getMesh(),positions=[];
 for(const index of mesh.triVerts){const i=index*mesh.numProp;positions.push(...mesh.vertProperties.slice(i,i+3));}
 // Export horn in assembly coordinates, while keeping its pivot for animation.
 if(part.horn)for(let i=0;i<positions.length;i++)positions[i]+=part.pivot[i%3];
 return {...part,positions,volume_mm3:g.volume(),status:g.status()};
});}
const parts=exportParts(makeServoParts(p));
const railParts=exportParts(makeRailServoParts(p));
fs.writeFileSync(new URL('../web/models/rail-servo-design.json',import.meta.url),JSON.stringify({parameters:p,parts:railParts,catchAxis:'y'}));
fs.writeFileSync(new URL('../web/models/servo-design.json',import.meta.url),JSON.stringify({parameters:{...p,detachTravel:40,stationBaseLength:110},parts,catchAxis:'y',note:'Solid CAD prototype. Printed plungers have glue seats for separate bought 5 mm steel balls. SG90s and horns are hardware envelopes. Tolerances, catch flexure and gravity reset require testing.'}));
console.log('Built',parts.length,'solid servo bodies;',parts.filter(p=>p.printed).length,'printed components');
