import * as THREE from './vendor/three.module.js';
// Live world-space mesh bounds, projected beside the isolated component.
export function createDimensions(viewport,camera,objects,active){
 const toggle=document.createElement('label');toggle.innerHTML='<input type="checkbox" checked> Dimensions (mm)';viewport.querySelector('.toolbar').append(toggle);
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('dimensionRulers');viewport.append(svg);
 const lines=[0,1,2].map(()=>{const group=document.createElementNS(svg.namespaceURI,'g');const line=document.createElementNS(svg.namespaceURI,'path'),label=document.createElementNS(svg.namespaceURI,'text');group.append(line,label);svg.append(group);return {line,label};});
 const project=p=>{const v=p.clone().project(camera);return [(v.x+1)*viewport.clientWidth/2,(1-v.y)*viewport.clientHeight/2];};
 function update(){svg.style.display=toggle.querySelector('input').checked&&active()?'block':'none';if(svg.style.display==='none')return;
 const targets=objects(),single=targets.length===1&&targets[0].isMesh?targets[0]:null;const bounds=new THREE.Box3();for(const object of targets){object.updateWorldMatrix(true,true);bounds.expandByObject(object,true);}if(bounds.isEmpty()){svg.style.display='none';return;}
 if(single){single.geometry.computeBoundingBox();bounds.copy(single.geometry.boundingBox);}
 const {min,max}=bounds,size=bounds.getSize(new THREE.Vector3()),gap=Math.max(size.x,size.y,size.z)*.09+2;
 const endpoints=[[new THREE.Vector3(min.x,min.y-gap,min.z),new THREE.Vector3(max.x,min.y-gap,min.z)],[new THREE.Vector3(max.x+gap,min.y,min.z),new THREE.Vector3(max.x+gap,max.y,min.z)],[new THREE.Vector3(max.x+gap,max.y+gap,min.z),new THREE.Vector3(max.x+gap,max.y+gap,max.z)]];
 endpoints.forEach(([a,b],i)=>{if(single){a.applyMatrix4(single.matrixWorld);b.applyMatrix4(single.matrixWorld);}const [x1,y1]=project(a),[x2,y2]=project(b),length=Math.hypot(x2-x1,y2-y1),dx=length?(y2-y1)/length*5:5,dy=length?-(x2-x1)/length*5:0;lines[i].line.setAttribute('d',`M${x1},${y1} L${x2},${y2} M${x1-dx},${y1-dy} L${x1+dx},${y1+dy} M${x2-dx},${y2-dy} L${x2+dx},${y2+dy}`);lines[i].label.setAttribute('x',Math.max(12,Math.min(viewport.clientWidth-95,(x1+x2)/2+8)));lines[i].label.setAttribute('y',Math.max(22,Math.min(viewport.clientHeight-20,(y1+y2)/2-8)));lines[i].label.textContent=`${'XYZ'[i]} ${Number(size.getComponent(i).toFixed(3))} mm`;});
 }
 return {update};
}
