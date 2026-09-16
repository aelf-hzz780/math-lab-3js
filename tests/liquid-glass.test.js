import test from 'node:test';
import assert from 'node:assert/strict';
import { springStep, smoothMinimum, liquidDistance, refractDirection } from '../src/math/liquid-glass.js';
import * as THREE from '../vendor/three.module.js';
import {createExperiment,definition} from '../src/experiments/liquid-glass.js';

test('critical spring has exact timestep subdivision for a fixed target', () => {
  const initial={position:-.8,velocity:2.3};
  const one=springStep(initial,1.2,.8,4.3);
  let many=initial;
  for(let i=0;i<80;i++)many=springStep(many,1.2,.01,4.3);
  assert.ok(Math.abs(one.position-many.position)<1e-12);
  assert.ok(Math.abs(one.velocity-many.velocity)<1e-12);
});

test('spring release converges without overshooting from rest, including long frames', () => {
  for(const viscosity of [.2,1,2]) {
    let state={position:1,velocity:0},previous=1;
    for(let i=0;i<40;i++) {
      state=springStep(state,0,.2,7/viscosity);
      assert.ok(state.position>=0 && state.position<=previous);
      previous=state.position;
    }
    assert.ok(state.position<1e-8);
    assert.ok(Number.isFinite(springStep(state,0,30,7/viscosity).position));
  }
});

test('smooth union preserves sphere interior and is continuously differentiable at blend edges', () => {
  const h=1e-5;
  for(const x of [-.5,.5]) {
    const left=(smoothMinimum(x,0,.5)-smoothMinimum(x-h,0,.5))/h;
    const right=(smoothMinimum(x+h,0,.5)-smoothMinimum(x,0,.5))/h;
    assert.ok(Math.abs(left-right)<.0001);
  }
  assert.equal(smoothMinimum(-2,3,.5),-2);
});

test('liquid field is deterministic, bounded and spatially continuous at all shape modes', () => {
  for(const shape of [0,1,2]) for(const time of [0,.7,3.1]) {
    let inside=0;
    for(let x=-3;x<=3;x+=.3)for(let y=-3;y<=3;y+=.3) {
      const p=[x,y,.3],a=liquidDistance(p,{time,shape,seed:42});
      assert.equal(a,liquidDistance(p,{time,shape,seed:42}));
      assert.ok(Number.isFinite(a));
      const b=liquidDistance([x+.0001,y,.3],{time,shape,seed:42});
      assert.ok(Math.abs(a-b)<.0003,'small position changes preserve a continuous surface field');
      if(a<0)inside++;
    }
    assert.ok(inside>20,'a substantial visible solid is present at initialization and during motion');
    for(const p of [[7,0,0],[-7,0,0],[0,7,0],[0,0,7]]) assert.ok(liquidDistance(p,{time,shape})>1);
  }
});

test('Snell refraction preserves the normal ray and satisfies the sine law', () => {
  assert.deepEqual(refractDirection([0,0,-1],[0,0,1],1/1.5),[0,0,-1]);
  const angle=.7,incident=[Math.sin(angle),0,-Math.cos(angle)];
  const transmitted=refractDirection(incident,[0,0,1],1/1.5);
  assert.ok(Math.abs(transmitted[0]-Math.sin(angle)/1.5)<1e-12);
  assert.ok(Math.abs(Math.hypot(...transmitted)-1)<1e-12);
  assert.equal(refractDirection([Math.sin(1),0,-Math.cos(1)],[0,0,1],1.5),null,'total internal reflection is explicit');
});

test('public math operations reject nonfinite values and invalid dimensions', () => {
  for(const args of [[{position:NaN,velocity:0},0,.1,4],[{position:0,velocity:0},0,-1,4],[{position:0,velocity:0},0,.1,0]])assert.throws(()=>springStep(...args),RangeError);
  assert.throws(()=>smoothMinimum(0,1,0),RangeError);
  assert.throws(()=>liquidDistance([0,0,NaN]),RangeError);
  assert.throws(()=>liquidDistance([0,0,0],{shape:3}),RangeError);
  assert.throws(()=>refractDirection([0,0,-2],[0,0,1],.7),RangeError);
});

function context(){
  const camera=new THREE.PerspectiveCamera(42,1.6,.03,1000),scene=new THREE.Scene(),abort=new AbortController();
  return {camera,scene,quality:'low',seed:42,params:{},signal:abort.signal,abort,onMetrics(){},setCamera(position,target){camera.position.fromArray(position);camera.lookAt(new THREE.Vector3().fromArray(target));camera.updateMatrixWorld();}};
}

test('scene pointer only affects simulation when time advances; reset restores all rendered state', () => {
  const ctx=context(),experiment=createExperiment(ctx),mesh=ctx.scene.children[0].children[0],u=mesh.material.uniforms;
  const originalTime=u.liquidTime.value,originalCloud=u.liquidClouds.value;
  experiment.pointer({x:0,y:0,active:true,pressed:true});experiment.pointer({x:.4,y:.3,active:true,pressed:true});
  experiment.update(0);
  assert.equal(u.liquidPull.value.length(),0,'paused pointer movement must leave pixels unchanged');
  experiment.update(.1);
  assert.ok(u.liquidPull.value.length()>.05,'drag visibly changes geometry after a simulation step');
  experiment.reset(42);
  assert.equal(u.liquidTime.value,originalTime);assert.equal(u.liquidPull.value.length(),0);assert.equal(u.liquidAnchor.value.length(),0);
  assert.equal(u.liquidClouds.value,originalCloud,'same-seed reset avoids regenerating textures');
  experiment.dispose();
});

test('render rays follow the actual camera while paused and disposal is idempotent', () => {
  const ctx=context(),experiment=createExperiment(ctx),mesh=ctx.scene.children[0].children[0],u=mesh.material.uniforms;
  ctx.camera.position.set(7,4,6);ctx.camera.lookAt(0,0,0);ctx.camera.aspect=.65;ctx.camera.updateProjectionMatrix();
  mesh.onBeforeRender();
  assert.deepEqual(u.liquidCameraPosition.value.toArray(),[7,4,6]);
  assert.deepEqual(u.liquidCameraWorld.value.elements,ctx.camera.matrixWorld.elements);
  assert.deepEqual(u.liquidProjectionInverse.value.elements,ctx.camera.projectionMatrixInverse.elements);
  const disposed={texture:0,material:0,geometry:0};
  for(const [key,value]of [['texture',u.liquidClouds.value],['material',mesh.material],['geometry',mesh.geometry]])value.addEventListener('dispose',()=>disposed[key]++);
  ctx.abort.abort();experiment.dispose();
  assert.equal(ctx.scene.children.length,0);assert.deepEqual(disposed,{texture:1,material:1,geometry:1});
});

test('a new drag started while paused preserves an already deformed surface until time advances', () => {
  const ctx=context(),experiment=createExperiment(ctx),u=ctx.scene.children[0].children[0].material.uniforms;
  experiment.pointer({x:.1,y:.1,active:true,pressed:true});experiment.pointer({x:.5,y:.3,active:true,pressed:true});experiment.update(.15);
  assert.ok(u.liquidPull.value.length()>.1);
  const before={anchor:u.liquidAnchor.value.toArray(),pull:u.liquidPull.value.toArray(),time:u.liquidTime.value};
  experiment.pointer({x:.5,y:.3,active:true,pressed:false});
  experiment.pointer({x:-.4,y:-.3,active:true,pressed:true});experiment.pointer({x:-.1,y:.1,active:true,pressed:true});experiment.update(0);
  assert.deepEqual({anchor:u.liquidAnchor.value.toArray(),pull:u.liquidPull.value.toArray(),time:u.liquidTime.value},before);
  experiment.update(.016);assert.notDeepEqual(u.liquidAnchor.value.toArray(),before.anchor);
  experiment.dispose();
});

test('pulse on an already deformed paused surface waits for a simulation step before changing rendered state', () => {
  const ctx=context(),experiment=createExperiment(ctx),u=ctx.scene.children[0].children[0].material.uniforms;
  experiment.pointer({x:-.1,y:.2,active:true,pressed:true});experiment.pointer({x:.3,y:.4,active:true,pressed:true});experiment.update(.15);
  assert.ok(u.liquidPull.value.length()>.1);
  const before={anchor:u.liquidAnchor.value.toArray(),pull:u.liquidPull.value.toArray(),time:u.liquidTime.value};
  experiment.action('pulse');experiment.update(0);
  assert.deepEqual({anchor:u.liquidAnchor.value.toArray(),pull:u.liquidPull.value.toArray(),time:u.liquidTime.value},before);
  experiment.update(.016);assert.deepEqual(u.liquidAnchor.value.toArray(),[.4,.3,0]);assert.notDeepEqual(u.liquidPull.value.toArray(),before.pull);
  experiment.dispose();
});

test('preset controls update optical properties and seed changes replace exactly one cloud texture', () => {
  const ctx=context(),experiment=createExperiment(ctx),u=ctx.scene.children[0].children[0].material.uniforms;
  experiment.setParameters(definition.presets[1].params);assert.equal(u.liquidShape.value,1);assert.equal(u.liquidIOR.value,1.46);
  let disposed=0;const oldTexture=u.liquidClouds.value;oldTexture.addEventListener('dispose',()=>disposed++);
  experiment.reset(43);assert.notEqual(u.liquidClouds.value,oldTexture);assert.equal(disposed,1);
  assert.throws(()=>experiment.setParameters({ior:Infinity}),RangeError);
  assert.throws(()=>experiment.pointer({x:Infinity,y:0}),RangeError);
  experiment.dispose();
});
