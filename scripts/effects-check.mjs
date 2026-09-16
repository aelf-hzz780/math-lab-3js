import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import os from 'node:os';
import {loadExperiment} from '../src/catalog.js';

// This script uses rendered canvas PNGs to distinguish an actual field interaction
// from a camera-only effect. Its virtual-clock FPS values are never reported.
const ids = ['particle-paint', 'liquid-glass'];
const definitions = new Map(await Promise.all(ids.map(async id => [id, (await loadExperiment(id)).definition])));
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const entry = new URL('../index.html', import.meta.url).href;
const output = new URL('../docs/qa/', import.meta.url);
const bundle = JSON.parse(await readFile(new URL('../dist/manifest.json', import.meta.url)));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(await readFile(new URL('../dist/app.js', import.meta.url))), bundle.sha256, 'Build manifest is stale; run npm run build');
await mkdir(output, {recursive:true});

const browser = await chromium.launch({headless:true, channel:'chrome', args:['--enable-webgl', '--ignore-gpu-blocklist']});
const errors = [], remoteRequests = [], virtualPages = new WeakSet();
const report = {
  started:new Date().toISOString(), browser:await browser.version(), bundleSha256:bundle.sha256,
  hardware:{cpu:os.cpus()[0]?.model, arch:os.arch(), platform:os.platform()}, protocol:'file:',
  conditions:{headless:true, desktop:{width:1280,height:800,deviceScaleFactor:1}, mobile:{width:390,height:844,deviceScaleFactor:2,touchEmulation:true},
    functionalClock:'Playwright virtual clock; these runs are not performance evidence.',
    performanceClock:'Separate page and real wall-clock animation after functional pages close.',
    limitations:'Touch is emulated on this desktop with Chrome touch events. No physical phone, iOS compatibility or sustained thermal performance is claimed.'},
  desktop:[], mobile:[], switches:[], performanceSamples:[], errors, remoteRequests,
};
const state = page => page.evaluate(() => window.__FORMA__?.diagnostics);
const defaultParams = id => Object.fromEntries(definitions.get(id).parameters.map(parameter => [parameter.key,parameter.value]));
const resources = current => ({geometries:current.renderer.geometries,textures:current.renderer.textures,drawCalls:current.renderer.drawCalls,points:current.renderer.points,triangles:current.renderer.triangles});

async function prepare(name, options = {}, virtual = true) {
  const page = await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1,reducedMotion:'reduce',acceptDownloads:true,...options});
  page.on('pageerror', error => errors.push({page:name,type:'pageerror',message:error.message}));
  page.on('console', message => { if (message.type() === 'error') errors.push({page:name,type:'console',message:message.text()}); });
  page.on('request', request => { if (/^https?:/.test(request.url())) remoteRequests.push({page:name,url:request.url()}); });
  if (virtual) {
    const epoch = new Date('2026-09-16T00:00:00Z');
    await page.clock.install({time:epoch});
    await page.clock.pauseAt(epoch);
    virtualPages.add(page);
  }
  return page;
}

async function advance(page, milliseconds = 64) {
  if (virtualPages.has(page)) await page.clock.runFor(milliseconds);
  else await delay(milliseconds);
}

async function ready(page, id) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    const current = await state(page);
    assert(!current?.error, `${id}: ${JSON.stringify(current?.error)}`);
    if (current?.id === id && current.ready) {
      await advance(page);
      const rendered = await state(page);
      assert(!rendered.error, `${id}: ${JSON.stringify(rendered.error)}`);
      assert(rendered.renderer.drawCalls > 0, `${id} rendered no draw calls`);
      return rendered;
    }
    await advance(page); await delay(10);
  }
  throw new Error(`${id} timed out: ${JSON.stringify(await state(page))}`);
}

async function click(page, selector) {
  await page.locator(selector).evaluate(element => element.click());
  await advance(page);
  assert.equal((await state(page)).error, null);
}

async function choose(page, id) {
  await page.evaluate(id => { location.hash = id; }, id);
  return ready(page, id);
}

async function defaults(page, id) {
  await click(page, '#defaults-button');
  const current = await ready(page, id);
  assert.deepEqual(current.params, defaultParams(id));
  assert.equal(current.seed, 42);
  assert.equal(current.time, 0);
  return current;
}

async function reset(page) {
  await click(page, '#reset-button');
  assert.equal((await state(page)).time, 0);
}

async function setParameter(page, parameter, value) {
  const applied = await page.locator(`[data-parameter="${parameter.key}"]`).evaluate((element, value) => {
    element.value = String(value);
    element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', {bubbles:true}));
    return element.value;
  }, value);
  await advance(page);
  const current = await state(page);
  assert.equal(current.error, null);
  assert.equal(String(current.params[parameter.key]), applied, `${current.id}/${parameter.key}: value did not reach the model`);
  return current;
}

async function exportPNG(page) {
  const pending = page.waitForEvent('download');
  await click(page, '#export-button');
  const download = await pending;
  const stream = await download.createReadStream(), chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  assert.equal(await download.failure(), null);
  assert.equal(bytes.subarray(0,8).toString('hex'), '89504e470d0a1a0a');
  assert(bytes.length > 10000, 'PNG is unexpectedly empty');
  return {filename:download.suggestedFilename(),bytes:bytes.length,sha256:hash(bytes)};
}

async function noOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Horizontal page overflow');
}

async function canvasPoint(page) {
  const bounds = await page.locator('#canvas-host canvas').boundingBox();
  assert(bounds?.width > 100 && bounds.height > 100);
  return {x:bounds.x + bounds.width * .53, y:bounds.y + bounds.height * .47};
}

async function playTrajectory(page) {
  assert.equal((await state(page)).paused, true);
  await click(page, '#play-button');
  await advance(page, 960);
  await click(page, '#play-button');
  const current = await state(page);
  assert(current.time > 0);
  assert.equal(current.paused, true);
  return current;
}

async function frozen(page) {
  const before = await state(page), image = await exportPNG(page);
  await advance(page, 256);
  const after = await state(page), held = await exportPNG(page);
  assert.equal(after.time, before.time, 'Pause did not freeze simulation time');
  assert.deepEqual(after.camera, before.camera, 'Camera moved while paused');
  assert.equal(held.sha256, image.sha256, 'Paused rendering continued to change');
  return {time:after.time,png:image};
}

async function sourceLinks(page, id, touch = false) {
  if (touch) {
    await page.locator('#mobile-controls').tap();
    await page.locator('#theory-tab').tap();
  } else {
    await click(page, '#mobile-controls');
    await click(page, '#theory-tab');
  }
  assert(await page.locator('#limitations').isVisible());
  const links = await page.locator('#sources a').evaluateAll(elements => elements.map(element => ({label:element.textContent,url:element.href})));
  assert(links.length > 0);
  assert.equal(links.length, definitions.get(id).sources.length);
  assert(links.every(link => /^https?:/.test(link.url)));
  if (touch) await page.locator('[data-close="inspector"]').tap();
  else await page.keyboard.press('Escape');
  return links;
}

async function mouseInteraction(page, original) {
  // First prove a paused field stays visually frozen even with an active pointer.
  const point = await canvasPoint(page), initialCamera = (await state(page)).camera;
  await page.mouse.move(point.x - 55, point.y + 20);
  await page.mouse.down();
  await page.mouse.move(point.x + 30, point.y - 15, {steps:8});
  await advance(page);
  const pausedInput = await exportPNG(page);
  assert.equal(pausedInput.sha256, original.sha256, 'Primary pointer input animated a paused effect');
  assert.deepEqual((await state(page)).camera, initialCamera, 'Primary drag orbited instead of entering the field');
  await page.mouse.up();

  await reset(page);
  const unperturbed = await playTrajectory(page), baseline = await exportPNG(page);
  await reset(page);
  await page.mouse.move(point.x - 55, point.y + 20);
  await page.mouse.down();
  await page.mouse.move(point.x + 30, point.y - 15, {steps:8});
  const perturbed = await playTrajectory(page), interacted = await exportPNG(page);
  assert(Math.abs(perturbed.time - unperturbed.time) < 1e-9, 'Comparison trajectories ran for different durations');
  assert.notEqual(interacted.sha256, baseline.sha256, 'Primary drag did not change rendered effect');
  assert.deepEqual(perturbed.camera, initialCamera, 'Field interaction moved the camera');
  await page.mouse.up();
  await reset(page);
  const restored = await exportPNG(page);
  assert.equal(restored.sha256, original.sha256, 'Reset did not clear pointer state and reproduce the initial PNG');

  const cameraGestures = [];
  for (const gesture of ['Shift', 'right']) {
    await page.mouse.move(point.x, point.y);
    if (gesture === 'Shift') await page.keyboard.down('Shift');
    await page.mouse.down({button:gesture === 'right' ? 'right' : 'left'});
    await page.mouse.move(point.x + 55, point.y + 25, {steps:8});
    await page.mouse.up({button:gesture === 'right' ? 'right' : 'left'});
    if (gesture === 'Shift') await page.keyboard.up('Shift');
    await advance(page);
    const moved = (await state(page)).camera;
    assert.notDeepEqual(moved, initialCamera, `${gesture} drag did not orbit`);
    await click(page, '#camera-reset');
    assert.deepEqual((await state(page)).camera, initialCamera, 'Camera reset did not restore the default');
    cameraGestures.push({gesture,camera:moved});
  }
  await reset(page);
  return {pausedPointerFrozen:true,simulationSeconds:perturbed.time,unperturbed:baseline,interacted,reset:restored,cameraUnchangedDuringField:true,cameraGestures};
}

async function touchInteraction(page, original) {
  const session = await page.context().newCDPSession(page);
  const point = await canvasPoint(page), camera = (await state(page)).camera;
  const touch = (type, points) => session.send('Input.dispatchTouchEvent', {type,touchPoints:points.map(([id,x,y]) => ({id,x,y,radiusX:4,radiusY:4,force:1}))});
  try {
    await touch('touchStart', [[1,point.x - 30,point.y + 20]]);
    await touch('touchMove', [[1,point.x + 24,point.y - 12]]);
    await advance(page);
    assert.equal((await exportPNG(page)).sha256, original.sha256, 'Touch animated a paused effect');
    assert.deepEqual((await state(page)).camera, camera, 'Single touch orbited the field');
    await touch('touchEnd', []);

    await reset(page);
    const unperturbed = await playTrajectory(page), baseline = await exportPNG(page);
    await reset(page);
    await touch('touchStart', [[1,point.x - 30,point.y + 20]]);
    await touch('touchMove', [[1,point.x + 24,point.y - 12]]);
    const perturbed = await playTrajectory(page), interacted = await exportPNG(page);
    assert(Math.abs(perturbed.time - unperturbed.time) < 1e-9);
    assert.notEqual(interacted.sha256, baseline.sha256, 'Single touch did not change the rendered effect');
    assert.deepEqual(perturbed.camera, camera, 'Single touch moved the camera');
    await touch('touchEnd', []);
    await reset(page);
    const restored = await exportPNG(page);
    assert.equal(restored.sha256, original.sha256, 'Touch state survived reset');

    await touch('touchStart', [[1,point.x - 25,point.y],[2,point.x + 25,point.y]]);
    await touch('touchMove', [[1,point.x - 45,point.y],[2,point.x + 45,point.y]]);
    await touch('touchEnd', []);
    await advance(page);
    const pinched = (await state(page)).camera;
    assert.notDeepEqual(pinched, camera, 'Two-finger pinch did not zoom the camera');
    await click(page, '#camera-reset');
    assert.deepEqual((await state(page)).camera, camera);
    await reset(page);
    return {input:'Chrome CDP touchStart/touchMove/touchEnd',pausedTouchFrozen:true,simulationSeconds:perturbed.time,unperturbed:baseline,interacted,reset:restored,cameraUnchangedDuringField:true,pinchCamera:pinched,cameraReset:true};
  } finally { await session.detach(); }
}

try {
  const page = await prepare('desktop');
  await page.goto(`${entry}#${ids[0]}`, {waitUntil:'load'});
  for (const id of ids) {
    const definition = definitions.get(id);
    await choose(page, id);
    const initial = await defaults(page, id);
    assert.equal(initial.quality, 'high');
    assert.equal(initial.paused, true, 'Reduced-motion preference was ignored');
    assert.equal(initial.cameraMotion, false);
    await noOverflow(page);
    const item = {id,quality:initial.quality,defaultParams:initial.params,defaultCamera:initial.camera,initialResources:resources(initial),presets:[],parameterCases:[],actions:[],passed:false};
    report.desktop.push(item);
    for (const preset of definition.presets || []) {
      const before = (await state(page)).params;
      await click(page, `[data-preset="${preset.label}"]`);
      const current = await ready(page, id);
      assert.deepEqual(current.params, {...before,...preset.params});
      assert.equal(current.time, 0);
      assert.equal(await page.locator(`[data-preset="${preset.label}"]`).getAttribute('aria-pressed'), 'true');
      item.presets.push({label:preset.label,params:current.params});
    }
    for (const parameter of definition.parameters) {
      const values = parameter.type === 'select' ? parameter.options.map(option => option.value) : [parameter.min,parameter.max];
      for (const value of values) {
        await defaults(page, id);
        const current = await setParameter(page, parameter, value);
        item.parameterCases.push({key:parameter.key,value,resources:resources(current)});
      }
    }
    for (const action of definition.actions || []) {
      await defaults(page, id);
      await click(page, `[data-action="${action.key}"]`);
      const current = await ready(page, id);
      item.actions.push({key:action.key,params:current.params,metrics:current.metrics});
    }
    await defaults(page, id);
    const original = await exportPNG(page);
    item.pause = await frozen(page);
    item.interaction = await mouseInteraction(page, original);
    item.sources = await sourceLinks(page, id);
    await defaults(page, id);
    await advance(page, 3584);
    assert(await page.locator('#toast').isHidden());
    await page.screenshot({path:new URL(`${id}-desktop.png`,output).pathname,animations:'disabled'});
    item.screenshot = `${id}-desktop.png`;
    item.metrics = (await state(page)).metrics;
    item.passed = true;
    console.log(`${id}: high quality, ${item.presets.length} presets, ${item.parameterCases.length} endpoints, frozen pause, pointer effect and PNG reset passed`);
  }

  // Only new effects and the inexpensive vortex anchor are used here; this keeps
  // the lifecycle check bounded independently of terrain background generation.
  const roundIds = [...ids,'vortex'];
  for (let index = 0; index < 24; index++) {
    const id = roundIds[index % roundIds.length];
    const current = await choose(page, id);
    report.switches.push({index,id,...resources(current)});
  }
  for (const id of roundIds) {
    const rounds = report.switches.filter(item => item.id === id).slice(1);
    for (const current of rounds.slice(1)) {
      assert.equal(current.geometries, rounds[0].geometries, `${id}: geometry count grew after warm-up`);
      assert.equal(current.textures, rounds[0].textures, `${id}: texture count grew after warm-up`);
    }
  }
  console.log('effects: 24 switches retained stable geometry and texture counts');
  await page.close();

  const mobile = await prepare('mobile', {viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await mobile.goto(`${entry}#${ids[0]}`, {waitUntil:'load'});
  for (const id of ids) {
    await choose(mobile, id);
    const initial = await defaults(mobile, id);
    assert.equal(initial.quality, 'low');
    assert.equal(initial.paused, true);
    assert.equal(initial.cameraMotion, false);
    await noOverflow(mobile);
    const original = await exportPNG(mobile), interaction = await touchInteraction(mobile, original);
    const presets = [];
    for (const preset of definitions.get(id).presets || []) {
      await mobile.locator(`[data-preset="${preset.label}"]`).tap();
      const current = await ready(mobile, id);
      for (const [key,value] of Object.entries(preset.params)) assert.equal(current.params[key], value);
      presets.push({label:preset.label,params:current.params});
    }
    const sources = await sourceLinks(mobile, id, true);
    await defaults(mobile, id);
    await noOverflow(mobile);
    await advance(mobile, 3584);
    assert(await mobile.locator('#toast').isHidden());
    await mobile.screenshot({path:new URL(`${id}-mobile.png`,output).pathname,animations:'disabled'});
    report.mobile.push({id,quality:initial.quality,defaultCamera:initial.camera,interaction,presets,sources,horizontalOverflow:false,screenshot:`${id}-mobile.png`,resources:resources(await state(mobile))});
    console.log(`${id}: low quality, actual emulated touch field interaction, pinch/reset, presets and PNG passed`);
  }
  await mobile.close();

  // Each sample gets its own page after all functional pages have closed. Keep
  // these sequential so one effect cannot consume the other effect's GPU budget.
  for (const id of ids) {
    const performancePage = await prepare(`performance-${id}`, {}, false);
    await performancePage.goto(`${entry}#${id}`, {waitUntil:'load'});
    await ready(performancePage, id);
    const before = await state(performancePage), started = Date.now();
    await click(performancePage, '#play-button');
    await delay(5000);
    const running = await state(performancePage);
    await click(performancePage, '#play-button');
    assert(running.time > before.time);
    assert(Number.isFinite(running.fps) && running.fps > 0);
    report.performanceSamples.push({id,wallMilliseconds:Date.now()-started,simulationSeconds:running.time-before.time,fpsSample:running.fps,quality:running.quality,
      viewport:{width:1280,height:800},deviceScaleFactor:1,headless:true,resources:resources(running),metrics:running.metrics,
      scope:'Approximately five seconds of real-clock headless Chrome playback, with no other acceptance page open. The reported app FPS is a short rolling sample, not a sustained-device guarantee.'});
    await performancePage.close();
  }
  // Retain the existing field for report consumers created with the first check.
  report.performance = report.performanceSamples.find(sample => sample.id === 'liquid-glass');
  assert.deepEqual(errors, []);
  assert.deepEqual(remoteRequests, []);
  assert.equal(hash(await readFile(new URL('../dist/app.js', import.meta.url))), bundle.sha256, 'The bundle changed during browser acceptance; rerun against one final build');
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = error.stack;
  process.exitCode = 1;
} finally {
  report.finished = new Date().toISOString();
  await writeFile(new URL('effects-report.json',output), JSON.stringify(report,null,2) + '\n');
  console.log(JSON.stringify({passed:report.passed,desktop:report.desktop.length,mobile:report.mobile.length,switches:report.switches.length,performanceSamples:report.performanceSamples,failure:report.failure,errors},null,2));
  await browser.close();
}
