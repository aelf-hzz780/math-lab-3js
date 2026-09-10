import test from 'node:test';
import assert from 'node:assert/strict';
import {modularTransform,multiplySL2,reduceToFundamental,normalizedLatticeBasis,latticePoint,classifyCM,CM_POINTS,boundedModuliGrid} from '../src/math/moduli.js';
import * as THREE from '../vendor/three.module.js';
import {createExperiment,definition} from '../src/experiments/moduli.js';

const close=(a,b)=>{assert(Math.abs(a.re-b.re)<1e-10);assert(Math.abs(a.im-b.im)<1e-10);};
const S=[0,-1,1,0],T=[1,1,0,1];
test('S and T preserve the upper half-plane and obey S² = (ST)³ = identity on τ',()=>{
  const tau={re:.27,im:1.4};
  close(modularTransform(modularTransform(tau,S),S),tau);
  const ST=multiplySL2(S,T);let image=tau;
  for(let i=0;i<3;i++)image=modularTransform(image,ST);
  close(image,tau);
  close(modularTransform(tau,T),{re:1.27,im:1.4});
  assert(modularTransform(tau,S).im>0);
});
test('reduction returns an equivalent point in the standard modular fundamental domain',()=>{
  for(const tau of [{re:5.2,im:.2},{re:-3.7,im:2},{re:.4,im:.3},{re:0,im:.04}]){
    const reduced=reduceToFundamental(tau);
    assert(Math.abs(reduced.tau.re)<=.5+1e-10);
    assert(reduced.tau.re**2+reduced.tau.im**2>=1-1e-10);
    close(modularTransform(tau,reduced.matrix),reduced.tau);
    close(reduceToFundamental(reduced.tau).tau,reduced.tau);
  }
});
test('normalized lattice has area one and lattice translations respect its two generators',()=>{
  for(const tau of [{re:0,im:1},{re:-.5,im:Math.sqrt(3)/2},{re:2.3,im:.7}]){
    const {u,v,area}=normalizedLatticeBasis(tau);
    assert(Math.abs(area-1)<1e-12);
    assert(Math.abs(u[0]*v[1]-u[1]*v[0]-1)<1e-12);
    const a=latticePoint(2,-3,tau),b=latticePoint(3,-3,tau);
    assert(Math.abs(b[0]-a[0]-u[0])<1e-12);assert(Math.abs(b[1]-a[1]-u[1])<1e-12);
  }
});
test('square and hexagonal CM points are fixed by their elliptic modular symmetries',()=>{
  close(modularTransform(CM_POINTS[0].tau,S),CM_POINTS[0].tau);
  close(modularTransform(CM_POINTS[1].tau,multiplySL2(S,T)),CM_POINTS[1].tau);
  for(const point of CM_POINTS){
    assert.equal(classifyCM(point.tau)?.discriminant,point.discriminant);
    assert.equal(classifyCM(modularTransform(point.tau,T))?.discriminant,point.discriminant);
  }
  assert.equal(classifyCM({re:.123,im:1.234}),null);
});
test('invalid complex structures, lattice indices and non-SL₂ matrices are rejected',()=>{
  for(const im of [0,-1,Infinity,NaN])assert.throws(()=>normalizedLatticeBasis({re:0,im}),RangeError);
  assert.throws(()=>modularTransform({re:0,im:1},[1,0,0,2]),RangeError);
  assert.throws(()=>latticePoint(.5,2,{re:0,im:1}),RangeError);
});

function sceneHarness(run){
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({width:1,height:1,getContext:()=>({fillText(){}})})};
  const scene=new THREE.Scene();let metrics;
  const defaults=Object.fromEntries(definition.parameters.map(p=>[p.key,p.value]));
  const experiment=createExperiment({scene,params:defaults,quality:'low',setCamera(){},onMetrics(value){metrics=value;}});
  try{return run({scene,experiment,defaults,metrics:()=>metrics});}
  finally{experiment.dispose();if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
}
test('display controls retain the current modular transformation, while changing base τ resets it',()=>sceneHarness(({experiment,defaults,metrics})=>{
  experiment.action('T');assert.equal(metrics()['当前 τ'],'1.00 + 1.00i');
  experiment.setParameters({...defaults,surface:'cycles'});
  assert.equal(metrics()['当前 τ'],'1.00 + 1.00i');
  assert.equal(metrics()['当前 SL₂ 基变换'],'[1 1; 0 1]');
  experiment.setParameters({...defaults,surface:'cycles',extent:6});
  assert.equal(metrics()['当前 τ'],'1.00 + 1.00i');
  experiment.setParameters({...defaults,tauReal:.25});
  assert.equal(metrics()['当前 τ'],'0.25 + 1.00i');
  assert.equal(metrics()['当前 SL₂ 基变换'],'[1 0; 0 1]');
}));
test('128 modular translations preserve a bounded grid and bounded scene geometry',()=>sceneHarness(({scene,experiment,metrics})=>{
  const count=()=>{let total=0;scene.traverse(object=>{if(object.geometry)total++;});return total;};
  const initial=count();
  for(let i=0;i<128;i++)experiment.action('T');
  assert.equal(metrics()['当前 τ'],'128.00 + 1.00i');
  assert(count()<=initial+40,`Geometry grew from ${initial} to ${count()}`);
}));
test('grid density adapts to large representatives while keeping the explicit forty-line budget',()=>{
  for(const [extent,top]of [[1.25,2.3],[16.4,31],[128.4,246],[1e6,2e6]]){
    const grid=boundedModuliGrid(extent,top);
    assert(grid.vertical.length+grid.horizontal.length<=40);
    assert(grid.vertical.every(x=>Math.abs(x)<=extent));
    assert(grid.horizontal.every(y=>y>=0&&y<top));
  }
  assert.throws(()=>boundedModuliGrid(1,Infinity),RangeError);
  assert.throws(()=>boundedModuliGrid(1,2,3),RangeError);
});
