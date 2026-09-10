import assert from 'node:assert/strict';
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {catalog} from '../src/catalog.js';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = fileURLToPath(new URL('../docs/qa/', import.meta.url));
const entry = new URL('../index.html', import.meta.url).href;
await mkdir(output, {recursive:true});
const definitions = new Map(await Promise.all(catalog.map(async ({id}) => [id, (await import(`../src/experiments/${id}.js`)).definition])));
const browser = await chromium.launch({headless:true, channel:'chrome', args:['--enable-webgl', '--ignore-gpu-blocklist']});
const errors = [], remoteRequests = [];
const bundle=JSON.parse(await readFile(new URL('../dist/manifest.json',import.meta.url)));
const report = {started:new Date().toISOString(), bundleSha256:bundle.sha256, browser:await browser.version(), protocol:'file:', desktopPresets:[], mobilePresets:[], errors, remoteRequests};

function observe(page) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => { if (/^https?:/.test(request.url())) remoteRequests.push(request.url()); });
}
const diagnostics = page => page.evaluate(() => window.__FORMA__.diagnostics);
async function ready(page, id) {
  await page.waitForFunction(id => window.__FORMA__?.diagnostics.id === id && (window.__FORMA__.diagnostics.ready || window.__FORMA__.diagnostics.error), id, {timeout:30000});
  const state = await diagnostics(page);
  assert(state.ready && !state.error, `${id} failed to initialize: ${JSON.stringify(state.error)}`);
}
async function pause(page) {
  if (!(await diagnostics(page)).paused) await page.locator('#play-button').click();
  await page.waitForTimeout(100);
}
async function checkPreset(page, id, preset, touch = false) {
  const before = (await diagnostics(page)).params;
  const button = page.locator(`[data-preset="${preset.label}"]`);
  assert(await button.isVisible(), `${id}: preset ${preset.label} is not visible`);
  if (touch) await button.tap(); else await button.click();
  await page.waitForTimeout(80);
  const state = await diagnostics(page);
  assert.equal(state.error, null, `${id}: preset ${preset.label} failed`);
  assert.deepEqual(state.params, {...before, ...preset.params}, `${id}: preset did not apply its declared parameters`);
  assert.equal(await button.getAttribute('aria-pressed'), 'true');
  assert.equal(state.time, 0, `${id}: preset should reset paused simulation time`);
  return {id, label:preset.label, params:state.params, passed:true};
}
async function chooseFromRail(page, id, touch = false) {
  const button = page.locator(`[data-scene="${id}"]`);
  await button.scrollIntoViewIfNeeded();
  assert(await button.isVisible(), `${id}: scene chip is not visible`);
  if (touch) await button.tap(); else await button.click();
  await ready(page, id);
  assert.equal(await button.getAttribute('aria-current'), 'true');
}
async function assertNoOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Page overflows viewport horizontally');
}

try {
  const page = await browser.newPage({viewport:{width:1512, height:982}, deviceScaleFactor:1, acceptDownloads:true});
  observe(page);
  await page.goto(entry, {waitUntil:'load'});
  await ready(page, 'navier');
  assert.equal((await diagnostics(page)).immersive, true);
  assert(await page.locator('#scene-rail').isVisible());
  await page.locator('#view-mode').click();
  assert.equal((await diagnostics(page)).immersive, false);
  assert(await page.locator('#library').isVisible());
  assert(await page.locator('#inspector').isVisible());
  await page.locator('#view-mode').click();
  assert.equal((await diagnostics(page)).immersive, true);
  for (const [trigger, drawer] of [['mobile-library', 'library'], ['mobile-controls', 'inspector']]) {
    await page.locator(`#${trigger}`).click();
    assert.match(await page.locator(`#${drawer}`).getAttribute('class'), /\bopen\b/);
    assert(await page.locator('#drawer-backdrop').isVisible());
    await page.keyboard.press('Escape');
    assert.doesNotMatch(await page.locator(`#${drawer}`).getAttribute('class'), /\bopen\b/);
    assert(await page.locator('#drawer-backdrop').isHidden());
  }
  report.presentationModes = {initialImmersive:true, workbench:true, libraryDrawer:true, inspectorDrawer:true, escapeCloses:true};

  await pause(page);
  const pausedState = await diagnostics(page);
  await page.waitForTimeout(350);
  const stillPaused = await diagnostics(page);
  assert.equal(stillPaused.time, pausedState.time);
  assert.deepEqual(stillPaused.camera, pausedState.camera);
  await page.locator('#camera-motion').click();
  assert.equal((await diagnostics(page)).cameraMotion, false);
  await page.locator('#play-button').click();
  const disabled = await diagnostics(page);
  await page.waitForTimeout(350);
  const stillDisabled = await diagnostics(page);
  assert(stillDisabled.time > disabled.time);
  assert.deepEqual(stillDisabled.camera, disabled.camera);
  await page.locator('#camera-motion').click();
  assert.equal((await diagnostics(page)).cameraMotion, true);
  const enabled = await diagnostics(page);
  await page.waitForTimeout(350);
  assert.notDeepEqual((await diagnostics(page)).camera.position, enabled.camera.position);
  const canvas = page.locator('#canvas-host canvas');
  const bounds = await canvas.boundingBox();
  const beforeDrag = (await diagnostics(page)).camera;
  await page.mouse.move(bounds.x + bounds.width * .64, bounds.y + bounds.height * .48);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .64 + 90, bounds.y + bounds.height * .48 + 35, {steps:8});
  await page.mouse.up();
  const dragged = await diagnostics(page);
  assert.notDeepEqual(dragged.camera, beforeDrag);
  await page.waitForTimeout(600);
  const afterDrag = await diagnostics(page);
  assert(afterDrag.time > dragged.time);
  assert.deepEqual(afterDrag.camera, dragged.camera, 'Automatic motion interrupted manual orbit hold');
  report.cameraPolicy = {pausedTimeStable:true, pausedCameraStable:true, disabledCameraStable:true, enabledCameraMoves:true, manualDragChangesCamera:true, manualHoldStableMilliseconds:600};

  await pause(page);
  for (const {id} of catalog) {
    await chooseFromRail(page, id);
    const presets = definitions.get(id).presets;
    assert.equal(presets.length, 3, `${id}: expected three accessible presets`);
    for (const preset of presets) report.desktopPresets.push(await checkPreset(page, id, preset));
    await assertNoOverflow(page);
  }
  const pendingDownload = page.waitForEvent('download');
  await page.locator('#export-button').click();
  const download = await pendingDownload;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const png = Buffer.concat(chunks);
  assert.equal(await download.failure(), null);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert(png.length > 10000, 'Export is unexpectedly empty');
  report.pngExport = {filename:download.suggestedFilename(), bytes:png.length, signatureValid:true};

  const mobile = await browser.newPage({viewport:{width:390, height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true});
  observe(mobile);
  await mobile.goto(entry, {waitUntil:'load'});
  await ready(mobile, 'navier');
  await pause(mobile);
  for (const {id} of catalog) {
    await chooseFromRail(mobile, id, true);
    assert.equal((await diagnostics(mobile)).quality, 'low');
    for (const preset of definitions.get(id).presets) report.mobilePresets.push(await checkPreset(mobile, id, preset, true));
    await assertNoOverflow(mobile);
  }
  await mobile.locator('#mobile-controls').tap();
  assert.match(await mobile.locator('#inspector').getAttribute('class'), /\bopen\b/);
  await mobile.locator('#theory-tab').tap();
  assert(await mobile.locator('#limitations').isVisible());
  await mobile.locator('[data-close="inspector"]').tap();
  assert(await mobile.locator('#drawer-backdrop').isHidden());
  await mobile.locator('#view-mode').tap();
  assert.equal((await diagnostics(mobile)).immersive, false);
  await assertNoOverflow(mobile);
  await mobile.locator('#view-mode').tap();
  report.mobile = {viewport:'390×844, DPR 2, touch emulation', presetTouches:report.mobilePresets.length, overflow:false, theoryDrawer:true, modeSwitch:true};

  const reduced = await browser.newPage({reducedMotion:'reduce'});
  observe(reduced);
  await reduced.goto(entry, {waitUntil:'load'});
  await ready(reduced, 'navier');
  const reducedInitial = await diagnostics(reduced);
  assert.equal(reducedInitial.paused, true);
  assert.equal(reducedInitial.cameraMotion, false);
  await reduced.waitForTimeout(350);
  const reducedLater = await diagnostics(reduced);
  assert.equal(reducedLater.time, 0);
  assert.deepEqual(reducedLater.camera, reducedInitial.camera);
  report.reducedMotion = {paused:true, automaticCamera:false, time:0, cameraStable:true};
  assert.deepEqual(errors, []);
  assert.deepEqual(remoteRequests, []);
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = error.stack;
  process.exitCode = 1;
} finally {
  await writeFile(`${output}/presentation-report.json`, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({passed:report.passed, browser:report.browser, desktopPresetClicks:report.desktopPresets.length, mobilePresetTouches:report.mobilePresets.length, presentationModes:report.presentationModes, cameraPolicy:report.cameraPolicy, pngExport:report.pngExport, mobile:report.mobile, reducedMotion:report.reducedMotion, errors, remoteRequests, failure:report.failure}, null, 2));
  await browser.close();
}
