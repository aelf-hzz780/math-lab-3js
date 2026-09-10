import test from 'node:test';
import assert from 'node:assert/strict';
import { duneHeight, duneSample } from '../src/math/dunes.js';

test('same seed produces identical terrain; different seeds change it', () => {
  const p={height:2,wind:35,speed:.2};
  assert.equal(duneHeight(2,7,3,p,42),duneHeight(2,7,3,p,42));
  assert.notEqual(duneHeight(2,7,3,p,42),duneHeight(2,7,3,p,11));
});

test('zero height gives a flat plane with upward normal', () => {
  assert.equal(duneHeight(8,-2,10,{height:0,wind:90,speed:1},42),0);
  assert.deepEqual(duneSample(8,-2,10,{height:0,wind:90,speed:1},42).normal,[0,1,0]);
});

test('wind advection moves terrain at the selected speed', () => {
  const p={height:2,wind:40,speed:.4},angle=p.wind*Math.PI/180,t=5;
  assert.ok(Math.abs(duneHeight(3,8,t,p,8)-duneHeight(3-Math.cos(angle)*p.speed*t,8-Math.sin(angle)*p.speed*t,0,p,8))<1e-12);
});

test('terrain remains finite over the supported parameter range and normals have unit length', () => {
  for (const height of [0,.5,4]) for (const wind of [0,180,360]) {
    const {height:y,normal:n}=duneSample(10,-20,12,{height,wind,speed:.8},42);
    assert.ok(Number.isFinite(y)); assert.ok(Math.abs(Math.hypot(...n)-1)<1e-12);
  }
  assert.throws(()=>duneHeight(NaN,0,0,{},42),RangeError);
});
