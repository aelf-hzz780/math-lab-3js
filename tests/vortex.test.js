import test from 'node:test';
import assert from 'node:assert/strict';
import { burgersVelocity, burgersVorticity, vortexTrajectory, coreRadius } from '../src/math/vortex.js';
const params={strain:0.7,viscosity:0.12,circulation:8};
test('Burgers velocity has a finite axis limit and is divergence-free',()=>{
  assert.deepEqual(burgersVelocity([0,2,0],params),[0,1.4,0]);
  const p=[.65,.8,-.4],h=1e-5;
  let divergence=0;
  for(let k=0;k<3;k++){const lo=[...p],hi=[...p];lo[k]-=h;hi[k]+=h;divergence+=(burgersVelocity(hi,params)[k]-burgersVelocity(lo,params)[k])/(2*h);}
  assert.ok(Math.abs(divergence)<1e-8);
});
test('integrated axial vorticity recovers circulation',()=>{
  const max=coreRadius(params)*6,n=12000,dr=max/n;let flux=0;
  for(let i=0;i<n;i++){const r=(i+.5)*dr;flux+=burgersVorticity(r,params)*2*Math.PI*r*dr;}
  assert.ok(Math.abs(flux-params.circulation)<1e-5);
});
test('streamline radial and axial stretching follow the exact solution',()=>{
  const start=[2,.2,0], t=1.8, points=vortexTrajectory(start,t,300,params),end=points.at(-1);
  assert.ok(Math.abs(Math.hypot(end[0],end[2])-2*Math.exp(-params.strain*t/2))<1e-10);
  assert.ok(Math.abs(end[1]-.2*Math.exp(params.strain*t))<1e-10);
  assert.throws(()=>coreRadius({...params,viscosity:0}),/positive/);
});
