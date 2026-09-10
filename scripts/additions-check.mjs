import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import os from 'node:os';
import {catalog,loadExperiment} from '../src/catalog.js';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const ids=['real-kakeya','boltzmann','torus-knot','moduli','noperthedron','e8','matroid'];
const entry=new URL('../index.html',import.meta.url).href;
const output=new URL('../docs/qa/',import.meta.url);await mkdir(output,{recursive:true});
const bundle=JSON.parse(await readFile(new URL('../dist/manifest.json',import.meta.url)));
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-webgl','--ignore-gpu-blocklist']});
const errors=[],remoteRequests=[];
const report={started:new Date().toISOString(),browser:await browser.version(),hardware:{cpu:os.cpus()[0].model,arch:os.arch(),platform:os.platform()},bundleSha256:bundle.sha256,protocol:'file:',desktop:[],resourceRounds:[],mobile:[],errors,remoteRequests};
function observe(page){page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{if(/^https?:/.test(r.url()))remoteRequests.push(r.url());});}
const diagnostics=page=>page.evaluate(()=>window.__FORMA__.diagnostics);
async function ready(page,id){await page.waitForFunction(id=>window.__FORMA__?.diagnostics.id===id&&(window.__FORMA__.diagnostics.ready||window.__FORMA__.diagnostics.error),id);const d=await diagnostics(page);assert(d.ready&&!d.error,`${id}: ${JSON.stringify(d.error)}`);}
async function choose(page,id){await page.evaluate(id=>location.hash=id,id);await ready(page,id);}
async function defaults(page,id){await page.locator('#defaults-button').evaluate(b=>b.click());await ready(page,id);await page.waitForTimeout(32);}
async function setValue(page,key,value){
  const applied=await page.locator(`[data-parameter="${key}"]`).evaluate((el,value)=>{el.value=String(value);el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));return typeof value==='number'?Number(el.value):el.value;},value);
  await page.waitForTimeout(32);const d=await diagnostics(page);assert.equal(d.error,null);assert.equal(d.params[key],applied,`${d.id}: ${key} did not reach the model`);
}
async function exportPNG(page){const pending=page.waitForEvent('download');await page.locator('#export-button').click();const download=await pending,stream=await download.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);const bytes=Buffer.concat(chunks);assert.equal(await download.failure(),null);assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert(bytes.length>10000);return bytes.length;}
function assertAction(id,key,before,after){
  if(id==='torus-knot'&&key==='opposite')assert.equal(after.params.second,(before.params.first+.5)%1);
  if(id==='real-kakeya'&&key==='next')assert.notEqual(after.params.direction,before.params.direction);
  if(id==='real-kakeya'&&key==='axis')assert.notDeepEqual(after.camera,before.camera);
  if(id==='boltzmann'&&key==='collision')assert(Number(after.metrics['粒子碰撞次数'])>Number(before.metrics['粒子碰撞次数']));
  if(id==='moduli'&&['S','T'].includes(key))assert.notEqual(after.metrics['当前 SL₂ 基变换'],before.metrics['当前 SL₂ 基变换']);
  if(id==='moduli'&&key==='cm')assert.notDeepEqual(after.params,before.params);
  if(id==='noperthedron'&&key==='align'){assert.equal(after.params.innerTheta,after.params.outerTheta);assert.equal(after.params.innerPhi,after.params.outerPhi);assert.equal(after.params.scan,0);}
  if(id==='e8'&&key==='projection')assert.equal(after.seed,(before.seed+1)>>>0);
  if(id==='e8'&&key==='neighbor')assert.notEqual(after.params.selected,before.params.selected);
  if(id==='matroid'&&key==='toggle')assert.equal(after.params.selection,before.params.selection^(1<<Number(before.params.edge)));
  if(id==='matroid'&&key==='clear')assert.equal(after.params.selection,0);
}
try{
  const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1,reducedMotion:'reduce',acceptDownloads:true});observe(page);await page.goto(entry);await ready(page,'navier');
  for(const id of ids){
    const {definition}=await loadExperiment(id);await choose(page,id);await defaults(page,id);
    const item={id,parameterCases:0,actions:[],exports:0};
    for(const p of definition.parameters){
      const values=p.type==='select'?p.options.map(o=>o.value):[p.min,p.max];
      for(const value of values){await defaults(page,id);await setValue(page,p.key,value);item.parameterCases++;}
    }
    for(const action of definition.actions||[]){await defaults(page,id);const before=await diagnostics(page);await page.locator(`[data-action="${action.key}"]`).evaluate(b=>b.click());await page.waitForTimeout(32);const after=await diagnostics(page);assert.equal(after.error,null,`${id}/${action.key}`);assertAction(id,action.key,before,after);item.actions.push(action.key);}
    if(id==='moduli'){
      await defaults(page,id);await page.locator('[data-action="T"]').evaluate(b=>b.click());const transformed=await diagnostics(page);
      await setValue(page,'surface','cycles');await setValue(page,'extent',6);const displayed=await diagnostics(page);
      assert.equal(displayed.metrics['当前 τ'],transformed.metrics['当前 τ']);assert.equal(displayed.metrics['当前 SL₂ 基变换'],transformed.metrics['当前 SL₂ 基变换']);
      await page.locator('[data-action="T"]').evaluate(b=>{for(let i=0;i<128;i++)b.click();});await page.waitForTimeout(100);
      const repeated=await diagnostics(page);assert.equal(repeated.error,null);assert(repeated.renderer.geometries<150,'Modular grid must remain bounded after repeated T');item.repeatedTransformCount=129;
    }
    await defaults(page,id);
    const paused=await diagnostics(page);await page.waitForTimeout(80);assert.equal((await diagnostics(page)).time,paused.time);
    await page.locator('#play-button').click();await page.waitForTimeout(1800);await page.locator('#play-button').click();
    const running=await diagnostics(page);assert(running.time>0);assert.equal(running.error,null);item.fps=running.fps;item.quality=running.quality;item.metrics=running.metrics;
    await page.locator('#reset-button').click();await page.waitForTimeout(32);assert.equal((await diagnostics(page)).time,0);
    item.pngBytes=await exportPNG(page);item.exports=1;
    await page.locator('#mobile-controls').click();await page.locator('#theory-tab').click();assert(await page.locator('#limitations').isVisible());
    item.sourceCount=await page.locator('#sources a').count();assert(item.sourceCount>0);await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    report.desktop.push(item);console.log(`${id}: ${item.parameterCases} parameter cases, ${item.actions.length} actions, PNG ${item.pngBytes} bytes`);
  }
  for(let round=0;round<3;round++){
    const values=[];
    for(const {id} of catalog){await choose(page,id);await defaults(page,id);const d=await diagnostics(page);assert(d.renderer);values.push({id,geometries:d.renderer.geometries,textures:d.renderer.textures});}
    report.resourceRounds.push(values);
  }
  assert.deepEqual(report.resourceRounds[2],report.resourceRounds[1],'GPU resource counts grew after warm-up');
  const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'reduce'});observe(mobile);await mobile.goto(entry);await ready(mobile,'navier');
  for(const id of ids){
    await choose(mobile,id);await defaults(mobile,id);const d=await diagnostics(mobile);assert.equal(d.quality,'low');
    const overflow=await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);
    await mobile.screenshot({path:new URL(`${id}-mobile.png`,output).pathname});
    report.mobile.push({id,ready:d.ready,quality:d.quality,overflow});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(remoteRequests,[]);report.passed=true;
}catch(error){report.passed=false;report.failure=error.stack;process.exitCode=1;}
finally{await writeFile(new URL('additions-report.json',output),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,desktop:report.desktop.length,mobile:report.mobile.length,switches:report.resourceRounds.length*catalog.length,failure:report.failure,errors},null,2));await browser.close();}
