import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {createExperiment} from '../src/experiments/iridescent-terrain.js';

const shape = () => ({positions:new Float32Array([0,0,0,1,0,0,0,1,0]),
  normals:new Float32Array([0,0,1,0,0,1,0,0,1]),indices:new Uint32Array([0,1,2])});
const flush = async () => { for(let i=0;i<8;i++) await Promise.resolve(); };
const sceneMeshes = scene => {const meshes=[];scene.traverse(object=>{if(object.isMesh)meshes.push(object);});return meshes;};

function fakeGenerators() {
  const services=[];
  const factory=()=>{
    const service={backend:'worker',jobs:[],requests:[],disposed:false,disposeCount:0,
      generate(options){
        this.requests.push(options);
        return new Promise((resolve,reject)=>this.jobs.push({options,resolve,reject}));
      },
      dispose(){
        if(this.disposed)return;
        this.disposed=true;this.disposeCount++;
        const error=this.disposeError||Object.assign(new Error('Scene cancelled'),{name:'AbortError'});
        for(const job of this.jobs.splice(0))job.reject(error);
      },
    };
    services.push(service);return service;
  };
  return {services,factory};
}

async function drain(service,limit=30) {
  for(let i=0;i<limit;i++) {
    await flush();
    const job=service.jobs.shift();
    if(!job)return;
    job.resolve(shape());
  }
  await flush();
  assert.equal(service.jobs.length,0,'generator must have a bounded batch');
}

function setup(t) {
  t.mock.timers.enable({apis:['setTimeout']});
  const controller=new AbortController(), scene=new THREE.Scene(), errors=[], statuses=[];
  const previousEnvironment=new THREE.Texture(), previousBackground=new THREE.Color(0x123456);
  scene.environment=previousEnvironment;scene.background=previousBackground;
  const fakes=fakeGenerators();
  const pending=createExperiment({scene,signal:controller.signal,quality:'low',seed:42,params:{speed:6},
    setCamera(){},onMetrics:value=>statuses.push(value),onError:error=>errors.push(error)},
    {generatorFactory:fakes.factory});
  pending.catch(()=>{});
  t.after(async()=>{controller.abort();await pending.catch(()=>{});previousEnvironment.dispose();});
  assert.equal(fakes.services.length,1,'scene must use the injectable generator');
  return {controller,scene,errors,statuses,previousEnvironment,previousBackground,...fakes,pending};
}

test('an abort during initial async generation releases scene resources and rejects initialization',async t=>{
  const state=setup(t), service=state.services[0], lateJob=service.jobs[0];
  state.controller.abort();
  await assert.rejects(state.pending,{name:'AbortError'});
  lateJob.resolve(shape());await flush();
  assert.equal(service.disposeCount,1);
  assert.equal(state.scene.children.length,0);
  assert.equal(state.scene.environment,state.previousEnvironment);
  assert.equal(state.scene.background,state.previousBackground);
  assert.equal(state.errors.length,0);
});

test('regeneration retains the visible world and atomically replaces at most fifteen meshes',async t=>{
  const state=setup(t);await drain(state.services[0]);const instance=await state.pending;
  const previous=sceneMeshes(state.scene);assert.equal(previous.length,15);
  let disposed=0;previous.forEach(mesh=>mesh.geometry.addEventListener('dispose',()=>disposed++));
  instance.setParameters({layers:1.2});
  t.mock.timers.tick(100);await flush();
  const replacement=state.services[1];
  for(let i=0;i<14;i++){
    replacement.jobs.shift().resolve(shape());await flush();
    assert.deepEqual(sceneMeshes(state.scene),previous);
    assert.equal(disposed,0);
  }
  await drain(replacement);
  assert.equal(sceneMeshes(state.scene).length,15);
  assert.equal(disposed,15);
  assert.ok(sceneMeshes(state.scene).every(mesh=>!previous.includes(mesh)));
});

test('superseding an in-progress rebuild ignores its late failure and commits only the latest parameters',async t=>{
  const state=setup(t);await drain(state.services[0]);const instance=await state.pending;
  instance.setParameters({layers:1.2});t.mock.timers.tick(100);await flush();
  const stale=state.services[1];stale.jobs.shift().resolve(shape());await flush();
  stale.disposeError=new Error('Superseded worker failure');
  instance.setParameters({layers:1.4});await flush();
  assert.equal(state.errors.length,0);
  assert.doesNotThrow(()=>instance.update(0));
  t.mock.timers.tick(100);await flush();await drain(state.services[2]);
  assert.ok(state.services[2].requests.every(request=>request.layers===1.4));
  assert.equal(sceneMeshes(state.scene).length,15);
  assert.equal(state.errors.length,0);
});

test('reset after travelling preserves the current view until the new origin is ready',async t=>{
  const state=setup(t);await drain(state.services[0]);const instance=await state.pending;
  for(let step=0;step<500;step++) {instance.update(.05);await drain(state.services[0]);}
  const before=sceneMeshes(state.scene),positions=before.map(mesh=>mesh.position.z);
  assert.ok(before.every(mesh=>mesh.userData.chunk.iz<0));
  instance.reset(73);instance.update(0);
  assert.deepEqual(sceneMeshes(state.scene),before);
  assert.deepEqual(before.map(mesh=>mesh.position.z),positions);
  t.mock.timers.tick(100);await flush();await drain(state.services[1]);
  const after=sceneMeshes(state.scene);
  assert.equal(after.length,15);
  assert.ok(after.some(mesh=>mesh.userData.chunk.iz===1));
  assert.ok(state.services[1].requests.every(request=>request.seed===73));
  assert.equal(state.statuses.at(-1)['已穿行'],'0.0 m');
});

test('prefetch keeps flight moving and atomically swaps one row with at most eighteen owned meshes',async t=>{
  const owned=new Set(), originalSetIndex=THREE.BufferGeometry.prototype.setIndex;
  t.mock.method(THREE.BufferGeometry.prototype,'setIndex',function(value){
    owned.add(this);this.addEventListener('dispose',()=>owned.delete(this));
    return originalSetIndex.call(this,value);
  });
  const state=setup(t);await drain(state.services[0]);const instance=await state.pending;
  const service=state.services[0],original=sceneMeshes(state.scene);
  for(let step=0;step<41;step++)instance.update(.05);
  assert.equal(service.requests.length,16,'one pending row starts about twelve metres before the boundary');
  assert.equal(service.jobs.length,1);
  const start=original[0].position.z;
  for(let step=0;step<20;step++)instance.update(.05);
  assert.ok(Math.abs(original[0].position.z-start-6)<1e-8,'flight continues while the row is generated');
  assert.deepEqual(sceneMeshes(state.scene),original);
  await drain(service);
  assert.equal(service.requests.length,18);
  assert.equal(owned.size,18,'only three additional meshes may be staged');
  assert.deepEqual(sceneMeshes(state.scene),original,'prefetched row remains unmounted before the boundary');
  for(let step=0;step<20;step++)instance.update(.05);
  const current=sceneMeshes(state.scene);
  assert.equal(current.length,15);
  assert.equal(owned.size,15);
  assert.equal(current.filter(mesh=>original.includes(mesh)).length,12);
  assert.equal(current.filter(mesh=>mesh.userData.chunk.iz===-4).length,3);
  assert.ok(current.every(mesh=>mesh.userData.chunk.iz<=0));
  assert.equal(service.jobs.length,0);
  assert.equal(state.statuses.at(-1)['已穿行'],'24.3 m');
});

test('an unfinished prefetched row pauses only at the boundary and never removes visible chunks',async t=>{
  const state=setup(t);await drain(state.services[0]);const instance=await state.pending;
  const original=sceneMeshes(state.scene),service=state.services[0];
  for(let step=0;step<100;step++)instance.update(.05);
  assert.equal(service.jobs.length,1);
  assert.equal(state.statuses.at(-1)['已穿行'],'24.0 m');
  const frozen=original.map(mesh=>mesh.position.z);
  for(let step=0;step<1000;step++)instance.update(.05);
  assert.deepEqual(sceneMeshes(state.scene),original);
  assert.deepEqual(original.map(mesh=>mesh.position.z),frozen);
  service.jobs.shift().resolve(shape());await flush();
  service.jobs.shift().resolve(shape());await flush();
  assert.deepEqual(sceneMeshes(state.scene),original,'a partial row must not create a gap or mount early');
  await drain(service);
  const current=sceneMeshes(state.scene);
  assert.equal(current.length,15);
  assert.equal(current.filter(mesh=>original.includes(mesh)).length,12);
  assert.equal(state.statuses.at(-1)['已穿行'],'24.0 m');
  instance.update(.05);
  assert.equal(state.statuses.at(-1)['已穿行'],'24.3 m');
});

test('prefetch failures are reported without removing the mounted window',async t=>{
  const state=setup(t);await drain(state.services[0]);const instance=await state.pending;
  const original=sceneMeshes(state.scene),service=state.services[0];
  for(let step=0;step<41;step++)instance.update(.05);
  service.jobs.shift().reject(new Error('Stream generation failed'));await flush();
  assert.equal(state.errors.length,1);
  assert.match(state.errors[0].message,/Stream generation failed/);
  assert.throws(()=>instance.update(0),/Stream generation failed/);
  assert.deepEqual(sceneMeshes(state.scene),original);
  state.controller.abort();assert.equal(state.scene.children.length,0);
});

test('reset and abort dispose staged chunks and reject late prefetched work',async t=>{
  const owned=new Set(),originalSetIndex=THREE.BufferGeometry.prototype.setIndex;
  t.mock.method(THREE.BufferGeometry.prototype,'setIndex',function(value){
    owned.add(this);this.addEventListener('dispose',()=>owned.delete(this));
    return originalSetIndex.call(this,value);
  });
  const state=setup(t);await drain(state.services[0]);const instance=await state.pending;
  const original=sceneMeshes(state.scene),service=state.services[0];
  for(let step=0;step<41;step++)instance.update(.05);
  service.jobs.shift().resolve(shape());await flush();
  assert.equal(owned.size,16);
  const late=service.jobs[0];
  instance.reset(73);await flush();
  assert.equal(owned.size,15);
  assert.deepEqual(sceneMeshes(state.scene),original);
  late.resolve(shape());await flush();assert.equal(owned.size,15);
  assert.equal(state.errors.length,0);
  t.mock.timers.tick(100);await flush();await drain(state.services[1]);
  for(let step=0;step<41;step++)instance.update(.05);
  state.services[1].jobs.shift().resolve(shape());await flush();
  assert.equal(owned.size,16);
  state.controller.abort();await flush();
  assert.equal(owned.size,0);
  assert.equal(state.scene.children.length,0);
});

test('active rebuild failure is reported while a disposed rebuild cannot restore geometry',async t=>{
  const state=setup(t);await drain(state.services[0]);const instance=await state.pending;
  instance.setParameters({holes:1.5});t.mock.timers.tick(100);await flush();
  state.services[1].jobs.shift().reject(new Error('New world failed'));await flush();
  assert.equal(state.errors.length,1);
  assert.equal(sceneMeshes(state.scene).length,15);
  assert.throws(()=>instance.update(0),/New world failed/);
  instance.dispose();instance.dispose();
  assert.equal(state.services[1].disposeCount,1);
  assert.equal(state.scene.children.length,0);
});
