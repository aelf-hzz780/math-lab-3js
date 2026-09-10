import {seededRandom} from '../core/resources.js';
function validate(configuration){if(configuration?.length!==604||configuration.some(row=>row?.length!==11||row.some(pair=>pair?.length!==2||pair.some(n=>!Number.isInteger(n)||Math.abs(n)>100))))throw new RangeError('Expected 604 x 11 exact integer coefficient pairs');}
// Integer arithmetic up to the pairwise products is bounded by input validation.
// BigInt comparison then determines the sign in Q(sqrt(2)), without rounding.
function signQuadratic(a,b){if(a===0)return Math.sign(b);if(b===0)return Math.sign(a);if(Math.sign(a)===Math.sign(b))return Math.sign(a);const delta=BigInt(a)**2n-2n*BigInt(b)**2n;return a>0?(delta>0n?1:-1):(delta>0n?-1:1);}
function innerPair(x,y){let a=0,b=0;for(let k=0;k<11;k++){a+=x[k][0]*y[k][0]+2*x[k][1]*y[k][1];b+=x[k][0]*y[k][1]+x[k][1]*y[k][0];}return[a,b];}
export function auditKissing(configuration){
 validate(configuration);const keys=new Set(configuration.map(r=>JSON.stringify(r)));if(keys.size!==604)throw new RangeError('Duplicate kissing vectors');const contacts=[];let antipodalPairs=0;
 for(let i=0;i<604;i++){const[n,m]=innerPair(configuration[i],configuration[i]);if(n!==144||m!==0)throw new RangeError('Kissing vector norm is not exactly 2');
  for(let j=i+1;j<604;j++){const[a,b]=innerPair(configuration[i],configuration[j]);if(signQuadratic(a-72,b)>0)throw new RangeError('Kissing inequality violated');if(a===72&&b===0)contacts.push([i,j]);if(a===-144&&b===0)antipodalPairs++;}
 }return{points:604,contacts,antipodalPairs};
}
export function projectionBasis(seed=42){const random=seededRandom(seed),basis=[];for(let col=0;col<3;col++){const v=Array.from({length:11},()=>random()*2-1);for(const u of basis){const dot=v.reduce((s,x,k)=>s+x*u[k],0);for(let k=0;k<11;k++)v[k]-=dot*u[k];}const norm=Math.hypot(...v);basis.push(v.map(x=>x/norm));}return basis;}
export function projectConfiguration(configuration,basis,angle=0){
 if(basis?.length!==3||!basis.every(row=>row.length===11&&row.every(Number.isFinite))||!Number.isFinite(angle))throw new RangeError('Invalid projection');
 const output=new Float32Array(configuration.length*3),c=Math.cos(angle),s=Math.sin(angle);
 for(let i=0;i<configuration.length;i++){const row=configuration[i];for(let j=0;j<3;j++){let sum=0;for(let k=0;k<11;k++){let x=(row[k][0]+row[k][1]*Math.SQRT2)/6;if(k===0)x=c*x-s*(row[3][0]+row[3][1]*Math.SQRT2)/6;else if(k===3)x=s*(row[0][0]+row[0][1]*Math.SQRT2)/6+c*x;sum+=x*basis[j][k];}output[i*3+j]=sum;}}
 return output;
}
