import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateGraph,cutWeight,improveColoring} from '../src/math/maxcut.js';
const graph=JSON.parse(readFileSync(new URL('../data/maxcut.json',import.meta.url)));
test('paper appendix C.1 fixture has 19 vertices,155 edges,total weight52941',()=>{
 assert.equal(validateGraph(graph),52941);
 assert.equal(graph.vertices,19);assert.equal(graph.edges.length,155);
 assert.equal(createHash('sha256').update(JSON.stringify(graph.edges)).digest('hex'),'831a810297e5bea20a22434785e15dd80dbaf33e69fc6f667c3bce4e70b685ff');
});
test('weighted cut uses all edges and is invariant under color relabeling',()=>{
 const colors=Array.from({length:19},(_,i)=>i%4);
 assert.equal(cutWeight(graph,Array(19).fill(0)),0);
 const expected=graph.edges.reduce((s,[a,b,w])=>s+(colors[a-1]!==colors[b-1]?w:0),0);
 assert.equal(cutWeight(graph,colors),expected);
 assert.equal(cutWeight(graph,colors.map(c=>(c+1)%4)),expected);
 const next=improveColoring(graph,colors);assert.ok(cutWeight(graph,next)>=expected);
});
test('invalid graph and coloring inputs reject',()=>{
 assert.throws(()=>validateGraph({vertices:2,edges:[[1,1,3]]}));
 assert.throws(()=>cutWeight(graph,[0]));
});
test('MAXCUT layout changes are visible even when update dt is zero',async()=>{
 const THREE=await import('../vendor/three.module.js');const {createExperiment}=await import('../src/experiments/maxcut.js');
 const originalFetch=globalThis.fetch,originalDocument=globalThis.document;
 globalThis.fetch=async()=>({ok:true,json:async()=>graph});globalThis.document={createElement:()=>({getContext:()=>({fillText(){}})})};
 try{
  const scene=new THREE.Scene(),experiment=await createExperiment({scene,params:{},seed:42,onMetrics(){},setCamera(){}});
  const node=scene.children[0].children[0],before=node.position.toArray();experiment.setParameters({layout:'groups'});experiment.update(0);
  assert.notDeepEqual(node.position.toArray(),before);experiment.dispose();
 }finally{globalThis.fetch=originalFetch;globalThis.document=originalDocument;}
});
