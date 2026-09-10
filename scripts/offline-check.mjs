import assert from 'node:assert/strict';
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {catalog} from '../src/catalog.js';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const output = resolve(root, 'docs/qa');
await mkdir(output, {recursive:true});
const browser = await chromium.launch({headless:true, channel:'chrome', args:['--enable-webgl', '--ignore-gpu-blocklist']});
const page = await browser.newPage({viewport:{width:1512, height:982}, deviceScaleFactor:1});
const errors = [], remoteRequests = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('request', request => { if (/^https?:/.test(request.url())) remoteRequests.push(request.url()); });
const bundle=JSON.parse(await readFile(resolve(root,'dist/manifest.json'),'utf8'));
const report = {bundleSha256:bundle.sha256,started:new Date().toISOString(), browser:await browser.version(), protocol:'file:', scenes:[], failureChecks:[], errors, remoteRequests};
try {
  await page.goto(new URL('../index.html', import.meta.url).href, {waitUntil:'load'});
  for (const {id} of catalog) {
    await page.evaluate(id => document.querySelector(`[data-experiment="${id}"]`).click(), id);
    await page.waitForFunction(id => window.__FORMA__?.diagnostics.id === id && (window.__FORMA__.diagnostics.ready || window.__FORMA__.diagnostics.error), id, {timeout:30000});
    const diagnostics = await page.evaluate(() => window.__FORMA__.diagnostics);
    report.scenes.push({id, ready:diagnostics.ready, error:diagnostics.error});
    assert(diagnostics.ready && !diagnostics.error, `file:// scene ${id} did not initialize`);
  }
  report.bootState = await page.evaluate(() => window.__FORMA_BOOT__?.state);
  report.loadingHidden = await page.locator('#loading').isHidden();
  for (const failure of ['missing-bundle', 'invalid-bundle']) {
    const brokenPage = await browser.newPage();
    await brokenPage.route('**/dist/app.js', route => failure === 'missing-bundle' ? route.abort() : route.fulfill({contentType:'text/javascript', body:'function { invalid syntax'}));
    await brokenPage.goto(new URL('../index.html', import.meta.url).href, {waitUntil:'load'});
    await brokenPage.waitForFunction(() => window.__FORMA_BOOT__?.state === 'failed', null, {timeout:5000});
    const message = await brokenPage.locator('#error-message').textContent();
    assert(await brokenPage.locator('#loading').isHidden(), `${failure} left an infinite spinner`);
    assert(await brokenPage.locator('#error').isVisible(), `${failure} did not show recovery`);
    assert.match(message, /forma-boot-/);
    report.failureChecks.push({failure, loadingHidden:true, recoveryVisible:true, message});
    await brokenPage.close();
  }
  report.passed = report.bootState === 'ready' && report.loadingHidden && errors.length === 0 && remoteRequests.length === 0;
  assert(report.passed, 'Offline Chrome acceptance failed');
} catch (error) {
  report.passed = false;
  report.failure = error.message;
  throw error;
} finally {
  await writeFile(resolve(output, 'offline-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}
