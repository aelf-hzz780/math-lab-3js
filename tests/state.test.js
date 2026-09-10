import test from 'node:test';
import assert from 'node:assert/strict';
import { validateParameters, SimulationClock } from '../src/core/state.js';

const definitions = [{key:'rate',type:'range',min:0,max:5,step:.1,value:2},{key:'mode',type:'select',value:'a',options:[{value:'a'},{value:'b'}]}];
test('public parameters reject invalid values without partially applying input',()=>{
  assert.deepEqual(validateParameters(definitions,{rate:3,mode:'b'}),{rate:3,mode:'b'});
  for (const rate of [NaN,Infinity,-1,6,'3']) assert.throws(()=>validateParameters(definitions,{rate}));
  assert.throws(()=>validateParameters(definitions,{mode:'missing'}));
  assert.deepEqual(validateParameters(definitions,{}),{rate:2,mode:'a'});
});
test('simulation pause, background visibility and reset remain independent',()=>{
  const clock=new SimulationClock();
  assert.equal(clock.tick(.02),.02);
  clock.paused=true; clock.visible=false; clock.tick(10);
  clock.visible=true; assert.equal(clock.tick(.02),0); assert.equal(clock.time,.02);
  clock.paused=false; assert.equal(clock.tick(5),.05);
  clock.reset(); assert.equal(clock.time,0); assert.equal(clock.paused,false);
});
