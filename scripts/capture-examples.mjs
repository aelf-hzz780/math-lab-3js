import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {catalog} from '../src/catalog.js';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const outputRoot = process.env.EXAMPLES_OUTPUT_ROOT ? resolve(process.env.EXAMPLES_OUTPUT_ROOT) : root;
const destination = resolve(outputRoot, 'docs/screenshots');
const repository = 'https://github.com/aelf-hzz780/math-lab-3js';
const rawRoot = 'https://raw.githubusercontent.com/aelf-hzz780/math-lab-3js/main';
const dimensions = {width:1280, height:800};
const descriptions = {
  navier:{en:'Navier–Stokes vortex concentration', zh:'青绿与琥珀色流管组成细长涡旋，示意收缩、旋转与轴向拉伸。', visualEn:'Teal and amber stream tubes form a spindle that illustrates contraction, rotation, and axial stretching.'},
  vortex:{en:'Finite-core Burgers vortex', zh:'发光的螺旋流线环绕有限涡核，粒子展示径向收缩与轴向运动。', visualEn:'Glowing helical streamlines wrap a finite vortex core while tracers show radial contraction and axial motion.'},
  quantum:{en:'Quantum entanglement probability surface', zh:'彩色概率曲面连接两端测量角度，展示双量子比特的联合概率。', visualEn:'A luminous probability surface maps two measurement angles to the joint outcome probability of two qubits.'},
  dunes:{en:'Wind-shaped sand dunes', zh:'暖色掠射光照亮起伏沙脊与程序化细沙纹。', visualEn:'Warm grazing light reveals rolling dune crests and fine procedural sand ripples.'},
  sparks:{en:'Sparks and analytic particle trails', zh:'金色火花形成喷泉，短拖尾描出重力与线性阻力下的运动。', visualEn:'A fountain of golden sparks leaves short trails governed by gravity and linear drag.'},
  ocean:{en:'Ocean waves, buoyancy, and wakes', zh:'程序化小船穿过深水波叠加形成的水面，身后可见近似尾流与泡沫。', visualEn:'A procedural boat crosses superposed deep-water waves, leaving an approximate wake and foam.'},
  kissing:{en:'604-point kissing configuration in 11 dimensions', zh:'三维投影中的蓝金色点云显示 604 点构型，细线标出选中点的真实高维接触。', visualEn:'A blue and gold 3D projection shows a 604-point configuration; lines mark the selected point’s actual high-dimensional contacts.'},
  kakeya:{en:'Finite-field Kakeya set', zh:'离散光点在模素数网格中排列，金色点突出一个方向的完整直线。', visualEn:'Discrete luminous points occupy a prime-modulus grid, with a complete line in one direction highlighted in gold.'},
  maxcut:{en:'AI-discovered MAX-4-CUT graph', zh:'四色节点与加权边构成空间网络，明亮边表示当前着色切过的边。', visualEn:'Four-colored nodes and weighted edges form a spatial graph; bright edges cross the current color partition.'},
  hat:{en:'Aperiodic Hat tiling', zh:'轻度挤出的青绿色 Hat 拼块形成有限铺砌，金色拼块标出合法镜像。', visualEn:'Slightly extruded teal Hat tiles form a finite patch, with valid reflected tiles highlighted in gold.'},
};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const bundleBytes = await readFile(resolve(root, 'dist/app.js'));
const bundleManifest = JSON.parse(await readFile(resolve(root, 'dist/manifest.json'), 'utf8'));
assert.equal(hash(bundleBytes), bundleManifest.sha256, 'Build manifest is stale; run npm run build');
await mkdir(destination, {recursive:true});

const browser = await chromium.launch({headless:true, channel:'chrome', args:['--enable-webgl', '--ignore-gpu-blocklist']});
const errors = [], remoteRequests = [];
const manifest = {
  schemaVersion:1,
  repository,
  title:{zh:'FORMA 数学实验室：十个可复现示例', en:'FORMA math lab: ten reproducible examples'},
  capturedAt:new Date().toISOString(),
  browser:await browser.version(),
  bundle:{path:'dist/app.js', sha256:bundleManifest.sha256, bytes:bundleBytes.length},
  capture:{viewport:dimensions, deviceScaleFactor:1, imageFormat:'jpeg', jpegQuality:82, layout:'full application, immersive mode', reducedMotion:'reduce', automaticCamera:false, seed:42, protocol:'file:', virtualClock:'Playwright clock paused at 2026-09-10T00:00:00Z; only explicitly requested virtual time is advanced', performanceMeasurement:false, pixelReproducibility:'GPU, browser version, and installed fonts can change pixels; model state and image hashes are recorded.'},
  examples:[],
};
async function ready(page, id) {
  // Poll from Node so waiting does not depend on the paused browser clock.
  for (let attempt=0; attempt<300; attempt++) {
    const state = await page.evaluate(() => window.__FORMA__?.diagnostics);
    if (state?.error) throw new Error(`${id}: ${JSON.stringify(state.error)}`);
    if (state?.id === id && state.ready) return;
    await delay(50);
  }
  throw new Error(`${id}: initialization timeout`);
}
try {
  for (let index=0; index<catalog.length; index++) {
    const {id, title, type} = catalog[index];
    const {definition} = await import(`../src/experiments/${id}.js`);
    const page = await browser.newPage({viewport:dimensions, deviceScaleFactor:1, reducedMotion:'reduce'});
    page.on('pageerror', error => errors.push({id, message:error.message}));
    page.on('console', message => { if (message.type() === 'error') errors.push({id, message:message.text()}); });
    page.on('request', request => { if (/^https?:/.test(request.url())) remoteRequests.push(request.url()); });
    const captureEpoch = new Date('2026-09-10T00:00:00Z');
    await page.clock.install({time:captureEpoch});
    await page.clock.pauseAt(captureEpoch);
    await page.goto(`${new URL('../index.html', import.meta.url).href}#${id}`, {waitUntil:'load'});
    await ready(page, id);
    await page.clock.runFor(32);
    const runMilliseconds = id === 'ocean' ? 2000 : 0;
    if (runMilliseconds) {
      await page.locator('#play-button').evaluate(button => button.click());
      await page.clock.runFor(runMilliseconds);
      await page.locator('#play-button').evaluate(button => button.click());
    }
    await page.clock.runFor(32);
    const state = await page.evaluate(() => window.__FORMA__.diagnostics);
    assert.equal(state.error, null);
    assert.equal(state.paused, true);
    assert.equal(state.cameraMotion, false);
    assert.equal(state.seed, 42);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const filename = `${String(index+1).padStart(2, '0')}-${id}.jpg`;
    const screenshotPath = `docs/screenshots/${filename}`;
    const bytes = await page.screenshot({path:resolve(destination, filename), type:'jpeg', quality:82, fullPage:false, animations:'disabled'});
    const defaultParameters = Object.fromEntries(definition.parameters.map(parameter => [parameter.key, parameter.value]));
    assert.deepEqual(state.params, defaultParameters);
    manifest.examples.push({
      id,
      name:{zh:title, en:descriptions[id].en},
      description:{zh:descriptions[id].zh, en:descriptions[id].visualEn},
      modelType:type,
      route:`index.html#${id}`,
      screenshot:{path:screenshotPath, rawUrl:`${rawRoot}/${screenshotPath}`, ...dimensions, bytes:bytes.length, sha256:hash(bytes)},
      source:{scene:`src/experiments/${id}.js`, math:`src/math/${id}.js`, sceneUrl:`${repository}/blob/main/src/experiments/${id}.js`, mathUrl:`${repository}/blob/main/src/math/${id}.js`},
      defaults:defaultParameters,
      capturedState:{params:state.params, seed:state.seed, camera:state.camera, simulationTimeSeconds:state.time, requestedRunningMilliseconds:runMilliseconds, paused:state.paused, automaticCamera:state.cameraMotion, quality:state.quality, immersive:state.immersive, metrics:state.metrics},
      formula:definition.formula,
      modelLimits:definition.limitations,
      sources:definition.sources,
      bundleSha256:bundleManifest.sha256,
    });
    console.log(`${id}: ${bytes.length} bytes, t=${state.time.toFixed(6)} s, ${state.quality}`);
    await page.close();
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(remoteRequests, []);
  manifest.totalImageBytes = manifest.examples.reduce((total, example) => total + example.screenshot.bytes, 0);
  assert(manifest.totalImageBytes < 2 * 1024 * 1024, 'Screenshot set exceeds the 2 MiB budget');
  manifest.validation = {allScenesReady:true, parameterDefaultsMatched:true, runtimeErrors:errors, remoteRequests, imageBudgetBytes:2*1024*1024};
  await writeFile(resolve(destination, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  const lines = [
    '# FORMA · 十个真实示例 / Ten real examples',
    '',
    '以下图片直接截取自本仓库的 Three.js 应用，包含实际界面与渲染结果。每张为 1280 × 800 的 JPEG；共用 seed 42、默认参数、高画质和固定镜头。它们不是原始上传照片，也不是生成式效果图。',
    '',
    'These images are actual screenshots of this repository’s Three.js application, including the interface and rendered scenes. Every JPEG is 1280 × 800, using seed 42, default parameters, high quality, and a fixed camera. They are neither uploaded reference photographs nor generated mockups.',
    '',
    '[机器可读索引 / Machine-readable index](screenshots/manifest.json) 提供每个示例的双语名称、参数、模型边界、研究来源、源码路径、原始图片 URL 与 SHA-256。相同 seed 与参数可复现模型状态；不同 GPU、浏览器和字体可能产生像素差异。',
    '',
    'The machine-readable index includes bilingual names, parameters, model limits, research sources, source paths, raw image URLs, and SHA-256 hashes. The same seed and parameters reproduce model state; GPU, browser, and font differences can affect pixels.',
    '',
    '截图使用虚拟时钟，画面中的 FPS 不作为性能测量；性能条件见 QA_REPORT.md。',
    '',
    'Captures use a virtual clock; the displayed FPS is not a performance measurement. See QA_REPORT.md for measured conditions.',
    '',
    '## 重新生成 / Regenerate',
    '',
    '先安装构建依赖与 Playwright，再安装或使用本机 Google Chrome。截图脚本不连接模型 API，也不需要运行本地服务器。已有 Playwright 时，可通过 `PLAYWRIGHT_MODULE` 指向其模块入口。',
    '',
    'Install the build dependencies and Playwright, then install or use a local Google Chrome. The capture script requires no model API or local server. If Playwright is already available elsewhere, set `PLAYWRIGHT_MODULE` to its module entry point.',
    '',
    '```sh',
    'npm ci',
    'npm install --no-save --package-lock=false playwright@1.62.1',
    'npx playwright install chrome',
    'npm run build',
    'node scripts/capture-examples.mjs',
    '```',
    '',
    '脚本开启低动态偏好，暂停自动镜头与模拟；海水单独推进 2,000 ms 的浏览器虚拟时间后暂停，以呈现航行尾流。实际模拟时间与相机坐标逐图记录在索引中。其他九项取时间 0；火花在时间 0 已按模型说明预热粒子池。',
    '',
    'The script enables reduced motion and pauses both the camera and simulation. Only the ocean advances by 2,000 ms of browser virtual time before pausing to reveal its wake. The index records the actual simulation time and camera coordinates for each image. The other nine scenes use time 0; the particle model prewarms its pool as described in the app.',
    '',
  ];
  for (let index=0; index<manifest.examples.length; index++) {
    const example = manifest.examples[index];
    lines.push(
      `## ${String(index+1).padStart(2, '0')} · ${example.name.zh} / ${example.name.en}`,
      '',
      `![${example.name.zh} / ${example.name.en}](screenshots/${example.screenshot.path.split('/').at(-1)})`,
      '',
      example.description.zh,
      '',
      example.description.en,
      '',
      `模型边界：${example.modelLimits}`,
      '',
      '打开 / Open: `' + example.route + '` · t = ' + example.capturedState.simulationTimeSeconds.toFixed(3) + ' s · seed = ' + example.capturedState.seed + '.',
      '',
      `[场景 / Scene](../${example.source.scene}) · [数学 / Math](../${example.source.math}) · [原始图片 / Raw JPEG](${example.screenshot.rawUrl})`,
      '',
      ...example.sources.map(source => `- [${source.label}](${source.url})`),
      '',
    );
  }
  lines.push(`图像总大小 / Total image size: ${(manifest.totalImageBytes / 1024).toFixed(0)} KiB. Bundle SHA-256: \`${manifest.bundle.sha256}\`.`, '');
  await writeFile(resolve(outputRoot, 'docs/EXAMPLES.md'), lines.join('\n'));
  console.log(`Captured ${manifest.examples.length} scenes, ${(manifest.totalImageBytes / 1024).toFixed(0)} KiB total, with no runtime errors or remote requests.`);
} finally {
  await browser.close();
}
