import test from 'node:test';
import assert from 'node:assert/strict';
import {torusLinkInfo, torusKnotPoint, torusKnotSpeed, measureKnotPair} from '../src/math/torus-knot.js';
import * as THREE from '../vendor/three.module.js';
import {createExperiment,definition} from '../src/experiments/torus-knot.js';

const model={p:3,q:5,majorRadius:2.4,minorRadius:.85};
test('coprime windings give one knot; common factors give distinct closed link components',()=>{
  assert.equal(torusLinkInfo(3,5).components,1);
  assert.deepEqual(torusLinkInfo(4,6),{components:2,pReduced:2,qReduced:3,isKnot:false});
  const link={...model,p:4,q:6};
  for(let component=0;component<2;component++){
    const start=torusKnotPoint(0,link,component),end=torusKnotPoint(2*Math.PI,link,component);
    assert(Math.hypot(...start.map((x,i)=>x-end[i]))<1e-12);
  }
  assert.notDeepEqual(torusKnotPoint(0,link,0),torusKnotPoint(0,link,1));
});
test('the curve lies on its declared torus and the analytic speed matches its derivative',()=>{
  for(const t of [.1,1.7,3.2,5.1]){
    const [x,y,z]=torusKnotPoint(t,model);
    assert(Math.abs((Math.hypot(x,z)-model.majorRadius)**2+y*y-model.minorRadius**2)<1e-12);
    const h=1e-6,a=torusKnotPoint(t-h,model),b=torusKnotPoint(t+h,model);
    const numeric=Math.hypot(...a.map((x,i)=>(b[i]-x)/(2*h)));
    assert(Math.abs(torusKnotSpeed(t,model)-numeric)<1e-7);
  }
});
test('pair measurements choose the shorter arc, are symmetric, and converge under refinement',()=>{
  const pair=measureKnotPair(.14,.76,model,0,1024);
  const reverse=measureKnotPair(.76,.14,model,0,1024);
  const refined=measureKnotPair(.14,.76,model,0,2048);
  assert(pair.shortArc<=pair.totalLength/2+1e-10);
  assert(pair.ratio>=1);
  assert(Math.abs(pair.ratio-reverse.ratio)<1e-8);
  assert(Math.abs(pair.ratio-refined.ratio)<1e-7);
});
test('distortion pair ratio is scale invariant and coincident points are reported as undefined',()=>{
  const a=measureKnotPair(.18,.51,model);
  const b=measureKnotPair(.18,.51,{...model,majorRadius:4.8,minorRadius:1.7});
  assert(Math.abs(a.ratio-b.ratio)<1e-10);
  assert(Math.abs(2*a.chord-b.chord)<1e-10);
  assert.equal(measureKnotPair(.2,1.2,model).ratio,null);
  assert(Math.abs(measureKnotPair(.2,.20001,model).ratio-1)<1e-6);
});
test('invalid winding numbers, self-intersecting torus parameters, and wrong components are rejected',()=>{
  for(const p of [0,2.5,NaN,13])assert.throws(()=>torusLinkInfo(p,3),RangeError);
  assert.throws(()=>torusKnotPoint(0,{...model,minorRadius:3}),RangeError);
  assert.throws(()=>torusKnotPoint(0,model,1),RangeError);
  assert.throws(()=>measureKnotPair(0,.3,model,0,3),RangeError);
});
test('picking a tube converts its arc-length UV coordinate back to the curve parameter for A and B',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({width:1,height:1,getContext:()=>({fillText(){}})})};
  const scene=new THREE.Scene(),params={...Object.fromEntries(definition.parameters.map(p=>[p.key,p.value])),p:2,q:3,minor:1.2};
  const experiment=createExperiment({scene,params,quality:'low',setCamera(){},onMetrics(){}});
  try{
    const mesh=scene.children[0].children[0].children.find(object=>object.userData.component===0);
    assert(mesh?.geometry.parameters.path);
    const curve=mesh.geometry.parameters.path;
    for(const [index,u]of [.079861,.379].entries()){
      const hit={object:mesh,faceIndex:Math.floor(u*mesh.userData.segments)*2*mesh.userData.radialSegments,uv:{x:u}};
      const result=experiment.pick({intersectObjects:()=>[hit]});
      const phase=result.params[index?'second':'first'];
      const expected=curve.getPointAt(u),actual=new THREE.Vector3().fromArray(torusKnotPoint(phase*2*Math.PI,{p:2,q:3,majorRadius:2.4,minorRadius:1.2}));
      assert(actual.distanceTo(expected)<1e-8,`Picked marker missed the displayed centerline by ${actual.distanceTo(expected)}`);
    }
  }finally{experiment.dispose();if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
