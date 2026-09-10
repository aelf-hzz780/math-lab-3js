const smooth = t => t*t*(3-2*t);
const fract = n => n-Math.floor(n);
function hash(x,y,seed) { return fract(Math.sin(x*127.1+y*311.7+seed*.173)*43758.5453123); }
function noise(x,y,seed) {
  const ix=Math.floor(x),iy=Math.floor(y),fx=smooth(fract(x)),fy=smooth(fract(y));
  const a=hash(ix,iy,seed),b=hash(ix+1,iy,seed),c=hash(ix,iy+1,seed),d=hash(ix+1,iy+1,seed);
  return (a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy;
}
/** Smooth first + second harmonics create different windward and slip-face slopes. */
export function duneHeight(x,z,time,params={},seed=42) {
  const {height=2,wind=25,speed=.18}=params;
  if (![x,z,time,height,wind,speed,seed].every(Number.isFinite) || height<0) throw new RangeError('Invalid dune parameters');
  if(height===0) return 0;
  const angle=wind*Math.PI/180,u=x*Math.cos(angle)+z*Math.sin(angle)-time*speed,v=-x*Math.sin(angle)+z*Math.cos(angle);
  const n=noise(u*.085,v*.085,seed),n2=noise(u*.19+17,v*.19-8,seed);
  const phase=.52*u+1.3*Math.sin(v*.15+seed*.031)+n*.9;
  return height*(.58*Math.sin(phase)+.24*Math.sin(2*phase+.7)+.36*n+.14*n2);
}
export function duneSample(x,z,time,params,seed) {
  const height=duneHeight(x,z,time,params,seed),e=.025;
  const dx=(duneHeight(x+e,z,time,params,seed)-duneHeight(x-e,z,time,params,seed))/(2*e);
  const dz=(duneHeight(x,z+e,time,params,seed)-duneHeight(x,z-e,time,params,seed))/(2*e);
  const length=Math.hypot(dx,1,dz);
  return {height,normal:[dx===0?0:-dx/length,1/length,dz===0?0:-dz/length]};
}
