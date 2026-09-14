import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import os from 'node:os';
import {definition} from '../src/experiments/iridescent-terrain.js';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const entry=new URL('../index.html',import.meta.url).href;
const output=new URL('../docs/qa/',import.meta.url);
const bundleBytes=await readFile(new URL('../dist/app.js',import.meta.url));
const bundle=JSON.parse(await readFile(new URL('../dist/manifest.json',import.meta.url)));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(bundleBytes),bundle.sha256,'Build manifest is stale; run npm run build');
await mkdir(output,{recursive:true});

const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-webgl','--ignore-gpu-blocklist']});
const errors=[],remoteRequests=[];
const report={
  started:new Date().toISOString(),browser:await browser.version(),bundleSha256:bundle.sha256,
  hardware:{cpu:os.cpus()[0]?.model,arch:os.arch(),platform:os.platform()},protocol:'file:',
  conditions:{headless:true,desktop:{width:1280,height:800,deviceScaleFactor:1},mobile:{width:390,height:844,deviceScaleFactor:2,touchEmulation:true},
    functionalClock:'Playwright virtual clock; not performance evidence',performanceClock:'Separate page with real wall-clock animation',
    limitations:'Touch runs emulate a phone on this desktop; no physical iOS/Android or sustained thermal performance is claimed.'},
  presets:[],parameterCases:[],streaming:[],switches:[],rapidCancellation:[],errors,remoteRequests,
};
const defaults=Object.fromEntries(definition.parameters.map(parameter=>[parameter.key,parameter.value]));
const state=page=>page.evaluate(()=>window.__FORMA__?.diagnostics);
const workers=page=>page.evaluate(()=>window.__TERRAIN_QA_WORKERS__.snapshot());
const virtualPages=new WeakSet();

async function prepare(options={},name='desktop',{virtual=true,disableWorkers=false}={}){
  const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1,reducedMotion:'reduce',acceptDownloads:true,...options});
  page.on('pageerror',error=>errors.push({page:name,type:'pageerror',message:error.message}));
  page.on('console',message=>{if(message.type()==='error')errors.push({page:name,type:'console',message:message.text()});});
  page.on('request',request=>{if(/^https?:/.test(request.url()))remoteRequests.push({page:name,url:request.url()});});
  await page.addInitScript(({disableWorkers})=>{
    const NativeWorker=globalThis.Worker;
    const active=new Set();let created=0,terminated=0,maximum=0;
    if(disableWorkers)globalThis.Worker=undefined;
    else if(NativeWorker){
      globalThis.Worker=class extends NativeWorker{
        constructor(...args){super(...args);created++;active.add(this);maximum=Math.max(maximum,active.size);}
        terminate(){if(active.delete(this))terminated++;return super.terminate();}
      };
    }
    Object.defineProperty(globalThis,'__TERRAIN_QA_WORKERS__',{value:{snapshot:()=>({created,terminated,active:active.size,maximum})}});
  },{disableWorkers});
  if(virtual){
    const epoch=new Date('2026-09-14T00:00:00Z');
    await page.clock.install({time:epoch});await page.clock.pauseAt(epoch);virtualPages.add(page);
  }
  return page;
}

// Browser time advances explicitly so debounce/fallback timers run under a paused clock.
// Node waits let real Worker messages arrive without assuming fixed machine speed.
async function advance(page,milliseconds=32){
  if(virtualPages.has(page))await page.clock.runFor(milliseconds);
  else await delay(milliseconds);
}
async function waitFor(page,predicate,label,timeout=60000){
  const end=Date.now()+timeout;
  while(Date.now()<end){
    const current=await state(page);
    assert(!current?.error,`${label}: ${JSON.stringify(current?.error)}`);
    if(predicate(current))return current;
    await advance(page,120);await delay(25);
  }
  throw new Error(`${label}: timed out; ${JSON.stringify(await state(page))}`);
}
async function ready(page,id='iridescent-terrain'){
  await waitFor(page,current=>current?.id===id&&current.ready,`${id} ready`);
  await advance(page);
  return state(page);
}
async function settled(page){
  const isSettled=current=>current?.id==='iridescent-terrain'&&current.ready&&
    /就绪$/.test(current.metrics['生成状态'])&&Number.parseInt(current.metrics['常驻地层'],10)===15;
  for(let attempt=0;attempt<8;attempt++){
    await waitFor(page,isSettled,'terrain settled');await advance(page);
    const current=await state(page);assert.equal(current.error,null);
    if(isSettled(current))return current;
  }
  throw new Error('Terrain did not stay settled long enough to render');
}
async function choose(page,id){
  await page.evaluate(id=>{location.hash=id;},id);await ready(page,id);
  return id==='iridescent-terrain'?settled(page):state(page);
}
async function click(page,selector){await page.locator(selector).evaluate(button=>button.click());await advance(page,160);}
async function setValue(page,key,value){
  await page.locator(`[data-parameter="${key}"]`).evaluate((element,value)=>{
    element.value=String(value);element.dispatchEvent(new Event('input',{bubbles:true}));
  },value);
  await advance(page,160);const current=await settled(page);
  assert.equal(current.params[key],value,`${key} was not applied`);return current;
}
async function restoreDefaults(page){
  await click(page,'#defaults-button');const current=await settled(page);
  assert.deepEqual(current.params,defaults);assert.equal(current.time,0);return current;
}
async function setSeed(page,seed){
  await page.locator('#seed').evaluate((element,seed)=>{
    element.value=String(seed);element.dispatchEvent(new Event('change',{bubbles:true}));
  },seed);
  await advance(page,160);const current=await settled(page);assert.equal(current.seed,seed);return current;
}
async function exportPNG(page){
  const pending=page.waitForEvent('download');await click(page,'#export-button');const download=await pending;
  const stream=await download.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);
  const bytes=Buffer.concat(chunks);assert.equal(await download.failure(),null);
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert(bytes.length>10000,'PNG is unexpectedly empty');
  return {filename:download.suggestedFilename(),bytes:bytes.length,sha256:hash(bytes)};
}
function resourceSnapshot(current){
  return {geometries:current.renderer.geometries,textures:current.renderer.textures,triangles:current.renderer.triangles,drawCalls:current.renderer.drawCalls};
}
function bounded(current,baseline){
  assert.equal(Number.parseInt(current.metrics['常驻地层'],10),15);
  assert(current.renderer.geometries<=baseline.geometries+3,'Resident geometry count grew beyond the bounded window');
  assert(current.renderer.textures<=baseline.textures+3,'Texture count grew beyond the baseline');
}
async function noOverflow(page){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Horizontal page overflow');}
function closeVector(actual,expected,label){
  assert.equal(actual.length,expected.length);
  actual.forEach((value,index)=>assert(Math.abs(value-expected[index])<1e-8,`${label}[${index}]: ${value} != ${expected[index]}`));
}
function cameraRadius(camera){return Math.hypot(...camera.position.map((value,index)=>value-camera.target[index]));}

try{
  const page=await prepare();await page.goto(`${entry}#iridescent-terrain`,{waitUntil:'load'});await ready(page);
  const initial=await settled(page);
  assert.deepEqual(initial.params,defaults);assert.equal(initial.seed,42);assert.equal(initial.quality,'high');
  assert.equal(initial.paused,true);assert.equal(initial.cameraMotion,false);assert.match(initial.metrics['生成状态'],/^后台生成/);
  assert.equal((await workers(page)).active,1);
  const baseline=resourceSnapshot(initial);report.initial={params:initial.params,metrics:initial.metrics,resources:baseline,workers:await workers(page)};
  await noOverflow(page);
  console.log('terrain: offline initialization, worker and 15 chunks ready');

  for(const preset of definition.presets){
    const before=(await state(page)).params;
    await click(page,`[data-preset="${preset.label}"]`);const current=await settled(page);
    assert.deepEqual(current.params,{...before,...preset.params});assert.equal(current.time,0);
    assert.equal(await page.locator(`[data-preset="${preset.label}"]`).getAttribute('aria-pressed'),'true');
    bounded(current,baseline);report.presets.push({label:preset.label,params:current.params,metrics:current.metrics});
  }

  for(const parameter of definition.parameters){
    for(const value of [parameter.min,parameter.max]){
      await restoreDefaults(page);const current=await setValue(page,parameter.key,value);bounded(current,baseline);
      report.parameterCases.push({key:parameter.key,value,resources:resourceSnapshot(current),metrics:current.metrics});
    }
  }
  console.log('terrain: 3 presets and 10 parameter endpoints passed');

  await restoreDefaults(page);await setSeed(page,42);await click(page,'#camera-reset');
  const original=await exportPNG(page),originalCamera=(await state(page)).camera;
  await setSeed(page,314159);const changed=await exportPNG(page);assert.notEqual(changed.sha256,original.sha256,'Changing seed did not change the rendered terrain');
  await setSeed(page,42);const restored=await exportPNG(page);assert.equal(restored.sha256,original.sha256,'The original seed did not reproduce the fixed-camera PNG');
  await click(page,'#reset-button');await settled(page);const reset=await exportPNG(page);
  assert.equal(reset.sha256,original.sha256,'Reset did not reproduce the initial PNG');assert.deepEqual((await state(page)).camera,originalCamera);
  report.reproducibility={original,changed,restored,reset,seed:42,camera:originalCamera,pixelScope:'Same browser session, fixed camera, paused scene, canvas PNG export'};
  await advance(page,3600);assert(await page.locator('#toast').isHidden());
  await page.screenshot({path:new URL('terrain-desktop.png',output).pathname,animations:'disabled'});
  console.log('terrain: seed and reset PNG reproducibility passed');

  await click(page,'[data-action="new-world"]');const newWorld=await settled(page);
  assert.equal(newWorld.seed,(42+2654435761)>>>0);report.newWorldSeed=newWorld.seed;
  await setSeed(page,42);await setValue(page,'speed',6);
  await click(page,'#play-button');
  for(let step=0;step<80;step++){
    await advance(page,500);const current=await settled(page);bounded(current,baseline);
    report.streaming.push({distance:Number.parseFloat(current.metrics['已穿行']),time:current.time,...resourceSnapshot(current),workers:await workers(page)});
    if(Number.parseFloat(current.metrics['已穿行'])>72)break;
  }
  assert(report.streaming.at(-1).distance>72,'Flight did not cross three chunk boundaries');
  await click(page,'#play-button');const paused=await settled(page);await advance(page,600);const held=await state(page);
  assert.equal(held.time,paused.time);assert.equal(held.metrics['已穿行'],paused.metrics['已穿行']);assert.deepEqual(held.camera,paused.camera);
  await click(page,'#reset-button');const flightReset=await settled(page);assert.equal(Number.parseFloat(flightReset.metrics['已穿行']),0);
  report.pauseAndReset={heldTime:held.time,heldDistance:held.metrics['已穿行'],resetDistance:flightReset.metrics['已穿行'],stableCamera:true};
  await restoreDefaults(page);
  console.log(`terrain: streamed ${report.streaming.at(-1).distance} m with bounded resources`);

  for(let index=0;index<20;index++){
    const id=index%2===0?'e8':'iridescent-terrain';const current=await choose(page,id),workerState=await workers(page);
    assert.equal(workerState.active,id==='iridescent-terrain'?1:0,`${id}: lingering Worker after switching`);
    if(id==='iridescent-terrain')bounded(current,baseline);
    report.switches.push({index,id,...resourceSnapshot(current),workers:workerState});
  }
  const terrainRounds=report.switches.filter(item=>item.id==='iridescent-terrain');
  const e8Rounds=report.switches.filter(item=>item.id==='e8');
  for(const rounds of [terrainRounds,e8Rounds]){
    for(const item of rounds.slice(1)){
      assert.equal(item.geometries,rounds[0].geometries,'Geometry count changed between identical settled scenes');
      assert.equal(item.textures,rounds[0].textures,'Texture count changed between identical settled scenes');
    }
  }
  console.log('terrain: 20 scene switches kept identical settled resource counts');

  const rapid=await prepare({},'rapid-cancel');await rapid.goto(`${entry}#e8`,{waitUntil:'load'});await ready(rapid,'e8');
  for(let attempt=0;attempt<4;attempt++){
    const before=await workers(rapid);await rapid.evaluate(()=>{location.hash='iridescent-terrain';});
    const deadline=Date.now()+10000;
    while((await workers(rapid)).created===before.created){assert(Date.now()<deadline,'Terrain worker did not start');await delay(10);}
    const loading=await state(rapid);assert.equal(loading.id,'iridescent-terrain');assert.equal(loading.ready,false,'Rapid switch must interrupt initial generation');
    await choose(rapid,'e8');await advance(rapid,500);await delay(100);
    const after=await workers(rapid);assert.equal(after.active,0);assert.equal(after.created,after.terminated);
    assert.equal((await state(rapid)).id,'e8');report.rapidCancellation.push(after);
  }
  await rapid.close();
  console.log('terrain: 4 initial-generation cancellations released all workers');

  const mobile=await prepare({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true},'mobile');
  await mobile.goto(`${entry}#iridescent-terrain`,{waitUntil:'load'});await ready(mobile);const mobileInitial=await settled(mobile);
  assert.equal(mobileInitial.quality,'low');await noOverflow(mobile);
  closeVector(mobileInitial.camera.position,originalCamera.position,'Portrait camera position');
  closeVector(mobileInitial.camera.target,originalCamera.target,'Portrait camera target');
  const canvasBounds=await mobile.locator('#canvas-host canvas').boundingBox();
  const dragX=canvasBounds.x+canvasBounds.width*.72,dragY=canvasBounds.y+canvasBounds.height*.57;
  await mobile.mouse.move(dragX,dragY);await mobile.mouse.down();
  await mobile.mouse.move(dragX-65,dragY+28,{steps:8});await mobile.mouse.up();await advance(mobile);
  const draggedCamera=(await state(mobile)).camera;assert.notDeepEqual(draggedCamera,mobileInitial.camera,'Orbit drag did not change the camera');
  await mobile.setViewportSize({width:844,height:390});await advance(mobile,160);
  await click(mobile,'#camera-reset');const landscapeReset=(await state(mobile)).camera;
  closeVector(landscapeReset.position,originalCamera.position,'Landscape camera reset');
  assert(Math.abs(cameraRadius(landscapeReset)-cameraRadius(originalCamera))<1e-8,'Landscape reset changed the default camera radius');
  await mobile.setViewportSize({width:390,height:844});await advance(mobile,160);
  await click(mobile,'#camera-reset');const portraitReset=(await state(mobile)).camera;
  closeVector(portraitReset.position,originalCamera.position,'Portrait camera reset');await noOverflow(mobile);
  const mobilePresets=[];
  for(const preset of definition.presets){
    await mobile.locator(`[data-preset="${preset.label}"]`).tap();await advance(mobile,160);const current=await settled(mobile);
    for(const [key,value]of Object.entries(preset.params))assert.equal(current.params[key],value);
    mobilePresets.push({label:preset.label,params:current.params});
  }
  await mobile.locator('#mobile-controls').tap();await mobile.locator('#theory-tab').tap();
  assert(await mobile.locator('#limitations').isVisible());const sources=await mobile.locator('#sources a').count();assert(sources>=2);
  await mobile.locator('[data-close="inspector"]').tap();await restoreDefaults(mobile);await noOverflow(mobile);
  const mobilePNG=await exportPNG(mobile);await advance(mobile,3600);assert(await mobile.locator('#toast').isHidden());
  await mobile.screenshot({path:new URL('terrain-mobile.png',output).pathname,animations:'disabled'});
  report.mobile={quality:mobileInitial.quality,presets:mobilePresets,theoryDrawer:true,sourceLinks:sources,horizontalOverflow:false,png:mobilePNG,resources:resourceSnapshot(await state(mobile)),
    camera:{desktopDefault:originalCamera,portraitDefault:mobileInitial.camera,dragged:draggedCamera,landscapeReset,portraitReset,
      radius:cameraRadius(portraitReset),matchedWithin:1e-8,orbitDragInput:'Mouse pointer on touch-emulated page; preset and drawer actions use touch'}};
  await mobile.close();
  console.log('terrain: touch emulation and mobile PNG export passed');

  const fallback=await prepare({viewport:{width:390,height:844}},'fallback',{disableWorkers:true});
  await fallback.goto(`${entry}#iridescent-terrain`,{waitUntil:'load'});await ready(fallback);const compatible=await settled(fallback);
  assert.match(compatible.metrics['生成状态'],/^兼容生成/);assert.equal((await workers(fallback)).created,0);
  await choose(fallback,'e8');report.fallback={ready:true,quality:compatible.quality,metrics:compatible.metrics,workers:await workers(fallback)};await fallback.close();

  const performancePage=await prepare({},'performance',{virtual:false});
  await performancePage.goto(`${entry}#iridescent-terrain`,{waitUntil:'load'});await ready(performancePage);await settled(performancePage);
  const startState=await state(performancePage),start=Date.now();await click(performancePage,'#play-button');
  await delay(5000);const running=await state(performancePage);await click(performancePage,'#play-button');
  assert(running.time>startState.time);assert(Number.isFinite(running.fps)&&running.fps>0);
  report.performance={wallMilliseconds:Date.now()-start,simulationSeconds:running.time-startState.time,fpsSample:running.fps,quality:running.quality,
    viewport:{width:1280,height:800},deviceScaleFactor:1,headless:true,resources:resourceSnapshot(running),metrics:running.metrics,
    scope:'Approximately five seconds of real-clock headless Chrome playback; the app FPS is a short rolling sample, not a sustained-device guarantee.'};
  await performancePage.close();

  await choose(page,'e8');report.finalWorkers=await workers(page);assert.equal(report.finalWorkers.active,0);
  assert.deepEqual(errors,[]);assert.deepEqual(remoteRequests,[]);report.passed=true;
}catch(error){report.passed=false;report.failure=error.stack;process.exitCode=1;}
finally{
  report.finished=new Date().toISOString();
  await writeFile(new URL('terrain-report.json',output),`${JSON.stringify(report,null,2)}\n`);
  console.log(JSON.stringify({passed:report.passed,presets:report.presets.length,parameterCases:report.parameterCases.length,switches:report.switches.length,
    streamingSamples:report.streaming.length,rapidCancellation:report.rapidCancellation.length,performance:report.performance,errors,remoteRequests,failure:report.failure},null,2));
  await browser.close();
}
