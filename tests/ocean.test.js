import test from 'node:test';
import assert from 'node:assert/strict';
import { dispersion, waveSample, stepBuoyancy, makeBody, impactEvent, fixedSteps } from '../src/math/ocean.js';

test('deep-water waves obey omega² = gk and zero amplitude is a flat sea', () => {
  for (const k of [0.1, 1, 10]) assert.ok(Math.abs(dispersion(k) ** 2 - 9.81 * k) < 1e-12);
  assert.deepEqual(waveSample(7, -3, 4, 0), { height: 0, dx: 0, dz: 0 });
  assert.throws(() => dispersion(-1), RangeError);
});

test('analytic surface derivatives match central differences', () => {
  const x = 2.1, z = -1.3, t = 3.5, e = 1e-5, s = waveSample(x, z, t, 0.7);
  assert.ok(Math.abs(s.dx - (waveSample(x+e,z,t,.7).height-waveSample(x-e,z,t,.7).height)/(2*e)) < 1e-7);
  assert.ok(Math.abs(s.dz - (waveSample(x,z+e,t,.7).height-waveSample(x,z-e,t,.7).height)/(2*e)) < 1e-7);
});

test('four-point buoyancy settles at equilibrium with damped attitude', () => {
  const body = makeBody(); Object.assign(body, { y: 1.8, roll: .12, pitch: -.1 });
  for (let i=0; i<3600; i++) stepBuoyancy(body, 1/120, () => 0);
  assert.ok(Math.abs(body.y - (.65 - 9.81/24)) < .001);
  assert.ok(Math.abs(body.vy) < .001 && Math.abs(body.roll) < .001 && Math.abs(body.pitch) < .001);
});

test('splash fires on fast downward surface crossings only', () => {
  assert.equal(impactEvent(.2, -.1, -3), true);
  assert.equal(impactEvent(-.1, -.2, -3), false);
  assert.equal(impactEvent(.2, -.1, -.2), false);
  assert.equal(impactEvent(-.1, .2, 3), false);
});

test('fixed integration produces equal states for 30 and 60 FPS', () => {
  const run = fps => { const body=makeBody(); let carry=0; for(let i=0;i<fps*5;i++) carry=fixedSteps(1/fps,carry,dt=>stepBuoyancy(body,dt,()=>0)); return body; };
  const a=run(30),b=run(60);
  for(const key of ['y','vy','roll','pitch']) assert.ok(Math.abs(a[key]-b[key]) < 1e-10);
});
