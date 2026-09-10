function validate(params) {
  if(!params||!Number.isFinite(params.strain)||params.strain<=0||!Number.isFinite(params.viscosity)||params.viscosity<=0)throw new RangeError('strain and viscosity must be positive and finite');
  if(!Number.isFinite(params.circulation))throw new RangeError('circulation must be finite');
}
export function coreRadius(params){validate(params);return Math.sqrt(4*params.viscosity/params.strain);}
export function burgersVelocity(position,params){
  validate(params);if(!Array.isArray(position)||position.length!==3||!position.every(Number.isFinite))throw new TypeError('position must contain three finite numbers');
  const [x,y,z]=position,r2=x*x+z*z,core2=4*params.viscosity/params.strain;
  const angular=r2<1e-16?params.circulation/(2*Math.PI*core2):params.circulation*(-Math.expm1(-r2/core2))/(2*Math.PI*r2);
  return [-params.strain*x/2-angular*z,params.strain*y,-params.strain*z/2+angular*x].map(v=>v===0?0:v);
}
export function burgersVorticity(radius,params){validate(params);if(!Number.isFinite(radius)||radius<0)throw new RangeError('radius must be finite and nonnegative');const core2=4*params.viscosity/params.strain;return params.circulation/(Math.PI*core2)*Math.exp(-radius*radius/core2);}
export function vortexTrajectory(start,duration,steps,params){
  validate(params);if(!Array.isArray(start)||start.length!==3||!start.every(Number.isFinite)||!Number.isFinite(duration)||duration<0||!Number.isInteger(steps)||steps<1)throw new RangeError('trajectory inputs must be finite with positive integer steps');
  const radius=Math.hypot(start[0],start[2]),core2=4*params.viscosity/params.strain,dt=duration/steps;let angle=Math.atan2(start[2],start[0]);const points=[start.slice()];
  for(let i=1;i<=steps;i++){
    const midRadius2=radius*radius*Math.exp(-params.strain*(i-.5)*dt);
    const omega=midRadius2<1e-16?params.circulation/(2*Math.PI*core2):params.circulation*(-Math.expm1(-midRadius2/core2))/(2*Math.PI*midRadius2);
    angle+=omega*dt;const t=i*dt,r=radius*Math.exp(-params.strain*t/2);points.push([r*Math.cos(angle),start[1]*Math.exp(params.strain*t),r*Math.sin(angle)]);
  }
  return points;
}
