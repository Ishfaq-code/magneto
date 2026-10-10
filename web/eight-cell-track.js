import './header.js';
import {mountShell} from './cardboard-shell.js';
import {createDimensions} from './dimensions.js';
import {createServoGeometry} from './servo-geometry.js';
import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
const $=id=>document.getElementById(id), scene=new THREE.Scene();scene.background=new THREE.Color('#f3f5f7');
const camera=new THREE.PerspectiveCamera(40,1,1,4000);camera.up.set(0,0,1);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));$('viewport').appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
scene.add(new THREE.HemisphereLight(0xffffff,0x657080,2.5));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(200,-250,600);scene.add(light);
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.5,...extra});
const orange=mat('#e99547'),blue=mat('#378bbb'),yellow=mat('#eac24c'),metal=mat('#a7b3be',{metalness:.7}),dark=mat('#344752'),red=mat('#d95a55'),lidMat=mat('#96c6d5',{transparent:true,opacity:.25,depthWrite:false});
function box(p,s,v,m){const o=new THREE.Mesh(new THREE.BoxGeometry(...s),m);o.position.set(...v);p.add(o);return o;}
function cyl(p,r,h,v,m){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,20),m);o.rotation.x=Math.PI/2;o.position.set(...v);p.add(o);return o;}
function rod(p,a,b,w,h,m){const o=box(p,[a.distanceTo(b),w,h],[0,0,0],m);o.position.copy(a).add(b).multiplyScalar(.5);o.rotation.z=Math.atan2(b.y-a.y,b.x-a.x);return o;}
const dots=[[-10,-20],[-10,0],[-10,20],[10,-20],[10,0],[10,20]], masks=[13,1,27,29,17,30,21,0],letters='MAGNETO ';
const design=await (await fetch('models/eight-cell-design.json',{cache:'no-store'})).json();
function solid(id,parent,material){const part=design.parts.find(p=>p.id===id),geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(part.positions,3));geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,material);mesh.name=part.name;mesh.userData.printed=part.printed;parent.add(mesh);return mesh;}
// Both pages construct the station and removable cells through the same renderer.
const servoDesign=await (await fetch('models/rail-servo-design.json',{cache:'no-store'})).json();
const railCellOffsetZ=20;
const tray=new THREE.Group();scene.add(tray);const cells=[],patterns=Array(8).fill(0);
for(let i=0;i<8;i++){
 const shared=createServoGeometry(servoDesign,{station:false});
 const g=new THREE.Group();g.position.set(-i*50,0,railCellOffsetZ);tray.add(g);
 Object.values(shared.groups).forEach(group=>g.add(group));
 // All repeated reading plates use one material for the visibility control.
 shared.groups.frame.traverse(mesh=>{if(mesh.userData.sourcePart==='reading-plate')mesh.material=lidMat;});
 cells.push({g,...shared,release:0});
}
const casing=solid('casing',tray,orange);
// Illustrative bought wheels/supports and a raised split platform, millimeters.
const wheelRadius=14,wheels=[],wheelHolders=[],cartHardware=[],platformParts=[];
const rubber=mat('#252a30'),hubMat=mat('#f0bf43'),platformMat=mat('#c4ad88');
for(const sign of [-1,1]){
 const deck=box(scene,[940,60,6],[-25,sign*106,21],platformMat);
 deck.name='Raised platform running surface · concept';platformParts.push(deck);
 const edge=box(scene,[940,4,5],[-25,sign*102,26.5],dark);
 edge.name='Straight guide edge · 1 mm nominal wheel-side gap';platformParts.push(edge);
 for(const px of [-475,425]){
  const leg=box(scene,[30,60,18],[px,sign*106,9],platformMat);
  leg.name='Platform riser · concept';platformParts.push(leg);
 }
 for(const px of [-410,70]){
  wheelHolders.push(solid(`wheel-holder-${px<0?1:2}-${sign<0?'front':'rear'}`,tray,blue));
  const axle=new THREE.Mesh(new THREE.CylinderGeometry(3,3,28,20),metal);
  axle.position.set(px,sign*86,38);tray.add(axle);axle.name='Future axle · provisional Ø6 mm envelope, retention unresolved';cartHardware.push(axle);
  const pivot=new THREE.Group();pivot.position.set(px,sign*94,38);tray.add(pivot);
  const tire=new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius,wheelRadius,10,40),rubber);pivot.add(tire);
  tire.name='Bought wheel · provisional Ø28 × 10 mm';cartHardware.push(tire);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(8,8,10.4,24),hubMat);pivot.add(hub);
  hub.name='Wheel hub · bought hardware concept';cartHardware.push(hub);
  // Visible offset marker makes rolling direction apparent in the animation.
  const marker=box(pivot,[3,10.8,6],[0,0,4],dark);marker.name='Wheel rotation marker';cartHardware.push(marker);
  wheels.push(pivot);
 }
}
[...cartHardware,...platformParts].forEach(m=>{m.userData.printed=false;m.userData.concept=true;});
const casingPanel=solid('casing-panel',tray,orange);
let panelOpen=false;
// Wheels carry the extended tray on two raised running surfaces.
solid('tray-tow-drawbar',tray,orange);
const sharedStation=createServoGeometry(servoDesign,{cell:false});
const servos=new THREE.Group();servos.position.z=railCellOffsetZ;scene.add(servos);
servos.add(sharedStation.groups.frame,sharedStation.groups.servo);
// The wheeled cart carries the tray: lower the unchanged docking base enough for
// its locating pegs to clear moving cell undersides (provisional placement).
sharedStation.groups.frame.position.z=-1.5;
const horns=sharedStation.horns;horns.forEach((horn,i)=>horn.userData.channel=i);
const reset=new THREE.Group();reset.position.set(...design.reset.pivot);scene.add(reset);const resetBracket=solid('reset-bracket',reset,dark);const flapPivot=new THREE.Group();reset.add(flapPivot);const flap=solid('reset-flap',flapPivot,red);const resetAxle=solid('reset-axle',reset,metal);
const mechanism=new THREE.Group();scene.add(mechanism);
const drive=design.drive,R=drive.crankRadius,L=drive.rodLength,motorX=drive.motorX;
const motor=box(mechanism,[42,42,39],[motorX,drive.motorY,drive.baseZ-6-19.5],dark);motor.name='Bought PK244M-03BA motor · 42 × 42 × 39 mm envelope';motor.userData.printed=false;
const motorStand=box(mechanism,[50,50,55],[motorX,drive.motorY,drive.baseZ-45-27.5],dark);motorStand.name='Raised motor support · 55 mm lift (mounting concept)';motorStand.userData.concept=true;
const shaft=cyl(mechanism,2.5,20,[motorX,drive.motorY,drive.baseZ+4],metal);shaft.name='Bought motor shaft · Ø5 mm · flat omitted in envelope';shaft.userData.printed=false;
const crank=solid('drive-short-arm',mechanism,orange),arm=solid('drive-long-arm',mechanism,blue);
const jointHardware=new THREE.Group();mechanism.add(jointHardware);
for(const id of ['drive-bearing','drive-bolt','drive-washer-0','drive-washer-1','drive-nut'])solid(id,jointHardware,metal);
const trayJoint=cyl(mechanism,1.5,12,[0,0,0],metal);trayJoint.name='Additional tray pivot fastener · mounting concept';trayJoint.userData.printed=false;
let x=0,phase='idle',elapsed=0,index=0,startX=x,targetX=x,auto=false,writeTime=0,last=performance.now(),direction=0;
function info(message){$('readout').textContent=message;$('status').textContent=message;}
function updatePosition(value){const previous=x;x=value;direction=Math.sign(x-previous);tray.position.x=x;wheels.forEach(w=>w.rotation.y=x/wheelRadius);
 const s=motorX-(x+drive.sliderX);
 const theta=Math.acos(THREE.MathUtils.clamp((s*s+R*R-L*L)/(2*R*s),-1,1));
 const a=new THREE.Vector3(motorX,drive.motorY,drive.baseZ),b=new THREE.Vector3(motorX-R*Math.cos(theta),drive.motorY+R*Math.sin(theta),drive.baseZ),c=new THREE.Vector3(x+drive.sliderX,drive.motorY,drive.baseZ+drive.rodZ);
 crank.position.copy(a);crank.rotation.z=Math.PI-theta;
 arm.position.copy(b);arm.position.z+=drive.rodZ;arm.rotation.z=Math.atan2(c.y-b.y,c.x-b.x);
 jointHardware.position.copy(b);trayJoint.position.copy(c);trayJoint.position.z+=1;
 $('driveState').textContent='Tray X '+x.toFixed(0)+' mm · 400 mm stroke · crank '+THREE.MathUtils.radToDeg(theta).toFixed(1)+'° · 225 / 550 mm centers';
 let flapAngle=0;
 cells.forEach((cell,i)=>{
  const relative=x-i*50-design.reset.pivot[0];
  // The tapered cam pushes transversely; the follower clears after its crest.
  const r=design.reset,tipY=r.tabTipY-r.pivot[1];
  const camY=r.camCrestY-(r.camCrestY-r.camBaseY)*Math.max(0,Math.abs(relative)-r.camCrestHalfWidth-r.tabTipHalfWidth)/(r.camHalfWidth-r.camCrestHalfWidth);
  const release=direction<0?Math.max(0,Math.min(r.travel,camY-tipY)):0;
  cell.release=release;cell.carrier.position.y=release;
  const previousRelative=previous-i*50-design.reset.pivot[0];
  if(direction<0&&(release>=design.reset.travel-.01||(previousRelative>0&&relative<=0)))patterns[i]=0;
  if(direction>0&&relative>-12&&relative<28){
   const opening=Math.min(1,(relative+12)/6),closing=Math.min(1,(28-relative)/8);
   flapAngle=Math.min(flapAngle,-THREE.MathUtils.degToRad(design.reset.flapOpenAngle)*Math.max(0,Math.min(opening,closing)));
  }
 });
 flapPivot.rotation.y=flapAngle;
 $('position').value=x;$('positionValue').textContent=Math.round(x)+' mm';
 $('resetState').textContent=direction>0?'Forward: rigid flap swings upward; carriers stay ready.':direction<0?'Return: flap on stop · carrier release '+Math.max(...cells.map(c=>c.release)).toFixed(1)+' / '+design.reset.travel+' mm.':'Ready: gravity holds the flap against its stop.';
}

function renderPins(){$('cellStates').textContent=patterns.map((mask,i)=>'['+(i+1)+': '+(mask ? letters[i] : '·')+']').join(' ');cells.forEach((cell,i)=>cell.pins.forEach((pin,j)=>{let lift=patterns[i]&(1<<j)?servoDesign.parameters.dotLift:0;if(phase==='write'&&i===index&&(masks[i]&(1<<j)))lift=Math.max(lift,servoDesign.parameters.dotLift*Math.min(1,writeTime/.55));pin.position.z=lift;}));
 cells.forEach((cell,i)=>{
  cell.fingers.forEach((finger,j)=>{
   const active=phase==='write'&&i===index&&writeTime<.55&&(masks[i]&(1<<j));
   finger.position.y=active?1.5*Math.sin(Math.PI*writeTime/.55):0;
  });
  cell.applyCatchFlex();
 });
 horns.forEach(horn=>{
  const active=phase==='write'&&(masks[index]&(1<<horn.userData.channel));
  const amount=active?writeTime<.55?writeTime/.55:writeTime<.8?1:Math.max(0,1-(writeTime-.8)/.5):0;
  horn.rotation.y=-horn.userData.sign*Math.asin((1.35+servoDesign.parameters.dotLift)/16)*amount;
 });}

function lock(){for(const id of ['run','next','return','position','resetDemo'])$(id).disabled=phase!=='idle'||panelOpen;$('trayPanel').disabled=phase!=='idle';}
function move(to,type){startX=x;targetX=to;phase=type;elapsed=0;lock();}
function write(){phase='write';writeTime=0;info('Cell '+(index+1)+': lifting '+(letters[index].trim()||'blank')+'; catches hold after horns retract.');lock();}
$('trayJoint').onclick=()=>{
 isolated=null;select.value='all';applyParts();
 controls.target.set(x+26,-(panelOpen?62:40),70);
 camera.position.set(x+85,-(panelOpen?140:115),112);controls.update();
};
$('trayPanel').onclick=()=>{
 if(phase!=='idle')return;panelOpen=!panelOpen;
 casingPanel.position.y=panelOpen?-45:0;
 $('trayPanel').textContent=panelOpen?'Close tray side':'Open tray side';
 $('trayPanel').setAttribute('aria-pressed',String(panelOpen));lock();
 info(panelOpen?'Loading access: finger-jointed front panel removed. Insert cells from the front.':'Front panel seated on its lower tongues and end finger joints. Friction retention is provisional.');
 isolated=null;select.value='all';applyParts();view('loading');
};
$('run').onclick=()=>{auto=true;index=0;if(x>-49||patterns.some(Boolean))move(-50,'prepare');else move(0,'advance');info('Writing eight cells, then returning past the reset flap.');};
$('next').onclick=()=>{auto=false;const current=Math.max(0,Math.round(x/50));index=x<0?0:Math.min(7,current+(patterns[current]?1:0));move(index*50,'advance');info('Moving cell '+(index+1)+' above the fixed servos.');};
$('return').onclick=()=>{auto=false;move(-50,'return');info('Return stroke: tabs meet the fixed flap and release each cell.');};
$('position').oninput=e=>{updatePosition(+e.target.value);renderPins();info('Manual tray motion; reverse travel releases cells at the red flap.');};
$('resetDemo').onclick=()=>{if(phase!=='idle')return;auto=false;patterns.fill(0);updatePosition(-50);patterns[0]=masks[0];viewReset();move(0,'demoForward');info('Demo forward: the rigid flap swings upward on its horizontal axle; the raised pins stay caught.');};
$('resetDetail').onclick=()=>viewReset();
function driveView(close=false){isolated=null;select.value='all';$('linkage').checked=true;applyParts();
 const target=close?jointHardware.position.clone():new THREE.Box3().setFromObject(mechanism).getCenter(new THREE.Vector3());
 const direction=new THREE.Vector3(.15,-1,1).normalize();
 const size=close?45:new THREE.Box3().setFromObject(mechanism).getSize(new THREE.Vector3()).length();
 const distance=size/(2*Math.tan(camera.fov*Math.PI/360))*1.2/Math.min(camera.aspect,1);
 controls.target.copy(target);camera.position.copy(target).addScaledVector(direction,distance);controls.update();}
$('driveDetail').onclick=()=>driveView();$('bearingDetail').onclick=()=>driveView(true);
$('cartDetail').onclick=()=>{isolated=null;select.value='all';applyParts();view('cart');};
$('railDetail').onclick=()=>{isolated=null;select.value='all';applyParts();view('rails');};
$('towDetail').onclick=()=>{isolated=null;select.value='all';$('linkage').checked=true;applyParts();controls.target.set(x+35,0,68);camera.position.copy(controls.target).add(new THREE.Vector3(100,-140,95).divideScalar(Math.min(camera.aspect,1)));controls.update();};
function viewReset(){isolated=null;select.value='all';applyParts();controls.target.set(-25,-48,75);camera.position.set(47,-144,139);controls.update();}
$('lid').onchange=e=>{lidMat.opacity=e.target.checked?.25:0;};$('linkage').onchange=e=>mechanism.visible=e.target.checked;
// Same single-cell shell, lowered 18 mm so its roof sits below the moving casing.
const {shell:cardboard,input:shellToggle,electronics,electronicsToggle}=mountShell(scene,document.querySelector('aside'),{lowerBy:18,servoHeight:railCellOffsetZ});
const partMeshes=[];
const categoryNames=new Map([[casing,'Casing'],[casingPanel,'Casing · removable side'],...wheelHolders.map(m=>[m,'Cart · printed removable axle holders']),...cartHardware.map(m=>[m,'Cart · wheel and axle placeholders']),...platformParts.map(m=>[m,'Raised platform · concept']),[resetAxle,'Bought hardware · nail pivot']]);
cells.forEach((cell,i)=>cell.g.traverse(o=>{if(o.isMesh)categoryNames.set(o,'Cell '+(i+1)+' · separate module');}));
servos.traverse(o=>{if(o.isMesh)categoryNames.set(o,o.userData.printed?'Shared single-cell docking base':'Shared single-cell servo bank');});
mechanism.traverse(o=>{if(o.isMesh)categoryNames.set(o,o.userData.concept?'Drive · mounting concepts':o.userData.printed?'Drive · two printed arms':'Drive · bought hardware');});
scene.traverse(o=>{if(o.isMesh)partMeshes.push(o);});
cardboard.traverse(o=>{if(o.isMesh)categoryNames.set(o,'Cardboard shell · concept');});
electronics.traverse(o=>{if(o.isMesh)categoryNames.set(o,'Electronics · bought hardware placeholders');});
const counters={};
for(const mesh of partMeshes){const category=categoryNames.get(mesh)||'Reset + mounts · concept';const type=mesh.material===yellow?'Catch element':mesh.material===metal?'Pin / hardware':mesh.material===red?'Release flap':mesh.material===blue?'Servo / connecting arm':mesh.material===lidMat?'Reading plate':mesh.material===orange?'Printed support':'Hardware / mount';counters[category+' '+type]=(counters[category+' '+type]||0)+1;if(!mesh.name)mesh.name=type+' '+counters[category+' '+type];mesh.userData.category=category;mesh.userData.shown=true;}
let isolated=null;
const select=$('partView');select.append(new Option('Assembly','all'));let lastCategory,folder;
partMeshes.forEach((mesh,i)=>{const category=mesh.userData.category;if(category!==lastCategory){folder=document.createElement('details');const heading=document.createElement('summary');heading.textContent=category;folder.append(heading);$('eightParts').append(folder);lastCategory=category;}const row=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=true;input.onchange=()=>{mesh.userData.shown=input.checked;applyParts();};row.append(input,document.createTextNode(mesh.name));folder.append(row);select.append(new Option(category+' / '+mesh.name,String(i)));});
function applyParts(){cardboard.visible=isolated?true:shellToggle.checked;electronics.visible=isolated?true:electronicsToggle.getAttribute('aria-pressed')==='true';partMeshes.forEach(mesh=>mesh.visible=isolated?mesh===isolated:mesh.userData.shown);mechanism.visible=isolated?true:$('linkage').checked;}
function view(type){const bounds=new THREE.Box3();const objects=isolated?[isolated]:type==='cart'?[casing,...wheelHolders,...cartHardware]:type==='rails'?[casing,...wheelHolders,...cartHardware,...platformParts]:type==='loading'?[casing,casingPanel,...cells.map(cell=>cell.g)]:type==='detail'?[servos,cells[index].g,...(electronics.visible?[electronics]:[])]:partMeshes.filter(m=>m.visible&&(!electronics.children.includes(m)||electronics.visible)&&(!m.userData.category.startsWith('Drive ·')||mechanism.visible));objects.forEach(o=>bounds.expandByObject(o));if(bounds.isEmpty())return;const target=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());const distance=Math.max(size.x,size.y,size.z,20)/(2*Math.tan(camera.fov*Math.PI/360))*(isolated?1.85:1.45)/Math.min(camera.aspect,1);const direction=type==='top'?new THREE.Vector3(0,.001,1):type==='side'?new THREE.Vector3(0,-1,.08):new THREE.Vector3(.65,-1,.8).normalize();controls.target.copy(target);camera.position.copy(target).add(direction.multiplyScalar(distance));controls.update();}
select.onchange=()=>{isolated=select.value==='all'?null:partMeshes[Number(select.value)];applyParts();view('iso');};
$('linkage').onchange=()=>applyParts();
for(const id of ['fit','top','side','iso','detail'])$(id).onclick=()=>view(id==='fit'?'iso':id);
shellToggle.onchange=()=>{applyParts();};
const toggleElectronics=electronicsToggle.onclick;electronicsToggle.onclick=()=>{toggleElectronics();applyParts();view('detail');};
const dimensions=createDimensions($('viewport'),camera,()=>isolated?[isolated]:[],()=>!!isolated);
function resize(){const el=$('viewport');camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight);}new ResizeObserver(resize).observe($('viewport'));updatePosition(0);view('cart');info('Cell 1 aligned over the shared single-cell station. All cells blank.');
function tick(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(['advance','return','prepare','demoForward','demoReturn'].includes(phase)){elapsed+=dt;const duration=phase.startsWith('demo')?4:Math.max(.6,Math.abs(targetX-startX)/85);const t=Math.min(1,elapsed/duration);updatePosition(THREE.MathUtils.lerp(startX,targetX,t*t*(3-2*t)));if(t===1){const done=phase;if(done==='demoForward'){move(-50,'demoReturn');info('Demo return: the hard stop holds the flap; its cam shifts the carrier and releases the pins.');}else if(done==='demoReturn'){phase='idle';lock();info('Reset demo complete. Gravity lowers the flap; carrier return leaves restore the catches. Motion is assumed.');}else if(done==='advance')write();else if(done==='prepare'){index=0;move(0,'advance');}else{phase='idle';lock();info('Home: all cells passed the release flap. Board reset.');}}}else if(phase==='write'){writeTime+=dt;if(writeTime>=.55)patterns[index]=masks[index];if(writeTime>=1.35){if(auto&&index<7){index++;move(index*50,'advance');info('Advancing to cell '+(index+1)+'.');}else if(auto){move(-50,'return');info('All eight cells written. Reverse stroke automatically resets them.');}else{phase='idle';lock();info('Cell '+(index+1)+' latched. Servos retracted.');}}}renderPins();controls.update();dimensions.update();renderer.render(scene,camera);requestAnimationFrame(tick);}requestAnimationFrame(tick);
window.eightCellState=()=>({position:x,phase,panelOpen,patterns:[...patterns],cell:index+1,capacity:8,occupied:8,shellNominal:[250,225,116],isolated:isolated?.name,parts:partMeshes.length,flapAngle:flapPivot.rotation.y,gravityReturn:design.reset.gravityReturn,drive:{stroke:drive.travelMax-drive.travelMin,crankRadius:R,rodLength:L,bearingWidth:drive.bearingWidth,boltGrip:drive.grip,armMeshesFromCAD:crank.userData.printed&&arm.userData.printed},release:cells.map(c=>c.release),resetPrintedParts:[resetBracket,flap,...cells[0].carrier.children].every(m=>m.userData.printed),resetPivotHardware:{printed:resetAxle.userData.printed,diameter:design.reset.pivotDiameter,length:design.reset.nailLength}});
