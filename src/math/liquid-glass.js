const finite=(value,label)=>{if(!Number.isFinite(value))throw new RangeError(`${label} must be finite`);return value;};
const vector=(value,label)=>{if(!Array.isArray(value)||value.length!==3||!value.every(Number.isFinite))throw new RangeError(`Invalid ${label}`);return value;};

/** Exact critically damped spring for a target held constant during this step. */
export function springStep(state,target,dt,frequency) {
  if(!state||!Number.isFinite(state.position)||!Number.isFinite(state.velocity))throw new RangeError('Invalid spring state');
  finite(target,'target');finite(dt,'dt');finite(frequency,'frequency');
  if(dt<0||frequency<=0)throw new RangeError('Invalid spring step');
  const offset=state.position-target,c=state.velocity+frequency*offset,e=Math.exp(-frequency*dt);
  return {position:target+(offset+c*dt)*e,velocity:(state.velocity-frequency*c*dt)*e};
}

export function smoothMinimum(a,b,k) {
  finite(a,'a');finite(b,'b');finite(k,'blend width');if(k<=0)throw new RangeError('Blend width must be positive');
  const h=Math.max(k-Math.abs(a-b),0)/k;
  return Math.min(a,b)-h*h*k*.25;
}

function rotateXY(p,a){const c=Math.cos(a),s=Math.sin(a);return [c*p[0]-s*p[1],s*p[0]+c*p[1],p[2]];}
function rotateYZ(p,a){const c=Math.cos(a),s=Math.sin(a);return [p[0],c*p[1]-s*p[2],s*p[1]+c*p[2]];}
function ring(p,radius,width,time) {
  const a=Math.atan2(p[1],p[0]);
  return Math.hypot(Math.hypot(p[0],p[1])-radius-.13*Math.sin(2*a+time),p[2]-.18*Math.sin(3*a-time*.6))-(width+.09*Math.sin(3*a+time*.7));
}

/** Conservative distance-like field, not an exact signed-distance function after warping. */
export function liquidDistance(point,{time=0,shape=0,seed=42,pull=[0,0,0],anchor=[0,0,0]}={}) {
  vector(point,'point');vector(pull,'pull');vector(anchor,'anchor');finite(time,'time');
  if(!Number.isInteger(shape)||shape<0||shape>2||!Number.isInteger(seed)||seed<0||seed>4294967295)throw new RangeError('Invalid liquid shape or seed');
  const t=time+((seed%997)/997-.5)*.7;
  const influence=Math.exp(-point.reduce((sum,value,i)=>sum+(value-anchor[i])**2,0)*.28);
  let p=point.map((value,i)=>value-pull[i]*influence);
  p=rotateXY(p,.11*Math.sin(t*.37));
  const q=rotateYZ(rotateXY([p[0]+.5,p[1]-.38,p[2]],-.24),.44+.12*Math.sin(t*.4));
  q[1]/=1.1;
  let d=ring(q,1.52,shape===1?.33:.46,t);
  const r=rotateYZ(rotateXY([p[0]-.7,p[1]+.92,p[2]+.1],.68),1.05+.17*Math.sin(t*.33));
  d=smoothMinimum(d,ring(r,1.1,shape===1?.34:.48,-t*.8),.54);
  const blob=[p[0]-.75-.18*Math.sin(t*.7),p[1]-1.16,p[2]+.36];
  d=smoothMinimum(d,Math.hypot(...blob)-(.72+.08*Math.sin(t*.6)),.62);
  const bottom=[p[0]+.12,p[1]+1.85,p[2]-.25];
  d=smoothMinimum(d,Math.hypot(bottom[0]/1.34,bottom[1],bottom[2])-.62,.48);
  for(let i=0;i<4;i++) {
    const a=i*2.4+.35*t,radius=shape===2?.25:.13;
    const center=[2.85*Math.cos(a),2.2*Math.sin(a)+.2*Math.sin(t+i),.6*Math.sin(a*1.8)];
    d=Math.min(d,Math.hypot(...p.map((value,j)=>value-center[j]))-radius);
  }
  return d;
}

/** Snell transmission. Null denotes total internal reflection. Both vectors must be unit length. */
export function refractDirection(incident,normal,eta) {
  vector(incident,'incident ray');vector(normal,'normal');finite(eta,'relative IOR');
  if(eta<=0||Math.abs(Math.hypot(...incident)-1)>1e-6||Math.abs(Math.hypot(...normal)-1)>1e-6)throw new RangeError('Refraction needs unit vectors and positive relative IOR');
  const cosine=incident.reduce((sum,value,i)=>sum+value*normal[i],0),k=1-eta*eta*(1-cosine*cosine);
  if(k<0)return null;
  return incident.map((value,i)=>eta*value-(eta*cosine+Math.sqrt(k))*normal[i]);
}
