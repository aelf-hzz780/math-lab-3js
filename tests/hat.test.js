import test from 'node:test';
import assert from 'node:assert/strict';
import {generateHatPatch,polygonArea} from '../src/math/hat.js';
test('author H metatile substitution matches exact first four leaf counts',()=>{
 assert.deepEqual([0,1,2,3].map(n=>generateHatPatch(n).length),[4,25,169,1156]);
});
test('Hat patch keeps equal tile area,13 vertices and reflected copies',()=>{
 const tiles=generateHatPatch(2),areas=tiles.map(t=>polygonArea(t.vertices));
 assert.ok(areas.every(a=>Math.abs(Math.abs(a)-Math.abs(areas[0]))<1e-8));
 assert.ok(areas.some(a=>a>0)&&areas.some(a=>a<0));
 assert.ok(tiles.every(t=>t.vertices.length===13 && t.vertices.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))));
 assert.equal(new Set(tiles.map(t=>t.vertices.map(p=>[p.x.toFixed(6),p.y.toFixed(6)]).join(';'))).size,169);
});
test('Hat depth limit bounds resource use',()=>assert.throws(()=>generateHatPatch(8),/depth/));
test('Hat is complete while paused on initial load and reset; growth is explicit',async()=>{
 const THREE=await import('../vendor/three.module.js');const {createExperiment}=await import('../src/experiments/hat.js');
 const scene=new THREE.Scene(),experiment=createExperiment({scene,params:{depth:'0'},onMetrics(){},setCamera(){}});
 const material=scene.children[0].children[0].material;
 const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <clipping_planes_fragment>'};material.onBeforeCompile(shader);
 experiment.update(0);assert.ok(shader.uniforms.uGrowth.value>=1);
 experiment.action('grow');experiment.update(0);assert.equal(shader.uniforms.uGrowth.value,0);
 experiment.reset();experiment.update(0);assert.ok(shader.uniforms.uGrowth.value>=1);experiment.dispose();
});
