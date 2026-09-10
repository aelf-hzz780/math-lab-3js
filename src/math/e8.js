import {seededRandom} from '../core/resources.js';
const dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0);
function validateRoots(roots){if(!Array.isArray(roots)||roots.length<1||roots.length>240||roots.some(r=>!Array.isArray(r)||r.length!==8||r.some(x=>!Number.isFinite(x)||Math.abs(x)>2)))throw new RangeError('Expected at most 240 finite eight-dimensional roots');}
/** Dyadic coordinates are represented exactly by binary floating-point numbers. */
export function e8Roots(){
 const roots=[];
 for(let i=0;i<8;i++)for(let j=i+1;j<8;j++)for(const a of [-1,1])for(const b of [-1,1]){const r=Array(8).fill(0);r[i]=a;r[j]=b;roots.push(r);}
 for(let mask=0;mask<256;mask++){const r=Array.from({length:8},(_,i)=>mask&(1<<i)?-.5:.5);if(r.filter(x=>x<0).length%2===0)roots.push(r);}
 return roots;
}
/** One bounded O(240²) construction; the animation only projects cached edges. */
export function e8Contacts(roots=e8Roots()){
 validateRoots(roots);const edges=[];
 for(let i=0;i<roots.length;i++){if(dot(roots[i],roots[i])!==2)throw new RangeError('E8 roots must have squared norm 2');for(let j=i+1;j<roots.length;j++)if(dot(roots[i],roots[j])===1)edges.push([i,j]);}
 return edges;
}
export function projectionBasis8(seed=42){
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new RangeError('Seed must be an unsigned 32-bit integer');
 const random=seededRandom(seed),basis=[];
 for(let i=0;i<3;i++){const row=Array.from({length:8},()=>random()*2-1);for(const u of basis){const d=dot(row,u);for(let k=0;k<8;k++)row[k]-=d*u[k];}const norm=Math.hypot(...row);if(norm<1e-12)throw new RangeError('Degenerate projection basis');basis.push(row.map(x=>x/norm));}
 return basis;
}
export function projectRoots8(roots,basis,angle=0,plane=[0,3]){
 validateRoots(roots);
 if(!Array.isArray(basis)||basis.length!==3||basis.some(r=>!Array.isArray(r)||r.length!==8||r.some(x=>!Number.isFinite(x)))||!Number.isFinite(angle)||!Array.isArray(plane)||plane.length!==2||plane.some(k=>!Number.isInteger(k)||k<0||k>7)||plane[0]===plane[1])throw new RangeError('Invalid eight-dimensional projection');
 for(let i=0;i<3;i++)for(let j=0;j<3;j++)if(Math.abs(dot(basis[i],basis[j])-(i===j?1:0))>1e-9)throw new RangeError('Projection rows must be orthonormal');
 const output=new Float64Array(roots.length*3),[a,b]=plane,c=Math.cos(angle),s=Math.sin(angle);
 for(let i=0;i<roots.length;i++){const row=roots[i];for(let axis=0;axis<3;axis++){let sum=0;for(let k=0;k<8;k++)sum+=basis[axis][k]*(k===a?c*row[a]-s*row[b]:k===b?s*row[a]+c*row[b]:row[k]);output[i*3+axis]=sum;}}
 return output;
}
