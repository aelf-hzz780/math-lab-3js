export const GRAVITY = 9.81;
export const WAVES = [
  { amplitude: .48, k: .65, direction: .3, phase: 0 },
  { amplitude: .25, k: 1.1, direction: -.75, phase: 1.5 },
  { amplitude: .15, k: 1.85, direction: 1.15, phase: 3.1 },
  { amplitude: .08, k: 3.2, direction: -.3, phase: .7 },
  { amplitude: .04, k: 5.5, direction: 2.5, phase: 2.4 },
];
export function dispersion(k, gravity = GRAVITY) {
  if (!Number.isFinite(k) || k < 0 || !Number.isFinite(gravity) || gravity <= 0) throw new RangeError('Wave number and gravity must be valid');
  return Math.sqrt(gravity*k);
}
export function waveSample(x,z,time,amplitude=.6) {
  if (![x,z,time,amplitude].every(Number.isFinite) || amplitude < 0) throw new RangeError('Invalid wave parameters');
  let height=0,dx=0,dz=0;
  for(const wave of WAVES) {
    const cx=Math.cos(wave.direction),cz=Math.sin(wave.direction);
    const phase=wave.k*(cx*x+cz*z)-dispersion(wave.k)*time+wave.phase;
    const a=amplitude*wave.amplitude;
    height+=a*Math.cos(phase); dx-=a*wave.k*cx*Math.sin(phase); dz-=a*wave.k*cz*Math.sin(phase);
  }
  return {height,dx,dz};
}
export function makeBody(x=0,z=0) {
  return {x,z,y:.65-GRAVITY/24,vy:0,roll:0,pitch:0,vroll:0,vpitch:0,heading:0,speed:0,draft:.65,stiffness:24,damping:4.5,points:[[-.65,-1.3],[.65,-1.3],[-.65,1.3],[.65,1.3]]};
}
/** Linear displaced-volume buoyancy evaluated independently at each hull sample. */
export function stepBuoyancy(body,dt,surfaceHeight) {
  if (!Number.isFinite(dt) || dt <= 0 || dt > .05 || typeof surfaceHeight !== 'function') throw new RangeError('Invalid buoyancy integration step');
  let force=0,rollTorque=0,pitchTorque=0,ix=0,iz=0;
  const cosine=Math.cos(body.heading),sine=Math.sin(body.heading);
  for(const [x,z] of body.points) {
    const water=surfaceHeight(body.x+x*cosine+z*sine,body.z-x*sine+z*cosine);
    const bottom=body.y+x*body.roll-z*body.pitch-body.draft;
    const depth=Math.max(0,Math.min(1.5,water-bottom));
    const f=body.stiffness*depth;
    force+=f; rollTorque+=x*f; pitchTorque-=z*f; ix+=x*x; iz+=z*z;
  }
  body.vy+=(force/body.points.length-GRAVITY-body.damping*body.vy)*dt;
  body.vroll+=(rollTorque/Math.max(ix,.1)-6*body.vroll)*dt;
  body.vpitch+=(pitchTorque/Math.max(iz,.1)-6*body.vpitch)*dt;
  body.y+=body.vy*dt; body.roll+=body.vroll*dt; body.pitch+=body.vpitch*dt;
  return body;
}
export function impactEvent(previousClearance,clearance,verticalVelocity,threshold=1.2) {
  return previousClearance>0 && clearance<=0 && verticalVelocity < -threshold;
}
export function fixedSteps(dt,carry,step) {
  if (![dt,carry].every(Number.isFinite) || dt < 0 || carry < 0 || typeof step !== 'function') throw new RangeError('Invalid fixed step input');
  const fixed=1/120; let remaining=carry+Math.min(dt,.1);
  while(remaining+1e-12 >= fixed) {step(fixed);remaining-=fixed;}
  return Math.max(0,remaining);
}
