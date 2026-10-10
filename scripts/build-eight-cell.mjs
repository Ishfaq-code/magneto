import fs from 'node:fs';
import {resetParameters} from '../cad/eight-cell/reset-source.mjs';
import {makeEightCellParts} from '../cad/eight-cell/casing-source.mjs';
import {makeArmParts,armParameters,armLayout} from '../cad/eight-cell/arms-source.mjs';
import {wheelMount} from '../cad/eight-cell/wheel-mount-source.mjs';
import {traySupport} from '../cad/eight-cell/tray-support-source.mjs';
const parts=[...makeEightCellParts(),...makeArmParts()].map(({g,printed=true,...part})=>{
 if(g.status()!=='NoError'||g.decompose().length!==1)throw new Error(part.id+' is not one solid');
 const mesh=g.getMesh(),positions=[];
 for(const index of mesh.triVerts)positions.push(...mesh.vertProperties.slice(index*mesh.numProp,index*mesh.numProp+3));
 return {...part,printed,positions};
});
fs.writeFileSync(new URL('../web/models/eight-cell-design.json',import.meta.url),JSON.stringify({parts,wheelMount,traySupport,reset:resetParameters,drive:{...armParameters,...armLayout()},note:'Prototype only. Arm and reset meshes share CAD with print exports. Bought hardware stays separate. Bearing width, race contact, motor fit and structural performance are provisional.'}));
