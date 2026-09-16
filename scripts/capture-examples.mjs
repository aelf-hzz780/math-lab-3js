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
  'real-kakeya':{en:'Real-space three-dimensional Kakeya tubes',zh:'多方向的彩色细管在实数空间中交织，管径与重叠控制揭示体积和方向之间的关系。',visualEn:'Colored tubes in real three-dimensional space reveal direction, thickness, overlap, and sampled occupied volume.'},
  boltzmann:{en:'Hard spheres and collision histories',zh:'发光硬球在箱中碰撞，一旁的历史图记录粒子间的相遇，连接微观运动与统计描述。',visualEn:'Luminous hard spheres collide in a box while a history diagram records encounters and connects dynamics to statistics.'},
  'torus-knot':{en:'Torus knots and distortion',zh:'彩色管状结绕过环面，选定两点的短弧与弦展示路径绕行程度。',visualEn:'A colored tubular knot wraps a torus; the shorter arc and chord between selected points reveal detour distance.'},
  moduli:{en:'Complex tori and elliptic-curve moduli',zh:'复数参数控制晶格形状，基本域与特殊点对应三维环面的教学示意。',visualEn:'A complex parameter changes a lattice; a fundamental domain and special points accompany an illustrative torus.'},
  noperthedron:{en:'Noperthedron and Rupert projection test',zh:'青色与金色多面体呈现两个姿态，下方叠加正交投影，实时测试严格包含余量。',visualEn:'Teal and gold polyhedra show two poses; overlaid orthogonal silhouettes measure strict containment clearance.'},
  e8:{en:'E8 root system in eight dimensions',zh:'240 个根的三维投影呈现晶格对称，选中根的真实八维邻接关系被高亮。',visualEn:'A projection of 240 roots reveals E8 symmetry, highlighting genuine eight-dimensional neighbors of a selected root.'},
  matroid:{en:'Graphic matroid and Lorentzian basis polynomial',zh:'四面体图中的选边呈现独立集与生成树，权重改变基多项式的对数曲面；特征值柱展示 Lorentzian 符号。',visualEn:'Selected tetrahedral graph edges reveal independent sets and spanning trees; weights change a log-polynomial surface, while eigenvalue bars show its Lorentzian signature.'},
  'particle-paint':{en:'Living particle canvas',zh:'画框内的细密彩色笔触组成有纵深的流动构图，珊瑚、淡紫与雾蓝粒子在三种形态间连续迁移，可用鼠标或触控拨动。',visualEn:'Fine colored strokes form a deep, flowing composition inside a frame; coral, lavender and blue particles continuously morph between three forms and respond to mouse or touch.'},
  'liquid-glass':{en:'Liquid glass',zh:'透明液态形体在灰色云幕前融合、流动和回弹，曲面折射背景，边缘呈现柔和高光与克制的色散。',visualEn:'Transparent liquid forms merge, flow and spring back against gray procedural clouds, refracting the backdrop with soft highlights and restrained dispersion.'},
  'iridescent-terrain':{en:'Iridescent Strata',zh:'圆润的悬浮云屿与孔洞在暗色空间中层叠，雾蓝、淡紫和浅桃沿表面连续晕染；宽光源与分块密度场支持柔和的穿行体验。',visualEn:'Rounded floating forms and openings layer through a dark space, with mist blue, lavender and pale peach blending continuously across their surfaces; broad lighting and streamed density meshes create a soft flight experience.'},
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
  title:{zh:`FORMA 数学实验室：${catalog.length} 个可复现示例`, en:`FORMA math lab: ${catalog.length} reproducible examples`},
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
    const runMilliseconds = ['ocean','boltzmann'].includes(id) ? 2000 : 0;
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
      capturedState:{params:state.params, seed:state.seed, camera:state.camera, simulationTimeSeconds:state.time, ...(id==='boltzmann'?{initialGasWarmupSeconds:2.4}:{}), requestedRunningMilliseconds:runMilliseconds, paused:state.paused, automaticCamera:state.cameraMotion, quality:state.quality, immersive:state.immersive, metrics:state.metrics},
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
  assert(manifest.totalImageBytes < 3 * 1024 * 1024, 'Screenshot set exceeds the 3 MiB budget');
  manifest.validation = {allScenesReady:true, parameterDefaultsMatched:true, runtimeErrors:errors, remoteRequests, imageBudgetBytes:3*1024*1024};
  await writeFile(resolve(destination, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  const lines = [
    `# FORMA · ${catalog.length} 个真实示例 / ${catalog.length} real examples`,
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
    '脚本开启低动态偏好，暂停自动镜头与模拟；海水与硬球碰撞单独推进 2,000 ms 的浏览器虚拟时间后暂停，以呈现尾流和碰撞历史。界面模拟时间与相机坐标逐图记录在索引中。硬球初态另含固定的 2.4 模型秒预演，记录为 initialGasWarmupSeconds；其余场景取界面时间 0，火花预热按模型说明进行。',
    '',
    'The script enables reduced motion and pauses camera and simulation. Ocean and hard spheres advance by 2,000 ms of browser virtual time before pausing. The index records UI simulation time and camera coordinates. Gas initialization also includes a fixed 2.4-model-second warmup, recorded as initialGasWarmupSeconds. Other scenes use UI time 0; sparks are prewarmed as described in the app.',
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
