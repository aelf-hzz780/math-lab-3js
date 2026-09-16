import test from 'node:test';
import assert from 'node:assert/strict';
import {createParticleSeeds,compositionWeights,curlField,particleTarget,resolveParticleCount} from '../src/math/particle-paint.js';

test('particle seed buffers are reproducible, bounded and prefix stable across quality changes',()=>{
  const a=createParticleSeeds(1000,42),b=createParticleSeeds(1000,42),c=createParticleSeeds(1200,42);
  assert.deepEqual(a,b);assert.deepEqual(a,c.slice(0,a.length));
  assert.ok(a.every(v=>v>=0&&v<1));assert.notDeepEqual(a,createParticleSeeds(1000,43));
});
test('composition blending closes the three-artwork cycle with continuous first derivative',()=>{
  for(let t=-3;t<7;t+=.017){const w=compositionWeights(t);assert.ok(Math.abs(w.reduce((a,b)=>a+b,0)-1)<1e-12);assert.ok(w.every(v=>v>=0&&v<=1));}
  for(let i=0;i<3;i++){
    assert.equal(compositionWeights(i)[i],1);
    const left=compositionWeights(i-1e-5),right=compositionWeights(i+1e-5);
    assert.ok(left.every((v,j)=>Math.abs(v-right[j])<1e-8));
  }
  assert.deepEqual(compositionWeights(0),compositionWeights(3));
});
test('the analytic curl field has zero divergence to finite-difference accuracy',()=>{
  const h=1e-4;
  for(let i=0;i<30;i++){
    const p=[Math.sin(i)*2,Math.cos(i*.7)*3,i*.12];let div=0;
    for(let axis=0;axis<3;axis++){const plus=[...p],minus=[...p];plus[axis]+=h;minus[axis]-=h;div+=(curlField(plus,.9)[axis]-curlField(minus,.9)[axis])/(2*h);}
    assert.ok(Math.abs(div)<1e-8,`divergence ${div}`);
  }
});
test('all three procedural targets fill a finite portrait volume and retain depth',()=>{
  const seeds=createParticleSeeds(1000,173);
  for(let shape=0;shape<3;shape++){
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(let i=0;i<seeds.length;i+=4){const p=particleTarget(seeds.subarray(i,i+4),shape);p.forEach((v,j)=>{assert.ok(Number.isFinite(v)&&Math.abs(v)<5);min[j]=Math.min(min[j],v);max[j]=Math.max(max[j],v);});}
    assert.ok(max[0]-min[0]>2);assert.ok(max[1]-min[1]>3);assert.ok(max[2]-min[2]>.5);
  }
});
test('particle budgets enforce a mobile cap and reject malformed public inputs',()=>{
  assert.equal(resolveParticleCount(240000,'high'),240000);assert.equal(resolveParticleCount(2000000,'low'),120000);
  assert.equal(resolveParticleCount(60000,'low'),60000);
  for(const value of [NaN,Infinity,-1,2000001])assert.throws(()=>resolveParticleCount(value,'high'));
  assert.throws(()=>createParticleSeeds(3.4,42));assert.throws(()=>createParticleSeeds(100,-1));
  assert.throws(()=>compositionWeights(NaN));assert.throws(()=>curlField([0,NaN,0],0));assert.throws(()=>particleTarget([0,0,0,0],3));
});

import * as THREE from '../vendor/three.module.js';
import {createExperiment} from '../src/experiments/particle-paint.js';
function paintingContext(){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1.6,.03,1000),controller=new AbortController();
 return {scene,camera,quality:'low',seed:42,params:{particles:60000},signal:controller.signal,controller,onMetrics(){},setCamera(position,target){camera.position.fromArray(position);camera.lookAt(new THREE.Vector3(...target));camera.updateMatrixWorld();}};
}
test('paused particle artwork defers pointer targets and reset restores the exact initial uniforms',()=>{
 const ctx=paintingContext(),painting=createExperiment(ctx),strokes=ctx.scene.children[0].children.find(o=>o.geometry?.isInstancedBufferGeometry),u=strokes.material.uniforms;
 const initial={time:u.uTime.value,weights:u.uWeights.value.toArray(),pointer:u.uPointer.value.toArray(),force:u.uPointerStrength.value};
 painting.pointer({x:.25,y:.1,active:true,pressed:true});painting.update(0);
 assert.deepEqual({time:u.uTime.value,weights:u.uWeights.value.toArray(),pointer:u.uPointer.value.toArray(),force:u.uPointerStrength.value},initial);
 painting.update(.05);assert.notEqual(u.uPointerStrength.value,0);assert.notDeepEqual(u.uPointer.value.toArray(),initial.pointer);
 painting.reset(42);painting.update(0);
 assert.deepEqual({time:u.uTime.value,weights:u.uWeights.value.toArray(),pointer:u.uPointer.value.toArray(),force:u.uPointerStrength.value},initial);
 painting.dispose();
});
test('particle count replacement and repeated abort/disposal release each geometry once',()=>{
 const ctx=paintingContext(),painting=createExperiment(ctx),group=ctx.scene.children[0],geometries=new Map();
 function watch(){group.traverse(object=>{if(object.geometry&&!geometries.has(object.geometry)){const entry={count:0};geometries.set(object.geometry,entry);object.geometry.addEventListener('dispose',()=>entry.count++);}});}
 watch();painting.setParameters({particles:100000});watch();ctx.controller.abort();painting.dispose();
 assert.equal(ctx.scene.children.length,0);assert.ok([...geometries.values()].every(entry=>entry.count===1));
});
