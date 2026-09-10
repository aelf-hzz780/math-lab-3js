import test from 'node:test';
import assert from 'node:assert/strict';
import {K4_EDGES,matroidState,matroidBases,basisPolynomial,basisJet,logSlice,derivativeHessian,symmetricEigenvalues} from '../src/math/matroid.js';
const determinant3=m=>m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])-m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])+m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
test('K4 graphic matroid detects cycles, ranks and all 16 spanning-tree bases',()=>{
 assert.deepEqual(matroidState(0),{rank:0,size:0,independent:true,basis:false,components:4});
 assert.equal(matroidState(1|2|8).independent,false);assert.equal(matroidState(1|2|8).rank,2);assert.equal(matroidState(7).basis,true);assert.equal(matroidState(63).rank,3);
 const bases=matroidBases();assert.equal(bases.length,16);assert.ok(bases.every(b=>b.length===3));
 for(const A of bases)for(const B of bases)for(const a of A.filter(e=>!B.includes(e)))assert.ok(B.filter(e=>!A.includes(e)).some(b=>matroidState([...A.filter(e=>e!==a),b].reduce((mask,e)=>mask|1<<e,0)).basis));
});
test('basis generating polynomial agrees with the matrix-tree theorem for positive weights',()=>{
 assert.equal(basisPolynomial([1,1,1,1,1,1]),16);
 for(const weights of [[.2,.5,1,2,3,4],[4,1.2,.4,3,.8,1],[1,2,3,4,5,6]]){
  const laplacian=Array.from({length:4},()=>Array(4).fill(0));K4_EDGES.forEach(([a,b],i)=>{laplacian[a][a]+=weights[i];laplacian[b][b]+=weights[i];laplacian[a][b]-=weights[i];laplacian[b][a]-=weights[i];});
  assert.ok(Math.abs(basisPolynomial(weights)-determinant3(laplacian.slice(0,3).map(r=>r.slice(0,3))))<1e-9);
  assert.ok(Math.abs(basisPolynomial(weights.map(w=>w*2))-8*basisPolynomial(weights))<1e-8);
 }
});
test('positive-weight log slice is concave and its analytic derivatives match finite differences',()=>{
 for(const x of [.1,.4,1,3.5])for(const y of [.1,.7,2,3.5]){const slice=logSlice(x,y,.8),[a,b]=slice.eigenvalues;assert.ok(a<=1e-10&&b<=1e-10);const h=1e-4,numeric=(logSlice(x+h,y,.8).value-logSlice(x-h,y,.8).value)/(2*h);assert.ok(Math.abs(numeric-slice.gradient[0])<1e-7);}
 const jet=basisJet([1,1,1,1,1,1]);assert.deepEqual(jet.gradient,Array(6).fill(8));assert.equal(jet.value,16);assert.ok(jet.hessian.every((r,i)=>r[i]===0));
});
test('every first derivative has the Lorentzian signature +--000',()=>{
 const expected=[1+Math.sqrt(5),0,0,0,1-Math.sqrt(5),-2].sort((a,b)=>b-a);
 for(let i=0;i<6;i++){const eigen=symmetricEigenvalues(derivativeHessian(i));eigen.forEach((value,j)=>assert.ok(Math.abs(value-expected[j])<1e-10));}
 assert.throws(()=>matroidState(64));assert.throws(()=>matroidState(1.5));assert.throws(()=>basisPolynomial([1,2]));assert.throws(()=>basisPolynomial([1,1,1,1,1,-1]));assert.throws(()=>logSlice(0,1,1));assert.throws(()=>derivativeHessian(6));
});
test('matroid scene selects real edges, enumerates bases, updates a paused surface and disposes resources',async()=>{
 const THREE=await import('../vendor/three.module.js'),{createExperiment}=await import('../src/experiments/matroid.js');const previous=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>({fillText(){},clearRect(){}})})};
 try{
  const scene=new THREE.Scene();let metrics;const instance=createExperiment({scene,quality:'low',seed:42,params:{},setCamera(){},onMetrics(v){metrics=v;}}),surface=scene.children[0].getObjectByName('matroid-log-surface');
  assert.equal(metrics['独立性'],'基 · 生成树');const before=Array.from(surface.geometry.attributes.position.array);instance.setParameters({selection:11,others:2});instance.update(0);assert.equal(metrics['独立性'],'相关 · 含环');assert.notDeepEqual(Array.from(surface.geometry.attributes.position.array),before);
  assert.ok(matroidState(instance.action('next-basis').params.selection).basis);assert.equal(instance.action('clear').params.selection,0);
  const result=instance.pick({intersectObjects:objects=>[{object:objects[4]}]});assert.deepEqual(result.params,{selection:16,edge:'4'});assert.equal(metrics['独立性'],'独立 · 无环');assert.throws(()=>instance.setParameters({selection:2.1}));
  const eigen=symmetricEigenvalues(derivativeHessian(4));assert.equal(eigen.filter(v=>v>1e-9).length,1);instance.reset(42);instance.dispose();assert.equal(scene.children.length,0);
 }finally{globalThis.document=previous;}
});
