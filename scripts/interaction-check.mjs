import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {catalog} from '../src/catalog.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const output=fileURLToPath(new URL('../docs/qa/',import.meta.url));await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-webgl','--ignore-gpu-blocklist']});
const errors=[],externalRequests=[];
const report={started:new Date().toISOString(),browser:await browser.version(),controls:[],resources:[],mobile:[],errors,externalRequests};
const ids=catalog.map(item=>item.id);
function observe(page){page.on('pageerror',error=>errors.push(error.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Error creating WebGL context'))errors.push(m.text());});page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4174/')&&!r.url().startsWith('data:'))externalRequests.push(r.url());});}
async function ready(page,id){await page.waitForFunction(id=>window.__FORMA__?.diagnostics.id===id&&(window.__FORMA__.diagnostics.ready||window.__FORMA__.diagnostics.error),id,{timeout:30000});assert.equal((await page.evaluate(()=>window.__FORMA__.diagnostics)).error,null);}
async function choose(page,id,mobile=false){if(mobile){await page.locator('#mobile-library').tap();await page.locator(`[data-experiment="${id}"]`).tap();}else await page.locator(`[data-experiment="${id}"]`).click();await ready(page,id);await page.waitForTimeout(100);}
try{
  const page=await browser.newPage({viewport:{width:1512,height:982},deviceScaleFactor:1});observe(page);
  await page.goto('http://127.0.0.1:4174/',{waitUntil:'networkidle'});await ready(page,'navier');await page.locator('#view-mode').click();await choose(page,'vortex');
  await page.locator('#play-button').click();const pausedAt=await page.evaluate(()=>window.__FORMA__.diagnostics.time);await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>window.__FORMA__.diagnostics.time),pausedAt);
  await page.locator('#reset-button').click();assert.equal(await page.evaluate(()=>window.__FORMA__.diagnostics.time),0);
  const canvas=page.locator('#canvas-host canvas'),beforeOrbit=await canvas.screenshot(),bounds=await canvas.boundingBox();
  await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width/2+110,bounds.y+bounds.height/2+25,{steps:6});await page.mouse.up();await page.waitForTimeout(80);
  assert.notDeepEqual(beforeOrbit,await canvas.screenshot());await page.mouse.wheel(0,180);await page.waitForTimeout(80);await page.locator('#camera-reset').click();report.orbitInteraction=true;
  // Rapid scene selections must settle on the last request with live controls.
  await page.locator('[data-experiment="kissing"]').click();
  await page.locator('[data-experiment="hat"]').click();
  await page.locator('[data-experiment="kissing"]').click();
  await ready(page,'kissing');assert(await page.locator('#seed').isEnabled());report.rapidSelection=true;
  // Projection actions change the real seed and must keep the input and saved state synchronized.
  await page.locator('[data-action="projection"]').click();assert.equal(await page.evaluate(()=>window.__FORMA__.diagnostics.seed),43);assert.equal(await page.locator('#seed').inputValue(),'43');
  await page.locator('#seed').fill('4294967295');await page.locator('#seed').dispatchEvent('change');await page.locator('[data-action="projection"]').click();assert.equal(await page.locator('#seed').inputValue(),'0');
  await page.locator('#defaults-button').click();await ready(page,'kissing');
  // Project an actual fixture point into the same camera to exercise native ray picking through the UI.
  const target=await page.evaluate(async()=>{
    const THREE=await import('/vendor/three.module.js');const {projectionBasis,projectConfiguration}=await import('/src/math/kissing.js');
    const data=await(await fetch('/data/kissing.json')).json();const positions=projectConfiguration(data.configurations[0],projectionBasis(42),0);
    const rect=document.querySelector('canvas').getBoundingClientRect(),view=window.__FORMA__.diagnostics.camera,camera=new THREE.PerspectiveCamera(42,rect.width/rect.height,.03,1000);camera.position.fromArray(view.position);camera.lookAt(...view.target);camera.updateMatrixWorld();
    const point=new THREE.Vector3(...positions.slice(0,3)).multiplyScalar(1.8).project(camera);return {x:rect.left+(point.x+1)*rect.width/2,y:rect.top+(1-point.y)*rect.height/2};
  });
  await page.mouse.click(target.x,target.y);const selected=await page.evaluate(()=>window.__FORMA__.diagnostics.params.selected);assert.notEqual(selected,17);assert.equal(Number(await page.locator('#param-selected').inputValue()),selected);report.pickSynchronization=true;
  await choose(page,'kakeya');const initialDirection=await page.evaluate(()=>window.__FORMA__.diagnostics.metrics['当前方向']);await page.locator('#reset-button').click();assert.equal(await page.evaluate(()=>window.__FORMA__.diagnostics.metrics['当前方向']),initialDirection);
  await page.locator('[data-action="next"]').click();const nextDirection=await page.evaluate(()=>window.__FORMA__.diagnostics.metrics['当前方向']);await page.locator('#reset-button').click();assert.equal(await page.evaluate(()=>window.__FORMA__.diagnostics.metrics['当前方向']),nextDirection);report.directionReset=true;
  for(const id of ids){
    await choose(page,id);await page.locator('#parameters-tab').click();
    const controls=page.locator('[data-parameter]');let changes=0;
    for(let i=0;i<await controls.count();i++){
      const input=controls.nth(i),original=await input.inputValue();
      if(await input.evaluate(el=>el.tagName)==='SELECT'){
        for(const value of await input.locator('option').evaluateAll(nodes=>nodes.map(n=>n.value))){await input.selectOption(value);changes++;await page.waitForTimeout(70);assert.equal(await page.evaluate(()=>window.__FORMA__.diagnostics.error),null);}
        await input.selectOption(original);
      }else{
        for(const boundary of ['min','max']){await input.evaluate((el,boundary)=>{el.value=el[boundary];el.dispatchEvent(new Event('input',{bubbles:true}));},boundary);changes++;await page.waitForTimeout(70);assert.equal(await page.evaluate(()=>window.__FORMA__.diagnostics.error),null);}
        await input.evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},original);
      }
    }
    const actions=page.locator('[data-action]');const actionCount=await actions.count();
    for(let i=0;i<actionCount;i++){await actions.nth(i).click();await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>window.__FORMA__.diagnostics.error),null);}
    await page.locator('#seed').fill('314');await page.locator('#seed').dispatchEvent('change');assert.equal(await page.evaluate(()=>window.__FORMA__.diagnostics.seed),314);
    await page.locator('#theory-tab').click();assert(await page.locator('#limitations').innerText());assert(await page.locator('#sources a').count()>0);
    await page.locator('#parameters-tab').click();await page.locator('#defaults-button').click();await ready(page,id);
    assert.equal(await page.evaluate(()=>window.__FORMA__.diagnostics.seed),42);
    report.controls.push({id,boundaryChanges:changes,actions:actionCount,passed:true});
  }
  await choose(page,'ocean');await page.locator('#play-button').click();await page.locator('[data-action="drop"]').click();await page.waitForTimeout(1700);
  const oceanMetrics=await page.evaluate(()=>window.__FORMA__.diagnostics.metrics);assert(Number.parseInt(oceanMetrics['入水飞溅'])>0);report.oceanImpact=oceanMetrics;
  await page.locator('#play-button').click();
  await choose(page,'vortex');await page.locator('#camera-reset').click();
  const downloadPromise=page.waitForEvent('download');await page.locator('#export-button').click();const download=await downloadPromise;await download.saveAs(resolve(output,'export-vortex.png'));assert.equal(await download.failure(),null);report.pngExport=download.suggestedFilename();
  for(let round=0;round<3;round++)for(const id of ids){await choose(page,id);report.resources.push({round,...await page.evaluate(()=>({id:window.__FORMA__.diagnostics.id,...window.__FORMA__.diagnostics.renderer}))});}
  for(const id of ids){const counts=report.resources.filter(r=>r.id===id);assert.equal(counts[1].geometries,counts[2].geometries,`${id}: geometry leak`);assert.equal(counts[1].textures,counts[2].textures,`${id}: texture leak`);}
  report.switches=ids.length*3;
  const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});observe(mobile);
  await mobile.goto('http://127.0.0.1:4174/',{waitUntil:'networkidle'});
  for(const id of ids){
    await choose(mobile,id,true);await mobile.waitForTimeout(1000);
    const diag=await mobile.evaluate(()=>window.__FORMA__.diagnostics);assert.equal(diag.quality,'low');
    assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await mobile.screenshot({path:resolve(output,`${id}-mobile.png`)});
    await mobile.locator('#mobile-controls').click();await mobile.locator('#theory-tab').click();assert(await mobile.locator('#limitations').isVisible());await mobile.locator('[data-close="inspector"]').click();
    report.mobile.push({...diag,viewport:'390×844, DPR 2, emulation'});
  }
  await mobile.locator('#mobile-controls').click();await mobile.locator('#parameters-tab').click();await mobile.screenshot({path:resolve(output,'mobile-controls.png')});
  const reduced=await browser.newPage({reducedMotion:'reduce'});await reduced.goto('http://127.0.0.1:4174/');await ready(reduced,'navier');await reduced.waitForTimeout(150);assert.equal(await reduced.evaluate(()=>window.__FORMA__.diagnostics.time),0);report.reducedMotion=true;
  const unsupported=await browser.newPage();await unsupported.addInitScript(()=>{const getContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(/webgl/.test(type))return null;return getContext.call(this,type,...args);};});await unsupported.goto('http://127.0.0.1:4174/');await unsupported.waitForTimeout(700);assert(await unsupported.locator('#error').isVisible());await unsupported.locator('#mobile-controls').click();await unsupported.locator('#theory-tab').click();assert(await unsupported.locator('#explanation').innerText());report.webglFallback=true;
  assert.equal(errors.length,0);assert.equal(externalRequests.length,0);
  report.passed=true;console.log(JSON.stringify(report,null,2));
}catch(error){report.passed=false;report.failure=error.stack;console.error(error);process.exitCode=1;}
finally{await writeFile(resolve(output,'interaction-report.json'),JSON.stringify(report,null,2));await browser.close();}
