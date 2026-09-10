import test from 'node:test';
import assert from 'node:assert/strict';
import {constructKakeya, fieldLine, kakeyaSize} from '../src/math/kakeya.js';
test('new Kakeya family has the exact cardinality and covers every projective direction',()=>{
  for(const p of [3,5,7,11,19]) {
    const {points,witnesses}=constructKakeya(p), set=new Set(points.map(x=>x.join(',')));
    assert.equal(points.length,kakeyaSize(p));
    assert.equal(witnesses.length,p*p+p+1);
    for(const {anchor,direction} of witnesses) {
      const line=fieldLine(anchor,direction,p);
      assert.equal(new Set(line.map(x=>x.join(','))).size,p);
      assert.ok(line.every(x=>set.has(x.join(','))));
    }
  }
});
test('published new branch gives 129, 439 and 2031 points',()=>assert.deepEqual([7,11,19].map(kakeyaSize),[129,439,2031]));
test('finite-field input rejects composite, even, invalid and unbounded moduli',()=>{
  for(const p of [2,9,NaN,101,-3,7.5]) assert.throws(()=>constructKakeya(p),/prime/);
});
test('scene reset preserves the chosen starting direction and next reports its parameter',async()=>{
  const THREE=await import('../vendor/three.module.js');
  const {definition,createExperiment}=await import('../src/experiments/kakeya.js');
  const params=Object.fromEntries(definition.parameters.map(p=>[p.key,p.value]));params.scan=0;
  let metrics;
  const scene=new THREE.Scene(),experiment=createExperiment({scene,params,quality:'low',setCamera(){},onMetrics(value){metrics=value;}});
  const start=metrics['当前方向'];experiment.reset();assert.equal(metrics['当前方向'],start);
  const runner=scene.getObjectByName('modular-traveler'),first=runner.position.clone();
  experiment.update(.4);assert(first.distanceTo(runner.position)>0,'the marker visits the next modular line point');experiment.reset();assert(first.distanceTo(runner.position)<1e-12);
  const next=experiment.action('next');assert.notEqual(metrics['当前方向'],start);
  const direction=metrics['当前方向'];experiment.setParameters({...params,...next.params});experiment.reset();assert.equal(metrics['当前方向'],direction);
  experiment.dispose();assert.equal(scene.children.length,0);
});
