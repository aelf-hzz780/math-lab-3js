import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createExperiment,definition} from '../src/experiments/ocean.js';

test('a drop after the first frame triggers visible water impact and expires completely',()=>{
  const scene=new THREE.Scene();let metrics={};
  const instance=createExperiment({scene,quality:'high',seed:42,
    params:Object.fromEntries(definition.parameters.map(p=>[p.key,p.value])),
    setCamera(){},onMetrics(values){metrics=values;}});
  let splash;scene.traverse(object=>{if(object.isPoints&&object.geometry.attributes.alpha)splash=object;});
  try {
    instance.update(1/60,1/60);assert.equal(splash.geometry.drawRange.count,0);
    instance.action('drop');let maximum=0;
    for(let i=1;i<=300;i++){instance.update(1/60,(i+1)/60);maximum=Math.max(maximum,splash.geometry.drawRange.count);}
    assert.equal(maximum,48,'the moving water surface must not swallow the crossing event');
    assert.match(metrics['入水飞溅'],/^1 /);
    assert.equal(splash.geometry.drawRange.count,0,'expired particles must leave the draw range');
    instance.reset(42);instance.update(0,0);assert.equal(splash.geometry.drawRange.count,0);
  } finally {instance.dispose();}
  assert.equal(scene.children.length,0);
});
