export const K4_EDGES=Object.freeze([[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]].map(Object.freeze));
function validateMask(mask){if(!Number.isInteger(mask)||mask<0||mask>63)throw new RangeError('K4 selection mask must be an integer from 0 to 63');}
function validateWeights(weights,positive=false){if(!Array.isArray(weights)||weights.length!==6||weights.some(x=>!Number.isFinite(x)||(positive?x<=0:x<0)||x>1e20))throw new RangeError('Expected six bounded nonnegative edge weights');}
export function matroidState(mask){
 validateMask(mask);const parent=[0,1,2,3];let rank=0,size=0;
 const find=i=>{while(parent[i]!==i)i=parent[i];return i;};
 K4_EDGES.forEach(([a,b],i)=>{if(!(mask&(1<<i)))return;size++;const ra=find(a),rb=find(b);if(ra!==rb){parent[ra]=rb;rank++;}});
 return{rank,size,independent:rank===size,basis:rank===3&&size===3,components:4-rank};
}
const BASES=[];
for(let mask=0;mask<64;mask++)if(matroidState(mask).basis)BASES.push(Object.freeze(K4_EDGES.map((_,i)=>i).filter(i=>mask&(1<<i))));
export function matroidBases(){return BASES.map(b=>[...b]);}
export function basisPolynomial(weights){validateWeights(weights);return BASES.reduce((sum,b)=>sum+b.reduce((v,i)=>v*weights[i],1),0);}
export function basisJet(weights){
 validateWeights(weights);const gradient=Array(6).fill(0),hessian=Array.from({length:6},()=>Array(6).fill(0));let value=0;
 for(const b of BASES){value+=b.reduce((p,i)=>p*weights[i],1);for(const i of b){gradient[i]+=b.filter(j=>j!==i).reduce((p,j)=>p*weights[j],1);for(const j of b)if(j!==i)hessian[i][j]+=weights[b.find(k=>k!==i&&k!==j)];}}
 return{value,gradient,hessian};
}
/** Surface axes are w0=x and w1=y; the other four positive weights equal z. */
export function logSlice(x,y,z=1){
 const weights=[x,y,z,z,z,z];validateWeights(weights,true);const jet=basisJet(weights),value=Math.log(jet.value),gradient=jet.gradient.slice(0,2).map(g=>g/jet.value),hessian=Array.from({length:2},(_,i)=>Array.from({length:2},(_,j)=>jet.hessian[i][j]/jet.value-gradient[i]*gradient[j]));
 const trace=hessian[0][0]+hessian[1][1],discriminant=Math.hypot(hessian[0][0]-hessian[1][1],2*hessian[0][1]);
 return{value,polynomial:jet.value,gradient,hessian,eigenvalues:[(trace+discriminant)/2,(trace-discriminant)/2]};
}
export function derivativeHessian(edge){
 if(!Number.isInteger(edge)||edge<0||edge>5)throw new RangeError('Derivative edge must be 0 through 5');
 const hessian=Array.from({length:6},()=>Array(6).fill(0));for(const b of BASES)if(b.includes(edge)){const[i,j]=b.filter(k=>k!==edge);hessian[i][j]++;hessian[j][i]++;}return hessian;
}
/** Jacobi rotations for small real symmetric matrices, used only on user interaction. */
export function symmetricEigenvalues(matrix){
 if(!Array.isArray(matrix)||matrix.length<1||matrix.length>8||matrix.some(r=>!Array.isArray(r)||r.length!==matrix.length||r.some(x=>!Number.isFinite(x))))throw new RangeError('Expected a finite symmetric matrix of size 1–8');
 const a=matrix.map(r=>[...r]),n=a.length;for(let i=0;i<n;i++)for(let j=0;j<n;j++)if(Math.abs(a[i][j]-a[j][i])>1e-10)throw new RangeError('Matrix must be symmetric');
 for(let iteration=0;iteration<128;iteration++){let p=0,q=0,largest=0;for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(Math.abs(a[i][j])>largest){largest=Math.abs(a[i][j]);p=i;q=j;}if(largest<1e-13)break;const angle=.5*Math.atan2(2*a[p][q],a[q][q]-a[p][p]),c=Math.cos(angle),s=Math.sin(angle),app=a[p][p],aqq=a[q][q],apq=a[p][q];for(let k=0;k<n;k++)if(k!==p&&k!==q){const akp=a[k][p],akq=a[k][q];a[k][p]=a[p][k]=c*akp-s*akq;a[k][q]=a[q][k]=s*akp+c*akq;}a[p][p]=c*c*app-2*s*c*apq+s*s*aqq;a[q][q]=s*s*app+2*s*c*apq+c*c*aqq;a[p][q]=a[q][p]=0;}
 return a.map((r,i)=>Math.abs(r[i])<1e-12?0:r[i]).sort((x,y)=>y-x);
}
