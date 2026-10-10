import * as THREE from './vendor/three.module.js';
// The animation consumes exactly the solid meshes produced by scripts/build-servo.mjs.
export function createServoGeometry(design){
 const groups=Object.fromEntries(['frame','servo','pins','catches'].map(k=>[k,new THREE.Group()]));
 const horns=[],pins=[],fingers=Array.from({length:6},()=>({position:{x:0}}));
 const latched=Array(6).fill(false),chosen=Array(6).fill(false),carrier=new THREE.Group();
 groups.catches.add(carrier);let lidMat,catchMesh,catchRest;
 const colors={frame:0x71848e,servo:0x2584b4,pins:0xb6c6cf,catches:0x63a78a};
 for(const part of design.parts){
  const positions=Float32Array.from(part.positions);
  if(part.horn)for(let i=0;i<positions.length;i++)positions[i]-=part.pivot[i%3];
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({color:part.horn?0xe3aa45:colors[part.group],roughness:.65,metalness:part.group==='pins'?.65:0});
  const mesh=new THREE.Mesh(geometry,material);mesh.name=part.name;
  if(part.lid){lidMat=material;material.transparent=true;material.opacity=.32;material.depthWrite=false;}
  if(part.horn){mesh.position.set(...part.pivot);mesh.userData.sign=part.sign;horns.push(mesh);groups.servo.add(mesh);}
  else if(part.group==='pins'){pins[part.channel]=mesh;groups.pins.add(mesh);}
  else if(part.carrier){carrier.add(mesh);catchMesh=mesh;catchRest=positions.slice();}
  else groups[part.group].add(mesh);
 }
 function applyCatchFlex(){
  const positions=catchMesh.geometry.attributes.position;
  for(let i=0;i<positions.count;i++){
   const x=catchRest[i*3],y=catchRest[i*3+1],z=catchRest[i*3+2];let offset=0;
   for(let c=0;c<6;c++){
    const px=c<3?-design.parameters.dotPitch/2:design.parameters.dotPitch/2;
    const py=(c%3-1)*design.parameters.dotPitch;
    if(Math.abs(y-py)<=2.001&&x>=px+1.2&&x<=px+7.7&&z>39){offset=fingers[c].position.x*Math.min(1,(z-39)/8);break;}
   }
   positions.setX(i,x+offset);
  }
  positions.needsUpdate=true;catchMesh.geometry.computeVertexNormals();
 }
 return {groups,horns,pins,fingers,latched,chosen,carrier,lidMat,applyCatchFlex};
}
