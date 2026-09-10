import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import os from 'node:os';
import {catalog} from '../src/catalog.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=fileURLToPath(new URL('..',import.meta.url));
const output=resolve(root,'docs/qa');await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1512,height:982},deviceScaleFactor:1});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
const ids=process.env.SCENES?process.env.SCENES.split(','):catalog.map(item=>item.id);
const report={started:new Date().toISOString(),browser:await browser.version(),hardware:{cpu:os.cpus()[0].model,platform:os.platform(),arch:os.arch()},viewport:'1512×982, DPR 1',desktop:[],errors};
try{
  await page.goto('http://127.0.0.1:4174/',{waitUntil:'networkidle'});
  for(const id of ids){
    await page.locator(`[data-scene="${id}"]`).click();
    await page.waitForFunction(id=>window.__FORMA__?.diagnostics.id===id&&(window.__FORMA__.diagnostics.ready||window.__FORMA__.diagnostics.error),id,{timeout:30000});
    await page.waitForTimeout(1800);
    const diagnostics=await page.evaluate(()=>window.__FORMA__.diagnostics);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    await page.screenshot({path:resolve(output,`${id}-desktop.png`)});
    report.desktop.push({...diagnostics,overflow});
  }
  report.passed=errors.length===0&&report.desktop.every(item=>item.ready&&!item.error&&!item.overflow);
  await writeFile(resolve(output,'browser-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  assert(report.passed,'Browser rendering acceptance failed; see docs/qa/browser-report.json');
}finally{await browser.close();}
