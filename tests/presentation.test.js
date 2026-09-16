import test from 'node:test';
import assert from 'node:assert/strict';
import {CameraMotion,isFieldPointerActive} from '../src/core/presentation.js';

test('a latched camera gesture never becomes a simultaneous field drag',()=>{
  const event={type:'pointermove',pointerId:1,pointerType:'mouse',buttons:1,shiftKey:false};
  assert.equal(isFieldPointerActive(event,new Map([[1,{orbit:true}]])),false);
  assert.equal(isFieldPointerActive(event,new Map([[1,{orbit:false}]])),true);
  assert.equal(isFieldPointerActive({...event,shiftKey:true},new Map([[1,{orbit:false}]])),false);
  assert.equal(isFieldPointerActive({...event,buttons:2},new Map()),false);
  assert.equal(isFieldPointerActive(event,new Map([[1,{}],[2,{}]])),false);
  assert.equal(isFieldPointerActive({...event,type:'pointerup',pointerType:'touch'},new Map()),false);
  assert.equal(isFieldPointerActive({...event,type:'pointerleave'},new Map()),false);
  assert.equal(isFieldPointerActive({...event,type:'pointercancel'},new Map()),false);
});

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
