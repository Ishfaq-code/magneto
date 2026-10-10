import fs from 'node:fs';import {makeParts} from '../cad/drive/drive-source.mjs';
const parameters=JSON.parse(fs.readFileSync(new URL('../cad/drive/parameters.json',import.meta.url)));
const d=makeParts(parameters),manifest=[];
for(let i=0;i<4;i++){
 const g=d.parts[i];if(g.status()!=='NoError')throw new Error(g.status());
 const mesh=g.getMesh(),n=mesh.triVerts.length/3,triangles=[];const b=Buffer.alloc(84+50*n);b.write('Magneto draft CAD - millimeters');b.writeUInt32LE(n,80);
 for(let j=0;j<n;j++){
  const tri=[];for(let k=0;k<3;k++){const idx=mesh.triVerts[j*3+k]*mesh.numProp;const v=Array.from(mesh.vertProperties.slice(idx,idx+3));tri.push(v);for(let a=0;a<3;a++)b.writeFloatLE(v[a],84+j*50+12+k*12+a*4);}
  triangles.push(tri);
 }
 fs.writeFileSync(new URL('../exports/drive/'+d.names[i]+'_DRAFT.stl',import.meta.url),b);fs.writeFileSync(new URL('../web/models/'+d.names[i]+'.mesh.json',import.meta.url),JSON.stringify(triangles));
 manifest.push({name:d.names[i],status:g.status(),triangles:n,volume_mm3:g.volume(),bounds:g.boundingBox()});
}
fs.writeFileSync(new URL('../cad/drive/manifest.json',import.meta.url),JSON.stringify(manifest,null,2));console.log(manifest);
