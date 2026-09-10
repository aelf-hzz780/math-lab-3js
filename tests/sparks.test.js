import test from 'node:test';
import assert from 'node:assert/strict';
import { particleAt, particleCycle } from '../src/math/sparks.js';
test('zero drag reduces exactly to ballistic motion',()=>{
  const p=particleAt([0,1,0],[2,5,3],2,{drag:0,gravity:9.8});
  assert.deepEqual(p.position,[4,-8.600000000000001,6]);assert.deepEqual(p.velocity,[2,-14.600000000000001,3]);
});
test('positive drag approaches terminal velocity and composes independently of frame rate',()=>{
  const params={drag:2,gravity:9.8},start=[1,2,3],velocity=[4,5,6];
  const end=particleAt(start,velocity,100,params);assert.ok(Math.abs(end.velocity[1]+4.9)<1e-10);
  const middle=particleAt(start,velocity,.6,params),continued=particleAt(middle.position,middle.velocity,.4,params),direct=particleAt(start,velocity,1,params);
  direct.position.forEach((v,i)=>assert.ok(Math.abs(v-continued.position[i])<1e-12));
});
test('fixed particle slots recycle with bounded ages and reject malformed inputs',()=>{
  for(let i=0;i<500;i++){const cycle=particleCycle(i/10,1.8,.7);assert.ok(cycle.age>=0&&cycle.age<1.8);}
  assert.throws(()=>particleAt([0,0,0],[0,0,0],1,{drag:-1,gravity:9.8}),/nonnegative/);
});

import { emissionState } from '../src/math/sparks.js';
test('emission timing obeys requested rate and finite lifetime instead of filling the entire pool',()=>{
  const settings={rate:10,capacity:100,lifetime:2};
  const active=t=>Array.from({length:100},(_,i)=>emissionState(i,t,settings)).filter(p=>p.active).length;
  assert.equal(active(0),1);assert.equal(active(1),11);assert.equal(active(5),20);assert.equal(active(14),20);
  assert.equal(emissionState(99,0,settings).active,false);
  assert.throws(()=>emissionState(0,1,{...settings,rate:0}),/positive/);
});
