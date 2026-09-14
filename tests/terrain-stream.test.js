import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker as NodeWorker} from 'node:worker_threads';
import {build} from 'esbuild';
import {createTerrainGenerator, desiredTerrainChunks} from '../src/core/terrain-stream.js';

const request = {ix:0, iz:0, seed:42, layers:1, holes:1, resolution:8};
const mesh = () => ({positions:new Float32Array([0,0,0]), normals:new Float32Array([0,1,0]), indices:new Uint32Array()});

function fakeWorkerEnvironment(overrides = {}) {
  const instances = [], revoked = [];
  class FakeWorker {
    constructor(url) { this.url=url; this.listeners={}; this.messages=[]; this.terminated=false; instances.push(this); }
    addEventListener(type, fn) { this.listeners[type]=fn; }
    removeEventListener(type, fn) { if(this.listeners[type]===fn) delete this.listeners[type]; }
    postMessage(message) { this.messages.push(message); }
    terminate() { this.terminated=true; }
    emit(type, data) { this.listeners[type]?.(type==='message'?{data}:data); }
  }
  return {
    instances, revoked,
    options:{workerSource:'self.onmessage = () => {};', WorkerClass:FakeWorker,
      URLApi:{createObjectURL:()=> 'blob:terrain-test', revokeObjectURL:url=>revoked.push(url)},
      BlobClass:class BlobStub {}, ...overrides},
  };
}

test('terrain streaming covers a bounded corridor and crosses chunk boundaries predictably', () => {
  const initial=desiredTerrainChunks(0);
  assert.equal(initial.length,15);
  assert.equal(new Set(initial.map(chunk=>chunk.key)).size,15);
  assert.deepEqual(new Set(initial.map(chunk=>chunk.ix)),new Set([-1,0,1]));
  assert.deepEqual(new Set(initial.map(chunk=>chunk.iz)),new Set([-3,-2,-1,0,1]));
  assert.deepEqual(desiredTerrainChunks(23.999),initial);
  const next=desiredTerrainChunks(24);
  assert.equal(next.filter(chunk=>!initial.some(previous=>previous.key===chunk.key)).length,3);
  for(let distance=0;distance<100000;distance+=113) {
    const chunks=desiredTerrainChunks(distance);
    assert.equal(chunks.length,15);
    assert.equal(new Set(chunks.map(chunk=>chunk.key)).size,15);
    assert.ok(chunks.every(chunk=>Math.abs(chunk.iz+Math.floor(distance/24))<=3));
  }
});

test('terrain planner rejects invalid or unbounded inputs', () => {
  for(const distance of [NaN,Infinity,-1]) assert.throws(()=>desiredTerrainChunks(distance),RangeError);
  for(const settings of [{size:0},{columns:0},{columns:2},{columns:99},{ahead:-1},{behind:100},{ahead:1.5}]) {
    assert.throws(()=>desiredTerrainChunks(0,settings),RangeError);
  }
});

test('worker service returns transferable mesh payload and bounds outstanding work', async () => {
  const fake=fakeWorkerEnvironment();
  const service=createTerrainGenerator(fake.options);
  assert.equal(service.backend,'worker');
  const first=service.generate(request), second=service.generate({...request,iz:-1});
  await assert.rejects(service.generate({...request,iz:-2}),/queue.*full/i);
  const worker=fake.instances[0], result=mesh();
  worker.emit('message',{id:worker.messages[0].id,ok:true,result});
  assert.equal(await first,result);
  worker.emit('message',{id:worker.messages[1].id,ok:true,result:mesh()});
  await second;
  service.dispose();
  assert.equal(worker.terminated,true);
  assert.deepEqual(fake.revoked,['blob:terrain-test']);
});

test('disposal rejects pending jobs, detaches handlers and ignores late replies', async () => {
  const fake=fakeWorkerEnvironment();
  const service=createTerrainGenerator(fake.options), pending=service.generate(request);
  const rejection=assert.rejects(pending,{name:'AbortError'});
  const worker=fake.instances[0], savedListener=worker.listeners.message;
  service.dispose();
  service.dispose();
  savedListener({data:{id:worker.messages[0].id,ok:true,result:mesh()}});
  await rejection;
  assert.deepEqual(worker.listeners,{});
  assert.deepEqual(fake.revoked,['blob:terrain-test']);
  await assert.rejects(service.generate(request),{name:'AbortError'});
});

test('worker computation failures are surfaced and worker runtime failure rejects every job', async () => {
  const fake=fakeWorkerEnvironment();
  const service=createTerrainGenerator(fake.options), worker=fake.instances[0];
  const computation=service.generate(request);
  worker.emit('message',{id:worker.messages[0].id,ok:false,error:{name:'RangeError',message:'Invalid terrain resolution'}});
  await assert.rejects(computation,{name:'RangeError',message:'Invalid terrain resolution'});
  const a=service.generate(request), b=service.generate(request);
  const rejectedA=assert.rejects(a,/Worker exploded/), rejectedB=assert.rejects(b,/Worker exploded/);
  worker.emit('error',{message:'Worker exploded',preventDefault(){}});
  await Promise.all([rejectedA,rejectedB]);
  assert.equal(worker.terminated,true);
  await assert.rejects(service.generate(request),/Worker exploded/);
  service.dispose();
});

test('fallback schedules chunks outside the caller and cancellation prevents computation', async () => {
  const tasks=new Map(), status=[], cancelled=[];
  let taskID=0, computations=0;
  const service=createTerrainGenerator({WorkerClass:null,onStatus:value=>status.push(value),
    generateChunk:()=>{computations++;return mesh();},
    schedule:fn=>{tasks.set(++taskID,fn);return taskID;},
    cancelSchedule:id=>{cancelled.push(id);tasks.delete(id);}});
  assert.equal(service.backend,'main-thread');
  assert.equal(status[0].reason,'worker-unavailable');
  const completed=service.generate(request);
  assert.equal(computations,0);
  tasks.get(1)();
  assert.equal((await completed).positions.length,3);
  const pending=service.generate(request), rejection=assert.rejects(pending,{name:'AbortError'});
  service.dispose();
  await rejection;
  assert.equal(computations,1);
  assert.deepEqual(cancelled,[2]);
});

test('fallback preserves computation errors and constructor failure is observable', async () => {
  const fake=fakeWorkerEnvironment({WorkerClass:class {constructor(){throw new Error('Blocked by CSP');}}});
  const statuses=[];
  const service=createTerrainGenerator({...fake.options,onStatus:status=>statuses.push(status),
    generateChunk:()=>{throw new RangeError('Density failure');}});
  assert.equal(service.backend,'main-thread');
  assert.match(statuses[0].reason,/Blocked by CSP/);
  assert.deepEqual(fake.revoked,['blob:terrain-test']);
  await assert.rejects(service.generate(request),/Density failure/);
  service.dispose();
});

test('service rejects invalid requests without allocating jobs', async () => {
  const fake=fakeWorkerEnvironment(), service=createTerrainGenerator(fake.options);
  for(const options of [null,{...request,ix:NaN},{...request,seed:-1},{...request,layers:Infinity},{...request,resolution:3.5}]) {
    await assert.rejects(service.generate(options),/terrain|seed|layers|resolution|ix/i);
  }
  assert.equal(fake.instances[0].messages.length,0);
  service.dispose();
});

test('the bundled worker generates a real chunk through the transferable message protocol', {timeout:15000}, async () => {
  const output=await build({entryPoints:[new URL('../src/workers/terrain-worker.js',import.meta.url).pathname],
    bundle:true,format:'iife',platform:'browser',write:false,minify:true});
  const bridge=`const {parentPort}=require('node:worker_threads');
    globalThis.self={addEventListener(type,listener){if(type==='message')parentPort.on('message',data=>listener({data}));},
    postMessage(value,transfer){parentPort.postMessage(value,transfer);}};`;
  class BrowserWorkerAdapter {
    constructor(source) { this.worker=new NodeWorker(bridge+source,{eval:true});this.listeners=new Map(); }
    addEventListener(type,listener) {
      const wrapped=type==='message'?data=>listener({data}):listener;
      this.listeners.set(listener,wrapped);this.worker.on(type,wrapped);
    }
    removeEventListener(type,listener) { this.worker.off(type,this.listeners.get(listener));this.listeners.delete(listener); }
    postMessage(message) { this.worker.postMessage(message); }
    terminate() { return this.worker.terminate(); }
  }
  const service=createTerrainGenerator({workerSource:output.outputFiles[0].text,WorkerClass:BrowserWorkerAdapter,
    BlobClass:class {constructor(parts){this.source=parts.join('');}},
    URLApi:{createObjectURL:blob=>blob.source,revokeObjectURL(){}}});
  try {
    const result=await service.generate(request);
    assert.equal(service.backend,'worker');
    assert.ok(result.positions.length>0);
    assert.equal(result.normals.length,result.positions.length);
    assert.ok(result.occlusion instanceof Float32Array);
    assert.equal(result.occlusion.length,result.positions.length/3);
    assert.ok(result.occlusion.every(value=>Number.isFinite(value)&&value>=.25&&value<=1));
    assert.equal(result.indices.length/3,result.triangleCount);
    assert.ok(result.indices.every(index=>index<result.positions.length/3));
    assert.equal(service.pendingCount,0);
  } finally { service.dispose(); }
});
