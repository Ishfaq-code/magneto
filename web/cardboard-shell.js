// Shared single-cell cardboard enclosure. Millimeters; visual concept only.
import * as THREE from './vendor/three.module.js';
const card=new THREE.MeshStandardMaterial({color:'#ba925f',roughness:.8});
const tape=new THREE.MeshStandardMaterial({color:'#272725',roughness:.8});
function box(g,size,pos,m){const o=new THREE.Mesh(new THREE.BoxGeometry(...size),m);o.position.set(...pos);g.add(o);return o;}
export const singleCellShell={bounds:[-135,115,-70,155],bottom:-50,top:66,opening:[0,0,38,60]};
export function createCardboardShell({bounds,bottom,top,opening}=singleCellShell){const [x0,x1,y0,y1]=bounds,[ox,oy,ow,oh]=opening,g=new THREE.Group();g.name='Cardboard shell with recessed reading opening';const t=3,w=x1-x0,h=y1-y0,cx=(x0+x1)/2,cy=(y0+y1)/2;
 box(g,[w,h,t],[cx,cy,bottom],card);for(const x of [x0,x1])box(g,[t,h,top-bottom],[x,cy,(top+bottom)/2],card);for(const y of [y0,y1])box(g,[w,t,top-bottom],[cx,y,(top+bottom)/2],card);
 // Four roof panels leave the original single-cell aperture; clearance is provisional.
 const left=ox-ow/2,right=ox+ow/2,front=oy-oh/2,back=oy+oh/2;
 box(g,[left-x0,h,t],[(x0+left)/2,cy,top],card);box(g,[x1-right,h,t],[(right+x1)/2,cy,top],card);box(g,[ow,front-y0,t],[ox,(front+y0)/2,top],card);box(g,[ow,y1-back,t],[ox,(back+y1)/2,top],card);
 for(const y of [front-5,back+5])box(g,[ow+20,10,.5],[ox,y,top+1.8],tape);for(const x of [left-5,right+5])box(g,[10,oh,.5],[x,oy,top+1.8],tape);for(const y of [y0+8,y1-8])box(g,[w,16,.5],[cx,y,top+1.8],tape);return g;}

// Bought hardware placeholders only. Dimensions and wire paths are visual estimates.
export function createElectronics({wireTop=5}={}){
 const group=new THREE.Group();group.name='Electronics · visual placeholders';
 const pcb=new THREE.MeshStandardMaterial({color:0x287b56,roughness:.7});
 const arduino=new THREE.MeshStandardMaterial({color:0x248ca6,roughness:.7});
 const black=new THREE.MeshStandardMaterial({color:0x282d33,roughness:.65});
 const silver=new THREE.MeshStandardMaterial({color:0xa9b3be,metalness:.65,roughness:.4});
 const gold=new THREE.MeshStandardMaterial({color:0xd3b065,metalness:.5,roughness:.5});
 const part=(name,size,pos,material)=>{const mesh=box(group,size,pos,material);mesh.name=name+' (visual estimate)';mesh.userData.printed=false;return mesh;};
 part('Jetson Nano board',[100,80,1.6],[-55,82,-39],pcb);
 part('Jetson Nano heatsink',[46,46,4],[-55,82,-35],black);
 for(let i=0;i<9;i++)part('Jetson heatsink fin '+(i+1),[2,46,12],[-73+i*4.5,82,-27],black);
 part('Jetson USB ports',[15,30,14],[-99,78,-31],silver);
 part('Jetson network port',[16,18,14],[-99,108,-31],silver);
 part('Jetson GPIO header',[5,51,8],[-10,82,-34],black);
 part('Arduino board',[68,53,1.6],[57,85,-39],arduino);
 part('Arduino controller chip',[28,9,4],[57,85,-35],black);
 part('Arduino USB port',[14,12,10],[28,97,-33],silver);
 part('Arduino header',[48,4,7],[59,63,-34],black);
 part('Arduino header',[48,4,7],[59,107,-34],black);
 part('Power supply placeholder',[50,30,18],[57,10,-31],silver);
 part('Power terminals',[28,7,7],[57,-8,-32],gold);
 part('Servo distribution board',[44,24,1.6],[-55,0,-39],pcb);
 part('Servo distribution headers',[36,5,7],[-55,0,-34],gold);
 const wire=(name,points,color)=>{
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,24,.65,6,false),new THREE.MeshStandardMaterial({color,roughness:.65}));
  mesh.name=name+' (routing illustration)';mesh.userData.printed=false;group.add(mesh);
 };
 for(const mesh of group.children){if(mesh.name.startsWith('Jetson')){mesh.position.x-=20;mesh.position.y-=94;}}
 wire('Jetson to Arduino',[[-28,-12,-33],[-8,28,-24],[15,65,-24],[27,85,-34]],0x455cce);
 wire('Controller to servo distribution',[[45,64,-34],[10,45,-22],[-30,30,-23],[-54,5,-34]],0xe8bc48);
 wire('Power routing',[[42,-8,-32],[5,-25,-26],[-35,-22,-28],[-55,-8,-34]],0xc5413e);
 for(let i=0;i<6;i++){
  const x=i<3?-35:35,y=(i%3-1)*20;
  wire('Servo lead '+(i+1),[[-70+i*6,0,-33],[x,-30,-16],[x,y,wireTop]],i%2?0xd29c35:0xa14a35);
 }
 return group;
}

export function mountShell(scene,parent,{lowerBy=0,servoHeight=0}={}){
 const shell=createCardboardShell();shell.position.z=-lowerBy;shell.visible=false;scene.add(shell);
 shell.children.forEach((mesh,i)=>mesh.name='Cardboard shell panel / tape '+(i+1)+' (concept)');
 const electronics=createElectronics({wireTop:5+servoHeight+lowerBy});electronics.position.z=-lowerBy;scene.add(electronics);
 const section=document.createElement('section');section.innerHTML='<h2>Single-cell cardboard shell</h2><p>Same enclosure in both views: nominal 250 × 225 × 116 mm, with 3 mm cardboard. The 8-cell cart and platform extend beyond it. Dimensions and mounting are provisional.</p>';
 const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=false;input.onchange=()=>shell.visible=input.checked;label.append(input,document.createTextNode(' Cardboard shell'));section.append(label);
 const electronicsToggle=document.createElement('button');electronicsToggle.type='button';electronicsToggle.textContent='Electronics + wires';electronicsToggle.setAttribute('aria-pressed','true');electronicsToggle.style.marginTop='8px';electronicsToggle.style.background='#dce8ed';
 electronicsToggle.onclick=()=>{const visible=electronicsToggle.getAttribute('aria-pressed')!=='true';electronicsToggle.setAttribute('aria-pressed',String(visible));electronics.visible=visible;electronicsToggle.style.background=visible?'#dce8ed':'#fff';};
 section.append(electronicsToggle);const note=document.createElement('p');note.textContent='Jetson Nano, Arduino, power supply and servo distribution placeholders. Approximate sizes; wires illustrate routing, not electrical connections.';section.append(note);parent.prepend(section);
 return {shell,input,electronics,electronicsToggle};
}
