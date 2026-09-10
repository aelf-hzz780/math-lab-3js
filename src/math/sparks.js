export function particleAt(position,velocity,time,{drag=0,gravity=9.8}={}){
  if(!Array.isArray(position)||!Array.isArray(velocity)||position.length!==3||velocity.length!==3||!position.every(Number.isFinite)||!velocity.every(Number.isFinite))throw new TypeError('position and velocity must contain three finite numbers');
  if(!Number.isFinite(time)||time<0||!Number.isFinite(drag)||drag<0||!Number.isFinite(gravity)||gravity<0)throw new RangeError('time, drag and gravity must be finite and nonnegative');
  const g=[0,-gravity,0];if(drag<1e-8)return {position:position.map((p,i)=>p+velocity[i]*time+.5*g[i]*time*time),velocity:velocity.map((v,i)=>v+g[i]*time)};
  const decay=Math.exp(-drag*time),integral=-Math.expm1(-drag*time)/drag;
  return {position:position.map((p,i)=>p+velocity[i]*integral+g[i]*(time-integral)/drag),velocity:velocity.map((v,i)=>v*decay+g[i]*integral)};
}
export function particleCycle(time,lifetime,phase=0){
  if(!Number.isFinite(time)||time<0||!Number.isFinite(lifetime)||lifetime<=0||!Number.isFinite(phase)||phase<0||phase>=1)throw new RangeError('cycle requires nonnegative time, positive lifetime and phase in [0,1)');
  const elapsed=time+phase*lifetime,cycle=Math.floor(elapsed/lifetime);return {age:elapsed-cycle*lifetime,cycle};
}
export function emissionState(index,time,{rate,capacity,lifetime}){
  if(!Number.isInteger(capacity)||capacity<1||!Number.isInteger(index)||index<0||index>=capacity||!Number.isFinite(time)||time<0||!Number.isFinite(rate)||rate<=0||!Number.isFinite(lifetime)||lifetime<=0)throw new RangeError('emission needs bounded index, positive rate, capacity and lifetime');
  const elapsed=time-index/rate;if(elapsed<0)return {active:false,age:0};const period=capacity/rate,age=elapsed-Math.floor(elapsed/period)*period;return {active:age<lifetime,age};
}
