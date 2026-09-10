import test from 'node:test';
import assert from 'node:assert/strict';
import { createGas, advanceGas, resolveElasticPair, kineticEnergy, totalMomentum, conservedMomentum, reverseGas } from '../src/math/boltzmann.js';

const setup = { count: 48, radius: .2, halfSize: 2.7, temperature: 1, seed: 42 };
function near(a, b, tolerance = 1e-10) { assert.ok(Math.abs(a - b) < tolerance, `${a} differs from ${b}`); }

test('equal-mass elastic impact conserves energy and momentum, swapping only normal components', () => {
  const a = { position: [-1, 0, 0], velocity: [2, 1, 0] }, b = { position: [1, 0, 0], velocity: [-1, 2, 0] };
  assert.equal(resolveElasticPair(a, b, 1), true);
  assert.deepEqual(a.velocity, [-1, 1, 0]);
  assert.deepEqual(b.velocity, [2, 2, 0]);
  assert.equal(resolveElasticPair(a, b, 1), false);
});

test('seed initialization is deterministic, has the requested energy and no overlaps', () => {
  const a = createGas(setup), b = createGas(setup);
  assert.deepEqual(a.positions, b.positions);
  assert.deepEqual(a.velocities, b.velocities);
  near(kineticEnergy(a), 1.5 * setup.count * setup.temperature);
  totalMomentum(a).forEach(x => near(x, 0));
  for (let i = 0; i < a.count; i++) for (let j = i + 1; j < a.count; j++) {
    const distance = Math.hypot(...[0, 1, 2].map(k => a.positions[j * 3 + k] - a.positions[i * 3 + k]));
    assert.ok(distance > 2 * a.radius);
  }
});

test('reflecting walls keep sphere centres inside and account for wall momentum exchange', () => {
  const gas = createGas({ ...setup, count: 2 });
  gas.positions.set([2.49, 0, 0, -1, 0, 0]); gas.velocities.set([2, 0, 0, 0, 0, 0]);
  const energy = kineticEnergy(gas), momentum = conservedMomentum(gas);
  advanceGas(gas, .1);
  assert.ok(gas.velocities[0] < 0);
  assert.ok(gas.positions[0] <= 2.5 && gas.positions[0] >= -2.5);
  near(kineticEnergy(gas), energy);
  conservedMomentum(gas).forEach((x, k) => near(x, momentum[k]));
});

test('fixed stepping gives the same gas and history at 30 FPS and 60 FPS', () => {
  const run = fps => { const gas = createGas(setup); for (let i = 0; i < fps * 3; i++) advanceGas(gas, 1 / fps); return gas; };
  const a = run(30), b = run(60);
  assert.deepEqual(a.positions, b.positions); assert.deepEqual(a.velocities, b.velocities);
  assert.deepEqual(a.history, b.history); assert.equal(a.steps, b.steps);
});

test('long run preserves energy and total gas-plus-wall momentum with bounded history', () => {
  const gas = createGas({ ...setup, count: 96, radius: .3, historyCapacity: 32 });
  const e = kineticEnergy(gas), p = conservedMomentum(gas);
  for (let i = 0; i < 600; i++) advanceGas(gas, 1 / 60);
  near(kineticEnergy(gas), e, 1e-8);
  conservedMomentum(gas).forEach((x, k) => near(x, p[k], 1e-8));
  assert.ok(gas.collisions > 32); assert.equal(gas.history.length, 32);
  gas.history.forEach(event => event.parents.forEach(parent => assert.ok(parent < event.id)));
  for (let i = 0; i < gas.positions.length; i++) assert.ok(Number.isFinite(gas.positions[i]) && Math.abs(gas.positions[i]) <= gas.halfSize - gas.radius + 1e-9);
  assert.ok(gas.candidateChecks / gas.steps < gas.count * (gas.count - 1) / 2);
});

test('velocity reversal preserves energy and public invalid inputs fail', () => {
  const gas = createGas(setup), e = kineticEnergy(gas), before = gas.velocities.slice();
  reverseGas(gas);
  gas.velocities.forEach((v, i) => assert.equal(v, -before[i])); near(kineticEnergy(gas), e);
  assert.throws(() => createGas({ ...setup, count: 0 }), RangeError);
  assert.throws(() => createGas({ ...setup, radius: NaN }), RangeError);
  assert.throws(() => advanceGas(gas, -.1), RangeError);
  assert.throws(() => advanceGas(gas, Infinity), RangeError);
});
