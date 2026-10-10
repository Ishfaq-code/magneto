import {createServoGeometry} from './servo-geometry.js';
import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
const $=id=>document.getElementById(id),viewport=$('viewport');
const scene=new THREE.Scene();scene.background=new THREE.Color(0xf3f5f7);
const camera=new THREE.PerspectiveCamera(40,1,.1,2000);camera.up.set(0,0,1);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));viewport.append(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
scene.add(new THREE.HemisphereLight(0xffffff,0x8195a4,2));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-80,-120,200);scene.add(light);
const {groups,horns,pins,fingers,latched,chosen,carrier,lidMat,applyCatchFlex}=createServoGeometry(await (await fetch('models/servo-design.json')).json());
Object.values(groups).forEach(g=>scene.add(g));
let animation=null;
const labels={servo:'Six SG90s + horns',pins:'Pins + collars',catches:'Catches + reset tab',frame:'Housing + guides'};
for(const key of Object.keys(groups)){const row=document.createElement('label');row.className='part';const input=document.createElement('input');input.type='checkbox';input.checked=true;input.id='show-'+key;input.onchange=applyView;row.append(input,document.createTextNode(labels[key]));$('layers').append(row);}
// Reading side numbering: 1 4 / 2 5 / 3 6.
for(const i of [0,3,1,4,2,5]){const b=document.createElement('button');b.textContent='Dot '+(i+1);b.id='dot-'+i;b.setAttribute('aria-pressed','false');b.onclick=()=>{chosen[i]=!chosen[i];syncButtons();};$('dotButtons').append(b);}
function syncButtons(){chosen.forEach((v,i)=>$('dot-'+i).setAttribute('aria-pressed',String(v)));}
function applyView(){const view=$('view').value,e=Number($('explode').value)/100;$('explodeValue').textContent=Math.round(e*100)+'%';for(const [key,g]of Object.entries(groups)){g.visible=(view==='all'||view===key)&&$('show-'+key).checked;g.position.z=e*({servo:0,frame:60,pins:40,catches:20}[key]);}lidMat.opacity=$('transparent').checked?.32:1;}
function fit(mode='iso'){const box=new THREE.Box3();Object.values(groups).filter(g=>g.visible).forEach(g=>box.expandByObject(g));if(box.isEmpty())return;const c=box.getCenter(new THREE.Vector3()),s=box.getSize(new THREE.Vector3());const d=Math.max(s.x,s.y,s.z,20)/(2*Math.tan(camera.fov*Math.PI/360))*1.45/Math.min(camera.aspect,1);const direction=mode==='top'?new THREE.Vector3(0,.001,1):mode==='side'?new THREE.Vector3(0,-1,.05):new THREE.Vector3(.8,-1,.7).normalize();controls.target.copy(c);camera.position.copy(c).add(direction.multiplyScalar(d));controls.update();}
function busy(value){$('write').disabled=value;$('reset').disabled=value;$('hi').disabled=value;}
$('hi').onclick=()=>{chosen.fill(false);[0,1,4].forEach(i=>chosen[i]=true);syncButtons();};
$('write').onclick=()=>{if(animation)return;const additions=chosen.map((v,i)=>v&&!latched[i]);if(!additions.some(Boolean)){$('readout').textContent='No new dots selected. Pull the tab to clear existing dots.';return;}animation={kind:'write',start:performance.now(),additions};busy(true);$('readout').textContent='Servos lift selected pins; catches flex and engage.';};
$('reset').onclick=()=>{if(animation)return;animation={kind:'reset',start:performance.now(),before:[...latched]};busy(true);$('readout').textContent='Pulling tab right to release all catches…';};
$('view').onchange=()=>{applyView();fit();};$('explode').oninput=applyView;$('transparent').onchange=applyView;$('fit').onclick=()=>fit();$('iso').onclick=()=>fit();$('top').onclick=()=>fit('top');$('side').onclick=()=>fit('side');
const resize=()=>{const w=viewport.clientWidth,h=viewport.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(viewport);resize();applyView();fit();$('status').textContent='Solid CAD prototype · catch flexibility and gravity reset untested';
function frame(now){requestAnimationFrame(frame);
 if(animation){const t=(now-animation.start)/1000;
  if(animation.kind==='write'){
   const rise=Math.min(1,t/.8),retract=Math.max(0,Math.min(1,(t-1)/.7)),angle=(1-retract)*rise*Math.asin(3.75/16);
   for(let i=0;i<6;i++){if(!animation.additions[i])continue;horns[i].rotation.y=-horns[i].userData.sign*angle;pins[i].position.z=Math.max(0,3.75*rise-1.35);fingers[i].position.x=1.5*Math.sin(rise*Math.PI);}
   if(t>1){animation.additions.forEach((v,i)=>{if(v)latched[i]=true;});$('readout').textContent='Catches hold the pins while servo horns retract.';}
   if(t>=1.8){horns.forEach(h=>h.rotation.y=0);fingers.forEach(f=>f.position.x=0);animation=null;busy(false);$('readout').textContent='Letter held by catches. Servos are retracted. Pull tab to reset.';}
  }else{
   const pull=Math.min(1,t/.6),drop=Math.min(1,Math.max(0,(t-.65)/.5)),release=Math.min(1,Math.max(0,(t-1.3)/.5));carrier.position.x=5*pull*(1-release);animation.before.forEach((v,i)=>pins[i].position.z=v?2.4*(1-drop):0);
   if(t>=1.9){latched.fill(false);pins.forEach(p=>p.position.z=0);carrier.position.x=0;animation=null;busy(false);$('readout').textContent='Blank cell. Tab returned; ready to write again.';}
  }
 }
 applyCatchFlex();controls.update();renderer.render(scene,camera);
}
requestAnimationFrame(frame);
// Read-only hooks for checking state during local QA.
window.servoCellState=()=>({latched:[...latched],selected:[...chosen],tabTravel:carrier.position.x,busy:!!animation,parts:Object.keys(groups)});
