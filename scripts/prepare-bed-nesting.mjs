import fs from 'node:fs';
import {makeSplitParts} from '../cad/eight-cell/split-source.mjs';
const {parts}=makeSplitParts();
const data=parts.map(p=>({id:p.id,variants:[0,90,180,270].map(angle=>({angle,polygons:p.g.rotate([0,0,angle]).project().offset(2.3).toPolygons()}))}));
fs.writeFileSync('/tmp/magneto-nesting-shapes.json',JSON.stringify(data));
