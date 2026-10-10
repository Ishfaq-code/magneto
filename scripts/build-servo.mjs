import fs from 'node:fs';
import {makeServoParts} from '../cad/servo-reset/servo-source.mjs';
const p=JSON.parse(fs.readFileSync(new URL('../cad/servo-reset/parameters.json',import.meta.url)));
const parts=makeServoParts(p).map(({g,...part})=>{
 if(g.decompose().length!==1)throw new Error(part.id+' is disconnected');
 const mesh=g.getMesh(),positions=[];
 for(const index of mesh.triVerts){const i=index*mesh.numProp;positions.push(...mesh.vertProperties.slice(i,i+3));}
 // Export horn in assembly coordinates, while keeping its pivot for animation.
 if(part.horn)for(let i=0;i<positions.length;i++)positions[i]+=part.pivot[i%3];
 return {...part,positions,volume_mm3:g.volume(),status:g.status()};
});
fs.writeFileSync(new URL('../web/models/servo-design.json',import.meta.url),JSON.stringify({parameters:p,parts,note:'Solid CAD prototype. SG90s and pins are bought hardware envelopes. Tolerances, catch flexure and gravity reset require testing.'}));
console.log('Built',parts.length,'solid servo bodies;',parts.filter(p=>p.printed).length,'printed components');
