// Optional bonded square-socket variant. Millimeters; fit/strength unvalidated.
import Module from 'manifold-3d';
import {makeArmParts,armJoint} from './arms-source.mjs';
import {makeEightCellParts} from './casing-source.mjs';
const wasm=await Module();wasm.setup();const M=wasm.Manifold;
export const splitParameters={clearance:.2,bed:256,margin:5,gap:3,armJoint};
const box=(size,center)=>M.cube(size,true).translate(center);
function masks(x,type,z=0){
 const c=splitParameters.clearance;
 let male=box([2000,2000,2000],[x-1000,0,0]);
 let female=box([2000,2000,2000],[x-1000+c,0,0]);
 if(type==='socket'){
  const {length:L,peg:s}=armJoint;
  male=M.union([male,box([L+1,s,s],[x+(L-1)/2,0,z])]);
  female=M.union([female,box([L+1+2*c,s+2*c,s+2*c],[x+(L-1)/2,0,z])]);
 }else for(const [height,thickness] of [[54.75,1.5],[62.5,5],[74.5,5]]){
  male=M.union([male,box([12,2000,thickness],[x,0,height])]);
  female=M.union([female,box([12+2*c,2000,thickness+2*c],[x,0,height])]);
 }
 return [male,female];
}
export function makeSplitParts(){
 const sources=[...makeArmParts(),...makeEightCellParts()].map(p=>({...p,g:new M(p.g.getMesh())}));
 const config=[['drive-long-arm',armJoint.longCuts,'socket',armJoint.longZ],['drive-short-arm',armJoint.shortCuts,'socket',armJoint.shortZ],['casing',[-255,-95],'finger'],['casing-panel',[-175],'finger']];
 const parts=[],checks=[];
 for(const [id,cuts,type,z] of config){
  const source=sources.find(p=>p.id===id);let remaining=source.g;const segments=[];
  for(const x of cuts){const [male,female]=masks(x,type,z);segments.push(remaining.intersect(male));remaining=remaining.subtract(female);}
  segments.push(remaining);
  const members=[];
  segments.forEach((segment,i)=>{const solids=segment.decompose().sort((a,b)=>a.boundingBox().min[1]-b.boundingBox().min[1]);solids.forEach((g,j)=>{
   const part={id:`${id}-split-${i+1}${solids.length>1?String.fromCharCode(97+j):''}`,source:id,section:i+1,joint:type,g};members.push(part);parts.push(part);
  });});
  checks.push({source:source.g,members,id,cuts,z,type});
 }
 for(const p of sources.filter(p=>p.id.startsWith('wheel-holder-')))parts.push({...p,source:'wheel-holder',section:p.id.includes('-1-')?1:3,joint:'bolt'});
 // Same 6 mm peg / 6.4 mm enclosed hole, 16 mm reach and 12 mm outer height.
 const sample=box([48,armJoint.bossWidth,armJoint.bossHeight],[0,0,0]);const [male,female]=masks(0,'socket',0);
 for(const [i,g] of [sample.intersect(male),sample.subtract(female)].entries())parts.push({id:`arm-fit-coupon-${i+1}`,source:'coupon',section:i+1,joint:'socket',g});
 return {parts,checks};
}
