import fs from 'node:fs';import Module from 'manifold-3d';
const wasm=await Module();wasm.setup();const M=wasm.Manifold;
const box=(s,c)=>M.cube(s,true).translate(c),cyl=(r,h,c)=>M.cylinder(h,r,r,24,true).translate(c);
const union=(...p)=>M.union(p),sub=(p,...cuts)=>cuts.reduce((a,b)=>a.subtract(b),p);
const parts=[];
function add(name,group,g,level,color,description,channel=null,spring=false){const mesh=g.getMesh(),positions=[];for(const idx of mesh.triVerts){const i=idx*mesh.numProp;positions.push(...mesh.vertProperties.slice(i,i+3));}parts.push({name,group,positions,description,level,color,channel,spring});}
function addRaw(name,group,positions,level,color,description,channel){parts.push({name,group,positions,level,color,description,channel,spring:true});}
const grid=[];for(let y=0;y<2;y++)for(let x=0;x<3;x++)grid.push({x:(x-1)*8,y:(y-.5)*6.45,dx:(x-1)*2.45,dy:(y-.5)*2.45});
const mountHoles=(z,h)=>[-1,1].flatMap(x=>[-1,1].map(y=>cyl(.75,h,[x*15.8,y*10.8,z])));
let base=sub(box([40,35,1.5],[0,0,.75]),...[-1,1].flatMap(x=>[-1,1].map(y=>cyl(.8,4,[x*17.5,y*14.8,1]))));
// Low perimeter seating pads approximate the red holding structure in Figure 2.
base=union(base,...grid.map(p=>box([5.5,2,1.5],[p.x,p.y+(p.y>0?4:-4),2.25])));
add('Base and actuator seating','01 Printed structure',base,0,0xbc5550,'40 × 35 mm footprint. Plate thickness and seating pads approximated.');
let support=union(...[-1,1].flatMap(x=>[-1,1].map(y=>box([3.8,3.8,20.3],[x*15.8,y*10.8,11.65]))));
support=union(support,sub(box([35.4,25.4,1],[0,0,21.3]),box([27.8,17.8,3],[0,0,21.3])));support=sub(support,...mountHoles(12,25));add('Case support frame','01 Printed structure',support,1,0x8e9ca5,'Case height 23.8 mm overall. Pillar and mounting geometry approximated.');
let lid=sub(box([35.4,25.4,2],[0,0,22.8]),...mountHoles(22.8,4),...grid.map(p=>cyl(.8,4,[p.dx,p.dy,22.8])));
add('Reading lid','01 Printed structure',lid,4,0xc5cfd5,'35.4 × 25.4 mm, Fig. 2c. Thickness and hole diameters approximated.');
for(let i=0;i<6;i++){const p=grid[i];
 const body=sub(box([7.3,5.7,10.5],[p.x,p.y,6.75]),cyl(1,12,[p.x,p.y,6.75]));
 add('Solenoid '+(i+1),'02 Purchased actuators',body,0,0xc7bf50,'5.7 × 7.3 × 10.5 mm; 2 mm bore.',i);
}
for(let i=0;i<6;i++){const p=grid[i];
 const pin=union(cyl(.85,15,[p.x,p.y,13.1]),cyl(1.65,1.2,[p.x,p.y,18]));
 add('Plunger '+(i+1),'03 Plungers and springs',pin,2,0x87939c,'8.6 mm exposed assembly height, Fig. 2b. Shaft and collar sizes approximated.',i);
 // Low-poly helix: shape and wire diameter illustrative, stiffness is documented separately.
 const vertices=[],faces=[],turns=6,steps=72,sides=6,r=1.15,wire=.16,bottom=12,height=5.4;
 for(let t=0;t<=steps;t++){const a=t/steps*turns*2*Math.PI;for(let s=0;s<sides;s++){const b=s/sides*2*Math.PI;vertices.push([p.x+(r+wire*Math.cos(b))*Math.cos(a),p.y+(r+wire*Math.cos(b))*Math.sin(a),bottom+height*t/steps+wire*Math.sin(b)]);}}
 for(let t=0;t<steps;t++)for(let s=0;s<sides;s++){const a=t*sides+s,b=t*sides+(s+1)%sides,c=(t+1)*sides+s,d=(t+1)*sides+(s+1)%sides;faces.push([a,b,c],[b,d,c]);}
 const cap0=vertices.length;vertices.push([p.x+r,p.y,bottom]);const cap1=vertices.length;vertices.push([p.x+r,p.y,bottom+height]);for(let s=0;s<sides;s++){faces.push([cap0,(s+1)%sides,s],[cap1,steps*sides+s,steps*sides+(s+1)%sides]);}
 const positions=faces.flatMap(f=>f.flatMap(k=>vertices[k]));addRaw('Return spring '+(i+1),'03 Plungers and springs',positions,2,0x657581,'Spring stiffness 0.82 N/mm. Coil geometry approximated.',i);
}
for(let i=0;i<6;i++){const p=grid[i],vx=p.dx-p.x,vy=p.dy-p.y,l=Math.hypot(vx,vy),angle=Math.atan2(vy,vx)*180/Math.PI;
 const pad=sub(box([4.2,3.6,1.2],[p.x,p.y,21.2]),cyl(.86,2,[p.x,p.y,21.2]));
 const arm=box([l,1.25,1.2],[l/2,0,21.2]).rotate([0,0,angle]).translate([p.x,p.y,0]);
 const stem=cyl(.7,2.1,[p.dx,p.dy,22.85]);const cap=M.sphere(.7,16).translate([p.dx,p.dy,23.7]);
 add('Offset adapter and dot '+(i+1),'04 Offset adapters',union(pad,arm,stem,cap),3,0xe3a13b,'Dot pitch 2.45 mm; raised tip 0.6 mm above lid. Adapter shape and tip diameter approximated.',i);
}
const doc={title:'Readable — research reconstruction',paper:'documents/readable-author-postprint.pdf',source:'https://pubmed.ncbi.nlm.nih.gov/32012027/',note:'Measurement-based visual reconstruction. Unspecified fits, walls, shafts, springs and adapter profiles are approximated; not a print-ready replica.',measurements:[
 ['Case envelope','40 × 35 × 23.8 mm','p. 3, Sec. III; Fig. 2c'],['Lid footprint','35.4 × 25.4 mm','p. 2, Fig. 2c'],['Solenoid body','5.7 × 7.3 × 10.5 mm','p. 2, Sec. II; Fig. 2b'],['Solenoid bore','2 mm','p. 2, Sec. II'],['Actuator pitch','8 mm; second axis 6.45 mm','p. 3 text; p. 2, Fig. 2b'],['Exposed plunger assembly','8.6 mm','p. 2, Fig. 2b'],['Dot pitch','2.45 mm','p. 3, Sec. III; Fig. 2c'],['Raised dot height','0.6 mm','p. 3, Sec. II-A'],['Spring stiffness','0.82 N/mm','p. 3, Sec. III'],['Pin mass','0.42 g','p. 3, Sec. III'],['Actuation','4.30 V; 240 mA','p. 3, Sec. II-A'],['Refresh characterization','up to 4 Hz','p. 3, Sec. III']
]};
const design={id:'readable-paper-2020-v1',name:doc.title,date:new Date().toISOString(),customMode:true,mode:'readable',parts,document:doc,view:'assembly',angle:'90',explode:'0',wire:false,visible:parts.map(()=>true),selected:2,camera:[65,-85,65],target:[0,0,12],dots:[true,true,true,true,true,true]};
fs.writeFileSync(new URL('../web/models/readable-design.json',import.meta.url),JSON.stringify(design));console.log(parts.length,'parts',Math.round(JSON.stringify(design).length/1024),'KB');
