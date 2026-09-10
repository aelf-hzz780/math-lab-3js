import test from 'node:test';
import assert from 'node:assert/strict';
import {CameraMotion} from '../src/core/presentation.js';

test('camera respects pause, touch gestures and the idle grace period',()=>{
  const motion=new CameraMotion({enabled:true});
  assert.ok(motion.step(.016,true,false)>0);
  assert.equal(motion.step(.016,false,false),0);
  motion.interact();
  for(let i=0;i<100;i++)assert.equal(motion.step(.05,true,true),0);
  for(let i=0;i<99;i++)assert.equal(motion.step(.05,true,false),0);
  motion.step(.05,true,false);
  assert.ok(motion.step(.05,true,false)>0);
});
test('camera prevents catch-up jumps and reduced-motion starts stationary',()=>{
  const motion=new CameraMotion({enabled:false});
  assert.equal(motion.step(100,true,false),0);
  motion.enabled=true;
  assert.ok(motion.step(100,true,false)<=.002);
  assert.equal(motion.step(NaN,true,false),0);
});
