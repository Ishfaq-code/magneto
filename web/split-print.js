import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
const $=id=>document.getElementById(id),el=$('viewport');
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));el.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#edf1f3');
const camera=new THREE.PerspectiveCamera(40,1,.1,10000);camera.up.set(0,0,1);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
scene.add(new THREE.HemisphereLight(0xffffff,0x56616c,2.6));const light=new THREE.DirectionalLight(0xffffff,2.4);light.position.set(100,-300,700);scene.add(light);
const group=new THREE.Group();scene.add(group);
const data=await fetch('models/split-print-design.json',{cache:'no-store'}).then(r=>r.json());
const colors=[0xe58c39,0x328caf,0x85ad54,0xb16cc2,0xd4b944,0x4272bc,0xdf6e75];let top=false;
function fit(){const b=new THREE.Box3().setFromObject(group),c=b.getCenter(new THREE.Vector3()),s=b.getSize(new THREE.Vector3());const d=s.length()*.575/Math.sin(THREE.MathUtils.degToRad(camera.fov/2))/Math.min(camera.aspect,1);controls.target.copy(c);camera.position.copy(c).add((top?new THREE.Vector3(0,-.001,1):new THREE.Vector3(-.5,-.8,.75)).normalize().multiplyScalar(d));controls.update();}
function show(){
 while(group.children.length){const m=group.children[0];group.remove(m);m.geometry.dispose();m.material.dispose();}
 const mode=$('view').value,assembly=!/^\d+$/.test(mode),amount=Number($('explode').value);$('explode').disabled=!assembly;
 const parts=assembly?data.parts.filter(p=>mode==='assembly'?p.source!=='coupon':mode==='cart'?['casing','casing-panel','wheel-holder'].includes(p.source):mode==='holder'?p.id==='wheel-holder-2-front':p.source===mode):data.beds[Number(mode)].parts;
 for(const [i,p] of parts.entries()){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p.positions,3));g.computeVertexNormals();
  const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:colors[i%colors.length],roughness:.75}));m.name=p.id;
  if(assembly){
   const onCart=['casing','wheel-holder'].includes(p.source)||(mode==='cart'&&p.source==='casing-panel');
   const t=onCart?[175,70,-53]:p.source==='casing-panel'?[175,-50,-55.3]:p.source==='drive-long-arm'?[-275,-130,0]:p.source==='coupon'?[0,0,0]:[-110,-195,4];
   m.position.set(...t);m.position.x+=(p.section-2)*amount;
   if(p.source==='wheel-holder')m.position.z-=amount*.6;
   if(mode==='cart'&&p.source==='casing-panel')m.position.y-=amount;
  }
  group.add(m);
 }
 if(!assembly){const g=new THREE.PlaneGeometry(256,256),m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0xd9e1e5,side:THREE.DoubleSide}));m.position.set(128,128,-.15);group.add(m);}
 $('status').textContent=assembly?'Square sockets slide lengthwise. Axle holders unbolt underneath the tray pads. Drag to orbit.':`Plate ${Number($('view').value)+1}: ${parts.length} separate solids · 5 mm minimum edge margin · ≥3 mm silhouette gaps.`;
 fit();
}
$('view').onchange=show;$('explode').oninput=show;$('top').onclick=()=>{top=true;fit();};$('iso').onclick=()=>{top=false;fit();};
new ResizeObserver(()=>{camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight);fit();}).observe(el);
show();renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
window.splitPrintState=()=>({view:$('view').value,explosion:Number($('explode').value),parts:group.children.filter(m=>m.name).map(m=>m.name),plates:data.beds.length});
