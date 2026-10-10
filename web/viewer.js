import './header.js';
import {createDimensions} from './dimensions.js';
import * as THREE from 'three';
import {STLLoader} from './vendor/STLLoader.js';
import {STLExporter} from './vendor/STLExporter.js';
import {OrbitControls} from './vendor/OrbitControls.js';
const $=id=>document.getElementById(id);
const names=['Carriage bottom','Long arm','Short crank','Shaft adapter'];
const files=['01_flat_carriage_bottom','02_long_connecting_arm','03_short_crank_arm','04_motor_shaft_adapter'];
const colors=[0x317f9a,0xe3a64a,0xe77963,0x7186c6];
const descriptions=['100 × 80 × 5 mm. Flat top; four mounting holes on a 70 × 50 mm pattern.','90 mm between bearing centers. Two bearing pockets; 108 mm overall length.','35 mm crank radius. Bearing pocket at the tip; bolts to the shaft adapter.','Split clamp, square registration spigot and two flange screws. Nominal 5 mm shaft.'];
const viewport=$('viewport'),scene=new THREE.Scene();scene.background=new THREE.Color(0xf3f5f7);
const camera=new THREE.PerspectiveCamera(40,1,.1,3000);camera.up.set(0,0,1);
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true});}catch(e){$('status').textContent='3D needs WebGL enabled in your browser.';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));viewport.append(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
scene.add(new THREE.HemisphereLight(0xffffff,0x8195a4,2.1));
const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-80,-120,250);scene.add(light);
const fill=new THREE.DirectionalLight(0xffffff,1.2);fill.position.set(100,100,80);scene.add(fill);
const grid=new THREE.GridHelper(600,30,0xc6d1d8,0xe1e7eb);grid.rotation.x=Math.PI/2;grid.position.z=-3;scene.add(grid);
const group=new THREE.Group();scene.add(group);const meshes=[];let selected=-1,playing=false,lastTime=0,phase=0,customMode=false,currentMode=null,currentDocument=null,currentDots=[true,true,true,true,true,true];
const dimensions=createDimensions($('viewport'),camera,()=>meshes.filter(m=>m.visible),()=>$('view').value!=='assembly');
function linkage(degrees){const theta=degrees*Math.PI/180;const x=35*Math.cos(theta),y=35*Math.sin(theta);return{x,y,slider:x+Math.sqrt(90**2-y**2),phi:Math.atan2(-y,Math.sqrt(90**2-y**2)),theta};}
function selectPart(i){selected=i;$('partName').textContent=names[i];$('partInfo').textContent=descriptions[i];$('download').hidden=false;if(customMode){if($('download').dataset.blob)URL.revokeObjectURL($('download').dataset.blob);const blob=URL.createObjectURL(new Blob([new STLExporter().parse(new THREE.Mesh(meshes[i].geometry),{binary:true})],{type:'application/octet-stream'}));$('download').href=blob;$('download').dataset.blob=blob;$('download').download=names[i]+'.stl';}else{$('download').href=`models/${files[i]}_DRAFT.stl`;$('download').download=files[i]+'.stl';}meshes.forEach((m,j)=>m.material.emissive.setHex(j===i?0x12212a:0));}
function update(){if(!meshes.length)return;
 const solo=$('view').value!=='assembly',i=Number($('view').value),angle=Number($('angle').value),e=Number($('explode').value)/100,k=linkage(angle);
 const readable=currentMode==='readable';$('motion').hidden=customMode&&!readable;$('motion').classList.toggle('readable',readable);$('dotControls').hidden=!readable;$('fitNote').hidden=customMode;
 $('angleValue').textContent=angle.toFixed(1)+'°';$('explodeValue').textContent=Math.round(e*100)+'%';$('travel').textContent=(k.slider-linkage(135.585).slider).toFixed(1)+' / 50 mm';
 $('play').disabled=solo||(customMode&&!readable);$('angle').disabled=solo||customMode;$('explode').disabled=solo||(customMode&&!readable);grid.visible=!solo;
 meshes.forEach((m,j)=>{m.rotation.set(0,0,0);m.scale.set(1,1,1);m.visible=solo?j===i:$('visible'+j).checked;if(solo){m.position.copy(m.userData.center).multiplyScalar(-1);return;}if(readable){const part=m.userData.part,down=part.channel!==null&&!currentDots[part.channel];m.position.set(0,0,e*part.level*8);m.scale.set(1,1,1);if(part.spring&&down){const scale=(5.4-.8)/5.4;m.scale.z=scale;m.position.z+=12*(1-scale);}else if(down&&(part.group.startsWith('03')||part.group.startsWith('04')))m.position.z-=.8;return;}if(customMode){m.position.copy(m.userData.center).multiplyScalar(-1);m.position.x+=(j-(meshes.length-1)/2)*140;return;}if(j===0)m.position.set(k.slider+40,0,24+e*90);if(j===1){m.position.set(k.x,k.y,18+e*60);m.rotation.z=k.phi;}if(j===2){m.position.set(0,0,13+e*30);m.rotation.z=k.theta;}if(j===3){m.position.set(0,0,0);m.rotation.z=k.theta;}});
}
function fit(top=false){const box=new THREE.Box3();meshes.filter(m=>m.visible).forEach(m=>box.expandByObject(m));if(box.isEmpty())return;const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());const distance=Math.max(size.x,size.y,size.z,20)/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))*1.85/Math.min(camera.aspect,1);controls.target.copy(center);camera.position.copy(center).add(top?new THREE.Vector3(0,.001,distance):new THREE.Vector3(.6,-.8,.8).normalize().multiplyScalar(distance));camera.near=.1;camera.far=5000;camera.updateProjectionMatrix();controls.update();}
function stop(){playing=false;$('play').textContent=currentMode==='readable'?'Animate dots':'Play linkage';}
$('view').onchange=()=>{stop();if($('view').value!=='assembly')selectPart(Number($('view').value));update();fit();};
$('angle').oninput=()=>{stop();update();};$('explode').oninput=update;
$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Pause':currentMode==='readable'?'Animate dots':'Play linkage';phase=Math.acos(Math.max(-1,Math.min(1,(Number($('angle').value)-90)/45.585)));};
$('assemble').onclick=()=>{stop();$('view').value='assembly';$('explode').value=0;meshes.forEach((m,i)=>$('visible'+i).checked=true);update();fit();};
$('fit').onclick=()=>fit();$('top').onclick=()=>fit(true);$('iso').onclick=()=>fit();$('wire').onchange=()=>meshes.forEach(m=>m.material.wireframe=$('wire').checked);
const resize=()=>{const w=viewport.clientWidth,h=viewport.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(viewport);resize();
const raycaster=new THREE.Raycaster();let pointerStart;
renderer.domElement.addEventListener('pointerdown',e=>pointerStart=[e.clientX,e.clientY]);
renderer.domElement.addEventListener('pointerup',e=>{if(!pointerStart||Math.hypot(e.clientX-pointerStart[0],e.clientY-pointerStart[1])>4)return;const rect=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hits=raycaster.intersectObjects(meshes.filter(m=>m.visible));if(hits.length)selectPart(meshes.indexOf(hits[0].object));});
function setParts(parts){
 for(const m of meshes){group.remove(m);m.geometry.dispose();m.material.dispose();}meshes.length=0;names.length=0;descriptions.length=0;$('parts').replaceChildren();$('view').replaceChildren(new Option(customMode?'All parts':'Assembly','assembly'));
 let lastGroup=null,groupContainer=$('parts');parts.forEach((part,i)=>{if(part.group&&part.group!==lastGroup){const folder=document.createElement('details');folder.className='partGroup';folder.open=part.group.startsWith('01');const heading=document.createElement('summary');heading.textContent=part.group;folder.append(heading);$('parts').append(folder);groupContainer=folder;lastGroup=part.group;}names.push(part.name);descriptions.push(part.description);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(part.positions,3));geo.computeVertexNormals();geo.computeBoundingBox();const color=part.color??colors[i%colors.length];const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color,roughness:.65,metalness:.05,wireframe:$('wire').checked}));m.userData.part=part;m.userData.center=geo.boundingBox.getCenter(new THREE.Vector3());meshes.push(m);group.add(m);
 const row=document.createElement('div');row.className='part';const check=document.createElement('input');check.type='checkbox';check.id='visible'+i;check.checked=true;check.setAttribute('aria-label','Show '+part.name);check.onchange=update;const swatch=document.createElement('span');swatch.className='swatch';swatch.style.background='#'+color.toString(16).padStart(6,'0');const label=document.createElement('label');label.htmlFor=check.id;label.textContent=part.name;row.append(check,swatch,label);groupContainer.append(row);$('view').append(new Option(part.name,String(i)));});
 selectPart(0);update();fit();
}
async function load(){try{const originalNames=[...names],originalDescriptions=[...descriptions];const data=await Promise.all(files.map(async f=>{const r=await fetch(`models/${f}.mesh.json`);if(!r.ok)throw new Error('Missing model: '+f);return r.json();}));setParts(data.map((tri,i)=>({name:originalNames[i],description:originalDescriptions[i],positions:tri.flat(2)})));$('status').textContent='';}catch(e){$('status').textContent='Could not load models. Start the included local server, then reload. '+e.message;}}
function frame(time){requestAnimationFrame(frame);const dt=Math.min((time-lastTime)/1000,.05);lastTime=time;if(playing&&currentMode==='readable'){phase+=dt;const patterns=[[true,true,true,false,false,false],[true,false,false,false,true,false],[false,true,true,true,false,false]];currentDots=patterns[Math.floor(phase)%patterns.length];updateDots();update();}else if(playing){phase+=dt*.7;$('angle').value=90+45.585*Math.cos(phase);update();}controls.update();dimensions.update();renderer.render(scene,camera);}load().then(async()=>{await installDriveDesign();await installPaperDesign();});requestAnimationFrame(frame);

// Small browser-local design library. Saves geometry as well as the view settings.
const storageKey='magneto-designs-v1';
let designs=[];try{designs=JSON.parse(localStorage.getItem(storageKey)||'[]');if(!Array.isArray(designs))designs=[];}catch(e){$('designStatus').textContent='Saved designs could not be read.';}
function showTab(designsTab){$('viewerPanel').hidden=designsTab;$('designsPanel').hidden=!designsTab;$('viewerTab').setAttribute('aria-pressed',!designsTab);$('designsTab').setAttribute('aria-pressed',designsTab);if(designsTab){stop();renderDesigns();}else{resize();}}
$('viewerTab').onclick=()=>showTab(false);$('backToViewer').onclick=()=>showTab(false);$('designsTab').onclick=()=>showTab(true);
function persist(next){try{localStorage.setItem(storageKey,JSON.stringify(next));designs=next;return true;}catch(e){$('designStatus').textContent='Browser storage is full or unavailable. Delete an older design or use fewer STL files.';return false;}}
function capture(name){return{id:crypto.randomUUID(),name,date:new Date().toISOString(),customMode,mode:currentMode,document:currentDocument,dots:currentDots,parts:meshes.map((m,i)=>({...m.userData.part,name:names[i],description:descriptions[i],positions:Array.from(m.geometry.attributes.position.array)})),view:$('view').value,angle:$('angle').value,explode:$('explode').value,wire:$('wire').checked,visible:meshes.map((m,i)=>$('visible'+i).checked),selected,camera:camera.position.toArray(),target:controls.target.toArray()};}
function openDesign(d){if(d.page){location.href=d.page;return;}stop();customMode=d.customMode;currentMode=d.mode||null;currentDocument=d.document||null;currentDots=d.dots||[true,true,true,true,true,true];showPaper();updateDots();$('wire').checked=d.wire;setParts(d.parts);$('view').value=d.view;$('angle').value=d.angle;$('explode').value=d.explode;d.visible.forEach((v,i)=>$('visible'+i).checked=v);update();selectPart(Math.max(0,Math.min(d.selected,meshes.length-1)));stop();camera.position.fromArray(d.camera);controls.target.fromArray(d.target);controls.update();$('designName').value=d.name;showTab(false);}
function renderDesigns(){const list=$('designList');list.replaceChildren();if(!designs.length){const p=document.createElement('p');p.className='empty';p.textContent='No saved designs yet. Name your current design above to save it.';list.append(p);}for(const d of designs){const row=document.createElement('div');row.className='savedDesign';const text=document.createElement('div'),name=document.createElement('strong'),info=document.createElement('p');name.textContent=d.name;info.textContent=(d.page?'Six servos · pins · catches · pull-tab reset':d.parts.length+' parts')+' · '+new Date(d.date).toLocaleDateString();text.append(name,info);const open=document.createElement('button');open.textContent='Open';open.onclick=()=>openDesign(d);const del=document.createElement('button');del.textContent='Delete';del.className='deleteDesign';del.onclick=()=>{if(persist(designs.filter(x=>x.id!==d.id))){$('designStatus').textContent='Deleted '+d.name;renderDesigns();}};row.append(text,open,del);list.append(row);}}
$('saveDesign').onsubmit=e=>{e.preventDefault();const name=$('designName').value.trim();if(!name||!meshes.length)return;if(persist([capture(name),...designs])){$('designStatus').textContent='Saved '+name;renderDesigns();}};
$('importFiles').onchange=async e=>{const picked=[...e.target.files];if(!picked.length)return;try{const loader=new STLLoader(),parts=[];for(const f of picked){const geo=loader.parse(await f.arrayBuffer());const positions=Array.from(geo.attributes.position.array);if(!positions.length||positions.some(v=>!Number.isFinite(v)))throw new Error('Invalid STL: '+f.name);parts.push({name:f.name.replace(/\.stl$/i,''),description:'Imported STL part. Dimensions are interpreted in millimeters.',positions});geo.dispose();}stop();customMode=true;currentMode=null;currentDocument=null;showPaper();$('angle').value=90;$('explode').value=0;setParts(parts);$('designName').value=parts[0].name;$('designStatus').textContent='Imported '+parts.length+' parts. Save this design when ready.';showTab(false);}catch(err){$('designStatus').textContent=err.message;}e.target.value='';};

function updateDots(){[...$('dotButtons').children].forEach((b,i)=>b.setAttribute('aria-pressed',currentDots[i]));}
for(let i=0;i<6;i++){const b=document.createElement('button');b.textContent=String(i+1);b.title='Toggle dot '+(i+1);b.onclick=()=>{stop();currentDots[i]=!currentDots[i];updateDots();update();};$('dotButtons').append(b);}
function showPaper(){$('paperDetails').hidden=!currentDocument;if(!currentDocument)return;$('paperNote').textContent=currentDocument.note;$('paperLink').href=currentDocument.paper;const table=$('measurementTable');table.replaceChildren();for(const row of currentDocument.measurements){const tr=document.createElement('tr');for(const value of row){const td=document.createElement('td');td.textContent=value;tr.append(td);}table.append(tr);}}
async function installPaperDesign(){try{if(localStorage.getItem('magneto-readable-installed-v2'))return;const r=await fetch('models/readable-design.json');if(!r.ok)throw new Error('Could not load research design');const d=await r.json();if(!persist([d,...designs.filter(x=>x.id!==d.id)]))return;localStorage.setItem('magneto-readable-installed-v2','true');renderDesigns();if(location.hash!=='#designs')openDesign(d);}catch(e){$('designStatus').textContent=e.message;}}

// The servo concept has its own controls, opened from the same design library.
if(!localStorage.getItem('magneto-servo-installed-v1')){
 const d={id:'servo-reset-v1',name:'Servo + reset',date:'2026-10-10T12:00:00Z',page:'servo-cell.html'};
 if(persist([d,...designs.filter(x=>x.id!==d.id)]))localStorage.setItem('magneto-servo-installed-v1','true');
}
if(location.hash==='#designs')showTab(true);

async function installDriveDesign(){
 try{
  if(localStorage.getItem('magneto-drive-installed-v1'))return;
  const r=await fetch('models/drive-design.json');if(!r.ok)throw new Error('Could not load motor-arm design');
  const d=await r.json();
  if(!designs.some(x=>x.id===d.id)&&!persist([d,...designs]))return;
  localStorage.setItem('magneto-drive-installed-v1','true');renderDesigns();
 }catch(e){$('designStatus').textContent=e.message;}
}
