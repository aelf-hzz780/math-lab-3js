import {seededRandom} from '../core/resources.js';

export function resolveParticleCount(requested,quality='high'){
  if(!Number.isFinite(requested)||requested<60000||requested>2000000)throw new RangeError('Invalid particle count');
  if(quality!=='high'&&quality!=='low')throw new RangeError('Invalid particle quality');
  return Math.min(Math.round(requested),quality==='low'?120000:2000000);
}
export function createParticleSeeds(count,seed=42){
  if(!Number.isInteger(count)||count<1||count>2000000)throw new RangeError('Invalid particle seed count');
  if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw new RangeError('Invalid particle seed');
  const random=seededRandom(seed),values=new Float32Array(count*4);
  for(let i=0;i<values.length;i++)values[i]=Math.min(random(),.99999994);
  return values;
}
export function compositionWeights(phase){
  if(!Number.isFinite(phase))throw new RangeError('Invalid composition phase');
  const wrapped=((phase%3)+3)%3,index=Math.floor(wrapped),t=wrapped-index;
  const fade=t*t*t*(t*(t*6-15)+10),weights=[0,0,0];weights[index]=1-fade;weights[(index+1)%3]=fade;return weights;
}
export function curlField(position,time=0){
  if(!position||position.length!==3||![...position,time].every(Number.isFinite))throw new RangeError('Invalid curl field coordinate');
  const [x,y,z]=position;
  return [Math.sin(x+.4*time)*Math.cos(y)-Math.cos(z-.5*time)*Math.sin(x),Math.sin(y+.7*time)*Math.cos(z)-Math.cos(x+.4*time)*Math.sin(y),Math.sin(z-.5*time)*Math.cos(x)-Math.cos(y+.7*time)*Math.sin(z)];
}
export function particleTarget(seed,shape){
  if(!seed||seed.length!==4||![...seed].every(v=>Number.isFinite(v)&&v>=0&&v<1)||![0,1,2].includes(shape))throw new RangeError('Invalid particle target');
  const [u,v,w,k]=seed,theta=u*Math.PI*2,r=.12+1.02*Math.sqrt(v);
  if(shape===0){
    const lobe=Math.floor(k*5),centers=[[-.82,1.2,.04],[.63,1.55,.02],[.7,-1.5,.12],[-.75,-1.25,-.04],[0,.05,-.4]],c=centers[lobe];
    const a=theta+lobe*.8,polar=Math.acos(2*v-1),s=Math.sin(polar);
    const radius=(.43+.64*Math.cbrt(w))*(1+.16*Math.sin(3*a+polar)*s+.10*Math.cos(5*a-2*polar)*s*s);
    return [c[0]+Math.cos(a)*s*radius*1.04,c[1]+Math.cos(polar)*radius*1.08,c[2]+Math.sin(a)*s*radius*.83+.12*Math.sin(3*polar+2*a)*s];
  }
  if(shape===1){
    const a=u*Math.PI*6,y=(u-.5)*5.3,tube=.3+.48*Math.sqrt(v),b=k*Math.PI*2;
    return [Math.sin(a)*(.58+.28*Math.cos(y))+Math.cos(b)*tube,y+.28*Math.sin(b),Math.cos(a)*.65+Math.sin(b)*tube+(w-.5)*.12];
  }
  const a=u*Math.PI*2,rad=.6+1.55*Math.sqrt(v),wave=.4*Math.sin(3*a+rad*2);
  return [Math.cos(a)*rad*.83,Math.sin(a)*rad*1.35,.6*Math.sin(2*a+rad*2)+wave+(w-.5)*.18];
}
