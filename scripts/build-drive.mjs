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

// Ship the motor-arm design as a file, so a fresh browser also lists it in Designs.
const descriptions=['100 × 80 × 5 mm. Flat top; four mounting holes on a 70 × 50 mm pattern.','90 mm between bearing centers. Two bearing pockets; 108 mm overall length.','35 mm crank radius. Bearing pocket at the tip; bolts to the shaft adapter.','Split clamp, square registration spigot and two flange screws. Nominal 5 mm shaft.'];
const displayNames=['Carriage bottom','Long arm','Short crank','Shaft adapter'];
const parts=d.names.map((name,i)=>({name:displayNames[i],description:descriptions[i],positions:JSON.parse(fs.readFileSync(new URL('../web/models/'+name+'.mesh.json',import.meta.url))).flat(2)}));
const design={id:'magneto-drive-v1',name:'Motor arm — four-part drive',date:'2026-10-10T12:00:00Z',customMode:false,mode:null,document:null,parts,view:'assembly',angle:'90',explode:'0',wire:false,visible:parts.map(()=>true),selected:0,camera:[240,-200,200],target:[80,0,20]};
fs.writeFileSync(new URL('../web/models/drive-design.json',import.meta.url),JSON.stringify(design));
