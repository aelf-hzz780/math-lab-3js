import test from 'node:test';
import assert from 'node:assert/strict';
import {e8Roots,e8Contacts,projectionBasis8,projectRoots8} from '../src/math/e8.js';
const dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0);
test('E8 has exactly 112 integer and 128 half-integer roots with squared norm 2',()=>{
 const roots=e8Roots();assert.equal(roots.length,240);assert.equal(new Set(roots.map(r=>r.join(','))).size,240);
 assert.equal(roots.filter(r=>r.every(Number.isInteger)).length,112);
 for(const r of roots){assert.equal(dot(r,r),2);assert.ok(roots.some(s=>s.every((v,k)=>v===-r[k])));if(!r.every(Number.isInteger))assert.equal(r.filter(v=>v<0).length%2,0);}
});
test('E8 nearest-neighbor graph has 6720 exact edges and every root has 56 contacts',()=>{
 const roots=e8Roots(),edges=e8Contacts(roots),degrees=Array(240).fill(0);assert.equal(edges.length,6720);
 for(const[i,j]of edges){assert.equal(dot(roots[i],roots[j]),1);degrees[i]++;degrees[j]++;}assert.ok(degrees.every(d=>d===56));
 const keys=new Set(roots.map(r=>r.join(',')));for(const r of roots)for(const s of roots){const scalar=dot(r,s);assert.ok(keys.has(r.map((v,k)=>v-scalar*s[k]).join(',')));}
});
test('8D projection is deterministic and orthonormal; rotation preserves original lengths',()=>{
 const basis=projectionBasis8(42);assert.deepEqual(basis,projectionBasis8(42));assert.notDeepEqual(basis,projectionBasis8(43));
 for(let i=0;i<3;i++)for(let j=0;j<3;j++)assert.ok(Math.abs(dot(basis[i],basis[j])-(i===j?1:0))<1e-12);
 const roots=e8Roots(),a=projectRoots8(roots,basis,0,[0,3]),b=projectRoots8(roots,basis,Math.PI*2,[0,3]);for(let i=0;i<a.length;i++)assert.ok(Math.abs(a[i]-b[i])<1e-12);
 assert.ok(a.every(Number.isFinite));for(let i=0;i<240;i++)assert.ok(Math.hypot(...a.slice(i*3,i*3+3))<=Math.SQRT2+1e-12);
 assert.throws(()=>projectionBasis8(NaN));assert.throws(()=>projectRoots8(roots,basis,Infinity));assert.throws(()=>projectRoots8(roots,basis,1,[2,2]));assert.throws(()=>e8Contacts([[0]]));
});
test('E8 scene preserves 240 root instances, synchronizes neighbor picking and resets reproducibly',async()=>{
 const THREE=await import('../vendor/three.module.js'),{createExperiment}=await import('../src/experiments/e8.js');const scene=new THREE.Scene();let metrics;
 const instance=createExperiment({scene,seed:42,quality:'low',params:{},setCamera(){},onMetrics(v){metrics=v;}}),cloud=scene.children[0].getObjectByName('e8-roots'),initial=Array.from(cloud.instanceMatrix.array);
 assert.equal(cloud.count,240);assert.equal(metrics['选中根邻居'],'56');instance.update(.04);assert.notDeepEqual(Array.from(cloud.instanceMatrix.array),initial);instance.reset(42);assert.deepEqual(Array.from(cloud.instanceMatrix.array),initial);
 const hit=instance.pick({intersectObject:()=>[{instanceId:20}]});assert.deepEqual(hit.params,{selected:20});const neighbor=instance.action('neighbor');assert.notEqual(neighbor.params.selected,20);const roots=e8Roots();assert.equal(dot(roots[20],roots[neighbor.params.selected]),1);
 assert.equal(instance.action('projection').seed,43);assert.throws(()=>instance.setParameters({selected:1.5}));instance.dispose();assert.equal(scene.children.length,0);
});
