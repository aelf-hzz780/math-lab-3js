export function fieldMod(x,p){return ((x%p)+p)%p;}
function validPrime(p){if(!Number.isInteger(p)||p<3||p>47||p%2===0)throw new RangeError('p must be an odd prime from 3 to 47');for(let i=3;i*i<=p;i+=2)if(p%i===0)throw new RangeError('p must be prime');}
function inverse(x,p){x=fieldMod(x,p);for(let i=1;i<p;i++)if(x*i%p===1)return i;throw new RangeError('No finite-field inverse');}
export function kakeyaSize(p){validPrime(p);return (2*p**3+7*p*p+(p%4===1?-1:3))/8;}
export function fieldLine(anchor,direction,p){validPrime(p);if(anchor?.length!==3||direction?.length!==3||![...anchor,...direction].every(Number.isInteger)||direction.every(v=>fieldMod(v,p)===0))throw new RangeError('Invalid finite-field line');return Array.from({length:p},(_,t)=>anchor.map((a,k)=>fieldMod(a+t*direction[k],p)));}
export function constructKakeya(p){
 validPrime(p);const Q=new Set(Array.from({length:p},(_,u)=>u*u%p)), body=new Map(),witnesses=[];
 for(let x=0;x<p;x++)for(let y=0;y<p;y++)if(Q.has((x*x+4*y)%p))for(let z=0;z<p;z++)if(Q.has((x*x+4*z)%p))body.set(`${x},${y},${z}`,{point:[x,y,z],boundary:false});
 for(let a=0;a<p;a++)for(let b=0;b<p;b++)witnesses.push({direction:[1,a,b],anchor:[0,a*a%p,b*b%p]});
 const border=[];
 for(let c=0;c<p;c++)border.push({direction:[0,1,c],anchor:[0,0,c===1?0:fieldMod(c*inverse(c-1,p),p)]});
 border.push({direction:[0,0,1],anchor:[0,0,0]});
 for(const witness of border)for(const point of fieldLine(witness.anchor,witness.direction,p)){const key=point.join(',');if(!body.has(key))body.set(key,{point,boundary:true});}
 witnesses.push(...border);const records=[...body.values()];
 return {points:records.map(r=>r.point),boundary:records.map(r=>r.boundary),witnesses};
}
