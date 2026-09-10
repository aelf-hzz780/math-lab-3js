import test from 'node:test';
import assert from 'node:assert/strict';
import { jointProbabilities, quantumMetrics, chsh, sampleOutcomes } from '../src/math/quantum.js';
import { seededRandom } from '../src/core/resources.js';
test('Born probabilities are normalized and nonnegative for product and entangled states',()=>{
  for(const chi of [0,.12,Math.PI/4])for(const phi of [0,1.6,Math.PI])for(const a of [0,.3,2.8])for(const b of [0,1.8,3.1]){
    const p=jointProbabilities(chi,phi,a,b);assert.ok(p.every(x=>x>=0&&x<=1));assert.ok(Math.abs(p.reduce((s,x)=>s+x,0)-1)<1e-12);
  }
  assert.deepEqual(jointProbabilities(0,0,0,0),[1,0,0,0]);
});
test('remote measurement does not change local marginal and Bell state has maximally mixed marginals',()=>{
  const first=jointProbabilities(.34,.5,.7,.1),other=jointProbabilities(.34,.5,.7,2.5);
  assert.ok(Math.abs(first[0]+first[1]-other[0]-other[1])<1e-12);
  const metrics=quantumMetrics(Math.PI/4);assert.ok(Math.abs(metrics.blochLength)<1e-12);assert.ok(Math.abs(metrics.purity-.5)<1e-12);assert.equal(metrics.concurrence,1);
});
test('Bell state fixed CHSH settings reach 2 sqrt(2), and sampling is reproducible',()=>{
  assert.ok(Math.abs(chsh(Math.PI/4,0)-2*Math.SQRT2)<1e-12);
  const p=jointProbabilities(Math.PI/4,0,.4,1);
  const a=sampleOutcomes(p,10000,seededRandom(42)),b=sampleOutcomes(p,10000,seededRandom(42));
  assert.deepEqual(a,b);assert.equal(a.reduce((s,x)=>s+x,0),10000);
  a.forEach((v,i)=>assert.ok(Math.abs(v/10000-p[i])<.025));
  assert.throws(()=>jointProbabilities(NaN,0,0,0),/finite/);
});

test('both local marginals remain independent of the other setting while CHSH varies with the prepared state',()=>{
  for(const chi of [0,.31,Math.PI/4])for(const phi of [0,1.1,Math.PI]){
    const p=jointProbabilities(chi,phi,.6,.7),otherA=jointProbabilities(chi,phi,1.8,.7),otherB=jointProbabilities(chi,phi,.6,2.4);
    assert.ok(Math.abs(p[0]+p[2]-otherA[0]-otherA[2])<1e-12);
    assert.ok(Math.abs(p[0]+p[1]-otherB[0]-otherB[1])<1e-12);
  }
  assert.ok(chsh(0,0)<=2);assert.ok(chsh(Math.PI/4,0)>2);
});
